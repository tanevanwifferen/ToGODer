import { Express, Request, Response, NextFunction } from 'express';
import {
  validateChatCompletionMessageArray,
  validateSingleChatCompletionMessage,
} from './Validators';
import { RateLimitRequestHandler } from 'express-rate-limit';
import { ConversationApi } from '../Api/ConversationApi';
import { PromptList } from '../LLM/prompts/promptlist';

export function ChatController(
  app: Express,
  messageLimiter: RateLimitRequestHandler
) {
  // Route handlers
  app.post(
    '/api/chat',
    messageLimiter,
    validateChatCompletionMessageArray,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const conversationApi = new ConversationApi();
        const response = await conversationApi.getResponse(req.body);
        res.json({ content: response });
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    '/api/title',
    messageLimiter,
    validateSingleChatCompletionMessage,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const conversationApi = new ConversationApi();
        const response = await conversationApi.getTitle(req.body);
        res.json({ content: response });
      } catch (error) {
        next(error);
      }
    }
  );

  app.get('/api/prompts', (req, res) => {
    res.send(PromptList);
  });
}
