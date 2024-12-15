import { Request, Response, NextFunction, Router } from 'express';
import {
  validateChatCompletionMessageArray,
  validateTitleMessage,
} from './Validators';
import { RateLimitRequestHandler } from 'express-rate-limit';
import { PromptList } from '../LLM/prompts/promptlist';
import {
  ChatRequest,
  ChatRequestCommunicationStyle,
  ExperienceRequest,
} from '../Model/ChatRequest';
import { getDefaultModel } from '../LLM/Model/AIProvider';
import { setAuthUser } from './Middleware/auth';
import { ToGODerRequest } from './Model/ToGODerRequest';
import { ChatService } from '../Services/ChatService';
import { MemoryService } from '../Services/MemoryService';

function getAssistantName(): string {
  return process.env.ASSISTANT_NAME ?? 'ToGODer';
}

const chatHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let body: ChatRequest = req.body;
    if (!('prompts' in req.body)) {
      body = {
        model: getDefaultModel(),
        humanPrompt: false,
        keepGoing: false,
        outsideBox: false,
        communicationStyle: ChatRequestCommunicationStyle.Default,
        prompts: req.body,
        memories: {},
        memoryIndex: [],
        assistant_name: getAssistantName(),
      };
    }
    if (body.assistant_name == null || body.assistant_name == '') {
      body.assistant_name = getAssistantName();
    }

    const memoryService = new MemoryService(body.assistant_name);
    const chatService = new ChatService(body.assistant_name);

    const user = (req as ToGODerRequest).togoder_auth?.user ?? null;

    var requestForMemory: { keys: string[] } = { keys: [] };
    if (!!body.memoryIndex && body.memoryIndex.length > 0 && user != null) {
      requestForMemory = await memoryService.requestMemories(body, user);
    }

    if (requestForMemory.keys.length > 0) {
      res.json({
        requestForMemory,
        updateData: null,
      });
      return;
    }

    const [response, updateData] = await Promise.all([
      chatService.getChatResponse(body, user),
      body.configurableData && body.prompts.length > 0
        ? memoryService.getPersonalDataUpdates(
            body.prompts,
            body.configurableData,
            body.staticData?.date ?? new Date().toISOString(),
            body.model,
            user
          )
        : Promise.resolve(null),
    ]);

    const signature = chatService.generateSignature(body.prompts);

    var result = {
      content: response,
      signature: signature,
      updateData: updateData,
    };

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export function GetChatRouter(messageLimiter: RateLimitRequestHandler): Router {
  const chatRouter = Router();
  // Route handlers
  chatRouter.post(
    '/api/chat',
    messageLimiter,
    validateChatCompletionMessageArray,
    setAuthUser,
    chatHandler
  );

  chatRouter.post(
    '/api/experience',
    messageLimiter,
    setAuthUser,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        let body: ExperienceRequest = req.body;
        if (body.assistant_name == null || body.assistant_name == '') {
          body.assistant_name = getAssistantName();
        }

        const chatService = new ChatService(body.assistant_name);
        const user = (req as ToGODerRequest).togoder_auth?.user ?? null;
        const startText = await chatService.getExperienceText(body, user);

        res.json({ content: startText });
      } catch (error) {
        next(error);
      }
    }
  );

  chatRouter.post(
    '/api/title',
    messageLimiter,
    validateTitleMessage,
    setAuthUser,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const chatService = new ChatService('');
        const user = (req as ToGODerRequest).togoder_auth?.user ?? null;
        const response = await chatService.getTitle(
          req.body.content,
          getDefaultModel(),
          user
        );
        res.json({ content: response });
      } catch (error) {
        next(error);
      }
    }
  );

  chatRouter.get('/api/prompts', (req, res) => {
    res.send(PromptList);
  });

  chatRouter.get('/api/quote', (req, res) => {
    const chatService = new ChatService('');
    res.json({ quote: chatService.getQuote() });
  });

  return chatRouter;
}
