import { Request, Response, NextFunction, Router } from 'express';
import { RateLimitRequestHandler } from 'express-rate-limit';
import { setAuthUser } from './Middleware/auth';
import { ToGODerRequest } from './Model/ToGODerRequest';
import { ShareService } from '../Services/ShareService';
import { z } from 'zod';
import { ChatCompletionMessageParam } from 'openai/resources/index';

// Validation schemas
const shareRequestSchema = z.object({
  messages: z.array(
    z.object({
      message: z.object({
        role: z.string(),
        content: z.string(),
      }) as unknown as z.ZodType<ChatCompletionMessageParam>,
      signature: z.string(),
    })
  ),
  title: z.string(),
  description: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
});

const paginationSchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('50'),
});

/**
 * Controller for handling shared chat operations.
 * Provides endpoints for sharing chats, listing shared chats, and retrieving specific shared chats.
 */
export function GetShareRouter(
  messageLimiter: RateLimitRequestHandler
): Router {
  const shareRouter = Router();
  const shareService = new ShareService();

  // Share a chat
  shareRouter.post(
    '/api/share',
    messageLimiter,
    setAuthUser,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = (req as ToGODerRequest).togoder_auth?.user;
        if (!user) {
          res.status(401).json({ error: 'Authentication required' });
          return;
        }

        const body = shareRequestSchema.parse(req.body);
        const sharedChat = await shareService.createSharedChat(
          body.messages,
          body.title,
          body.description,
          user,
          body.visibility
        );

        res.json(sharedChat);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res
            .status(400)
            .json({ error: 'Invalid request data', details: error.errors });
          return;
        }
        next(error);
      }
    }
  );

  // List shared chats with pagination
  shareRouter.get(
    '/api/share',
    messageLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { page, limit } = paginationSchema.parse(req.query);
        const result = await shareService.listSharedChats(page, limit);
        res.json(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Invalid pagination parameters' });
          return;
        }
        next(error);
      }
    }
  );

  // Get a specific shared chat
  shareRouter.get(
    '/api/share/:id',
    messageLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const chat = await shareService.getSharedChat(req.params.id);
        if (!chat) {
          res.status(404).json({ error: 'Shared chat not found' });
          return;
        }
        res.json(chat);
      } catch (error) {
        next(error);
      }
    }
  );

  // Delete a shared chat (only by owner)
  shareRouter.delete(
    '/api/share/:id',
    messageLimiter,
    setAuthUser,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = (req as ToGODerRequest).togoder_auth?.user;
        if (!user) {
          res.status(401).json({ error: 'Authentication required' });
          return;
        }

        try {
          const success = await shareService.deleteSharedChat(
            req.params.id,
            user
          );
          if (!success) {
            res.status(404).json({ error: 'Shared chat not found' });
            return;
          }
          res.status(200).json({ message: 'Shared chat deleted successfully' });
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === 'Only the original sharer can delete this chat'
          ) {
            res.status(403).json({ error: error.message });
            return;
          }
          throw error;
        }
      } catch (error) {
        next(error);
      }
    }
  );

  return shareRouter;
}
