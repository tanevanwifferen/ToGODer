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
import { SystemPromptGenerationService } from '../Services/SystemPromptGenerationService';

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
        holisticTherapist: false,
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

    const response = await chatService.getChatResponse(body, user);
    const signature = chatService.generateSignature([
      ...body.prompts,
      { content: response, role: 'assistant' },
    ]);

    res.json({
      content: response,
      signature: signature,
      updateData: null,
    });
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
    let toreturn = {};
    for (let key of Object.keys(PromptList)) {
      if (PromptList[key].display) {
        Object.defineProperty(toreturn, key, {
          value: PromptList[key],
          enumerable: true,
        });
      }
    }
    res.send(toreturn);
  });

  chatRouter.get('/api/quote', (req, res) => {
    const chatService = new ChatService('');
    res.json({ quote: chatService.getQuote() });
  });

  // Endpoint for asynchronous memory updates
  chatRouter.post(
    '/api/chat/memory-update',
    messageLimiter,
    setAuthUser,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        let body: ChatRequest = req.body;
        if (body.assistant_name == null || body.assistant_name == '') {
          body.assistant_name = getAssistantName();
        }

        const memoryService = new MemoryService(body.assistant_name);
        const user = (req as ToGODerRequest).togoder_auth?.user ?? null;

        if (body.prompts.length > 0) {
          const updateData = await memoryService.getPersonalDataUpdates(
            body.prompts,
            body.configurableData,
            body.staticData?.date ?? new Date().toISOString(),
            body.model,
            user
          );

          res.json({ updateData });
        } else {
          res.json({ updateData: null });
        }
      } catch (error) {
        next(error);
      }
    }
  );

  // Endpoint for auto-generating personalized system prompts
  chatRouter.post(
    '/api/generate-system-prompt',
    messageLimiter,
    setAuthUser,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = (req as ToGODerRequest).togoder_auth?.user;

        if (!user) {
          res
            .status(401)
            .json({
              error: 'Authentication required for system prompt generation',
            });
          return;
        }

        let body: ChatRequest = req.body;
        if (body.assistant_name == null || body.assistant_name == '') {
          body.assistant_name = getAssistantName();
        }

        // Set default values if not provided
        if (!body.model) {
          body.model = getDefaultModel();
        }
        if (!body.memoryIndex) {
          body.memoryIndex = [];
        }
        if (!body.memories) {
          body.memories = {};
        }

        const systemPromptService = new SystemPromptGenerationService(
          body.assistant_name
        );

        const result =
          await systemPromptService.generatePersonalizedSystemPrompt(
            body,
            user
          );

        if (result.requestForMemory) {
          res.json({
            requestForMemory: result.requestForMemory,
            systemPrompt: null,
          });
        } else {
          res.json({
            systemPrompt: result.systemPrompt,
            requestForMemory: null,
            assistant_name: body.assistant_name,
          });
        }
      } catch (error) {
        next(error);
      }
    }
  );

  return chatRouter;
}
