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
import { AIProvider, getDefaultModel } from '../LLM/Model/AIProvider';
import { setAuthUser } from './Middleware/auth';
import { ToGODerRequest } from './Model/ToGODerRequest';
import { ChatService } from '../Services/ChatService';
import {
  MemoryService,
  MAX_MEMORY_FETCH_LOOPS,
} from '../Services/MemoryService';
import { SystemPromptGenerationService } from '../Services/SystemPromptGenerationService';
import { BillingApi } from '../Api/BillingApi';
import { SseStream } from './Utils/Sse';
import { StreamingChatService } from '../Services/StreamingChatService';

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
    if (body.libraryIntegrationEnabled == null) {
      body.libraryIntegrationEnabled = false;
    }

    const user = (req as ToGODerRequest).togoder_auth?.user ?? null;
    const chatService = new ChatService(body.assistant_name);
    const memoryService = new MemoryService(body.assistant_name);
    const totalMessages = Array.isArray(body.prompts) ? body.prompts.length : 0;
    const paywallMessage =
      'Insufficient balance. Please donate through KoFi with this email address to continue using the service.';

    const respondWithPaywall = () => {
      const signature = chatService.generateSignature([
        ...body.prompts,
        { content: paywallMessage, role: 'assistant' },
      ]);
      res.json({
        signature,
        content: paywallMessage,
        updateDate: null,
      });
    };

    if (totalMessages >= 10) {
      if (!user) {
        respondWithPaywall();
        return;
      }

      const billingApi = new BillingApi();
      const userBalance = await billingApi.GetBalance(user.email);
      if (userBalance.lessThanOrEqualTo(0)) {
        body.model = AIProvider.DeepSeekV3;
      }
      const balance = await billingApi.GetTotalBalance(user.email);
      if (balance.lessThanOrEqualTo(0)) {
        respondWithPaywall();
        return;
      }
    }

    var requestForMemory: { keys: string[] } = { keys: [] };
    if (
      !!body.memoryIndex &&
      body.memoryIndex.length > 0 &&
      user != null &&
      !body.memoryLoopLimitReached &&
      (body.memoryLoopCount ?? 0) < MAX_MEMORY_FETCH_LOOPS
    ) {
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

  // Streaming chat endpoint (SSE). Streams assistant output as chunks and ends with a signature + done.
  chatRouter.post(
    '/api/chat/stream',
    messageLimiter,
    validateChatCompletionMessageArray,
    setAuthUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const sse = new SseStream(res);

      try {
        // Normalize body to ChatRequest like the non-streaming endpoint
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
        if (!body.assistant_name) {
          body.assistant_name = getAssistantName();
        }
        if (body.libraryIntegrationEnabled == null) {
          body.libraryIntegrationEnabled = false;
        }

        const user = (req as ToGODerRequest).togoder_auth?.user ?? null;

        // Delegate the streaming logic to a service for maintainability
        const streamingService = new StreamingChatService(body.assistant_name);

        for await (const evt of streamingService.streamChat(body, user)) {
          switch (evt.type) {
            case 'chunk':
              sse.event('chunk', evt.data);
              sse.comment('keep-alive');
              break;
            case 'memory_request':
              sse.event('memory_request', evt.data);
              break;
            case 'signature':
              sse.event('signature', evt.data);
              break;
            case 'tool_call':
              sse.event('tool_call', evt.data);
              break;
            case 'error':
              sse.event('error', evt.data);
              break;
            case 'done':
              sse.event('done', null);
              sse.done();
              return;
          }
        }

        // Safety: Ensure stream is closed
        sse.event('done', null);
        sse.done();
      } catch (error: any) {
        // Stream error to client, then end
        // Do NOT call next(error) as headers are already sent via SSE
        try {
          if (!res.headersSent) {
            // If headers haven't been sent yet, we can still use SSE
            sse.event('error', { message: error?.message ?? 'Unknown error' });
            sse.event('done', null);
            sse.done();
          } else {
            // Headers already sent, just log the error
            console.error(
              'Error during SSE streaming (headers already sent):',
              error
            );
          }
        } catch (sseError) {
          // If SSE operations fail, just log
          console.error('Failed to send error via SSE:', sseError);
        }
        // Do NOT call next(error) - it would try to send another response
      }
    }
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
          res.status(401).json({
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
