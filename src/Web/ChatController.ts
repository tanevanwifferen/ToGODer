import { Request, Response, NextFunction, Router } from 'express';
import {
  validateChatCompletionMessageArray,
  validateTitleMessage,
} from './Validators';
import { RateLimitRequestHandler } from 'express-rate-limit';
import { ConversationApi } from '../Api/ConversationApi';
import { PromptList } from '../LLM/prompts/promptlist';
import {
  ChatRequest,
  ChatRequestCommunicationStyle,
  ExperienceRequest,
} from '../Model/ChatRequest';
import { ExperienceSeedPrompt } from '../LLM/prompts/experienceprompts';
import jwt from 'jsonwebtoken';
import { getDefaultModel } from '../LLM/Model/AIProvider';
import { setAuthUser } from './Middleware/auth';
import { ToGODerRequest } from './Model/ToGODerRequest';

function getAssistantName(): string {
  return process.env.ASSISTANT_NAME ?? 'ToGODer';
}

export function GetChatRouter(messageLimiter: RateLimitRequestHandler): Router {
  const chatRouter = Router();
  // Route handlers
  chatRouter.post(
    '/api/chat',
    messageLimiter,
    validateChatCompletionMessageArray,
    setAuthUser,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const conversationApi = new ConversationApi();
        let body: ChatRequest = req.body;
        if (!('humanPrompt' in req.body)) {
          body = {
            model: getDefaultModel(),
            humanPrompt: false,
            keepGoing: false,
            outsideBox: false,
            communicationStyle: ChatRequestCommunicationStyle.Default,
            prompts: req.body,
            assistant_name: getAssistantName(),
          };
        }
        if (body.assistant_name == null || body.assistant_name == '') {
          body.assistant_name = getAssistantName();
        }
        const response = await conversationApi.getResponse(
          body,
          (req as ToGODerRequest).togoder_auth?.user
        );
        const signature = jwt.sign(
          body.prompts.map((x) => x.content).join(' '),
          process.env.JWT_SECRET!
        );
        res.json({ content: response, signature: signature });
      } catch (error) {
        next(error);
      }
    }
  );

  chatRouter.post(
    '/api/experience',
    messageLimiter,
    setAuthUser,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const conversationApi = new ConversationApi();
        let body: ExperienceRequest = req.body;
        let startText = await conversationApi.TranslateText(
          ExperienceSeedPrompt,
          body.language,
          getDefaultModel(),
          (req as ToGODerRequest).togoder_auth?.user
        );
        startText = '/experience ' + startText;
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
        const conversationApi = new ConversationApi();
        const response = await conversationApi.getTitle(
          req.body.content,
          req.body.model ?? getDefaultModel(),
          (req as ToGODerRequest).togoder_auth?.user
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
    res.json({ quote: new ConversationApi().getQuote() });
  });

  return chatRouter;
}
