import { Request, Response, NextFunction, Router } from 'express';
import { RateLimitRequestHandler } from 'express-rate-limit';
import { setAuthUser } from './Middleware/auth';
import { ToGODerRequest } from './Model/ToGODerRequest';
import { MemoryService } from '../Services/MemoryService';
import { AIProvider } from '../LLM/Model/AIProvider';
import { ConversationApi } from '../Api/ConversationApi';
import {
  FetchMemoryKeysPromptForCompression,
  MemoryCompressionPrompt,
} from '../LLM/prompts/systemprompts';

function getAssistantName(): string {
  return process.env.ASSISTANT_NAME ?? 'ToGODer';
}

const fetchMemoryKeysHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as ToGODerRequest).togoder_auth?.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { shortTermMemory, existingKeys } = req.body;
    if (!shortTermMemory || !existingKeys) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const conversationApi = new ConversationApi(getAssistantName());
    let aiWrapper = conversationApi.getAIWrapper(AIProvider.Gpt4oMini, user);

    const messages = [
      {
        role: 'system' as const,
        content: `Short-term-memory: ${shortTermMemory}\n\nExisting Keys:\n${existingKeys.join('\n')}`,
      },
    ];

    var result: any = {};
    while (
      !('keys' in result) ||
      !Array.isArray(result.keys) ||
      result.keys.some((k: any) => typeof k !== 'string')
    ) {
      const response = await aiWrapper.getJSONResponse(
        FetchMemoryKeysPromptForCompression,
        messages
      );
      if (response.usage?.total_tokens == 0) {
        // break openai moderation unfortunately
        aiWrapper = conversationApi.getAIWrapper(
          AIProvider.CohereCommandR7B,
          user
        );
      }

      result = JSON.parse(response.choices[0].message.content!);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const compressMemoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as ToGODerRequest).togoder_auth?.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { longTermMemory, shortTermMemory } = req.body;
    if (!longTermMemory || !shortTermMemory) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const conversationApi = new ConversationApi(getAssistantName());
    const aiWrapper = conversationApi.getAIWrapper(AIProvider.Gpt4oMini, user);

    const messages = [
      {
        role: 'system' as const,
        content: JSON.stringify({
          longTermMemory,
          shortTermMemory,
        }),
      },
    ];

    const response = await aiWrapper.getJSONResponse(
      MemoryCompressionPrompt,
      messages
    );

    res.json(JSON.parse(response.choices[0].message.content!));
  } catch (error) {
    next(error);
  }
};

export function GetMemoryRouter(
  messageLimiter: RateLimitRequestHandler
): Router {
  const memoryRouter = Router();

  memoryRouter.post(
    '/api/memory/fetch-keys',
    messageLimiter,
    setAuthUser,
    fetchMemoryKeysHandler
  );

  memoryRouter.post(
    '/api/memory/compress',
    messageLimiter,
    setAuthUser,
    compressMemoryHandler
  );

  return memoryRouter;
}
