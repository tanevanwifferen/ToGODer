import { Request, Response, NextFunction, Router } from 'express';
import { RateLimitRequestHandler } from 'express-rate-limit';
import { setAuthUser } from './Middleware/auth';
import { ToGODerRequest } from './Model/ToGODerRequest';
import { SyncService } from '../Services/SyncService';
import { z } from 'zod';

const pushSyncSchema = z.object({
  encryptedData: z.string(),
  version: z.number().optional(),
});

const reencryptSchema = z.object({
  encryptedData: z.string(),
  version: z.number(),
});

/**
 * Controller for handling encrypted user data sync operations.
 * Provides endpoints for fetching, pushing, and re-encrypting sync data.
 */
export function GetSyncRouter(messageLimiter: RateLimitRequestHandler): Router {
  const syncRouter = Router();
  const syncService = new SyncService();

  // GET /api/sync - Fetch encrypted blob + version
  syncRouter.get(
    '/api/sync',
    messageLimiter,
    setAuthUser,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = (req as ToGODerRequest).togoder_auth?.user;
        if (!user) {
          res.status(401).json({ error: 'Authentication required' });
          return;
        }

        const syncData = await syncService.getSyncData(user);
        if (!syncData) {
          res.status(404).json({ error: 'No sync data found' });
          return;
        }

        res.json({
          encryptedData: syncData.encryptedData,
          version: syncData.version,
          lastModified: syncData.lastModified,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/sync - Push encrypted blob with optimistic locking
  syncRouter.post(
    '/api/sync',
    messageLimiter,
    setAuthUser,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = (req as ToGODerRequest).togoder_auth?.user;
        if (!user) {
          res.status(401).json({ error: 'Authentication required' });
          return;
        }

        const body = pushSyncSchema.parse(req.body);

        try {
          const syncData = await syncService.pushSyncData(
            user,
            body.encryptedData,
            body.version
          );

          res.json({
            success: true,
            version: syncData.version,
            lastModified: syncData.lastModified,
          });
        } catch (error) {
          if (error instanceof Error && error.message === 'VERSION_CONFLICT') {
            const serverData = (error as any).serverData;
            res.status(409).json({
              error: 'Version conflict',
              serverData: {
                encryptedData: serverData.encryptedData,
                version: serverData.version,
                lastModified: serverData.lastModified,
              },
            });
            return;
          }
          throw error;
        }
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

  // POST /api/sync/reencrypt - Re-encryption for password change
  syncRouter.post(
    '/api/sync/reencrypt',
    messageLimiter,
    setAuthUser,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = (req as ToGODerRequest).togoder_auth?.user;
        if (!user) {
          res.status(401).json({ error: 'Authentication required' });
          return;
        }

        const body = reencryptSchema.parse(req.body);

        try {
          const syncData = await syncService.reencrypt(
            user,
            body.encryptedData,
            body.version
          );

          res.json({
            success: true,
            version: syncData.version,
            lastModified: syncData.lastModified,
          });
        } catch (error) {
          if (error instanceof Error) {
            if (error.message === 'VERSION_CONFLICT') {
              const serverData = (error as any).serverData;
              res.status(409).json({
                error: 'Version conflict',
                serverData: {
                  encryptedData: serverData.encryptedData,
                  version: serverData.version,
                  lastModified: serverData.lastModified,
                },
              });
              return;
            }
            if (error.message === 'NO_DATA') {
              res
                .status(404)
                .json({ error: 'No sync data found to reencrypt' });
              return;
            }
          }
          throw error;
        }
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

  return syncRouter;
}
