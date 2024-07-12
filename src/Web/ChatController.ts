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
} from '../Models/ChatRequest';
import { ModelApi } from '../Api/ModelApi';
import { ExperienceSeedPrompt } from '../LLM/prompts/experienceprompts';
import jwt from 'jsonwebtoken';

export function GetChatRouter(messageLimiter: RateLimitRequestHandler): Router {
  const chatRouter = Router();
  // Route handlers
  chatRouter.post(
    '/api/chat',
    messageLimiter,
    validateChatCompletionMessageArray,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const conversationApi = new ConversationApi();
        let body: ChatRequest = req.body;
        if (!('humanPrompt' in req.body)) {
          body = {
            model: new ModelApi().GetDefaultModel(),
            humanPrompt: false,
            keepGoing: false,
            outsideBox: false,
            communcationStyle: ChatRequestCommunicationStyle.Default,
            prompts: req.body,
          };
        }
        const response = await conversationApi.getResponse(body);
        const signature = jwt.sign(
          body.prompts.map((x) => x.content).join(' '),
          process.env.JWT_SECRET!
        );
        res.json({ content: response });
      } catch (error) {
        next(error);
      }
    }
  );

  chatRouter.post(
    '/api/experience',
    messageLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const conversationApi = new ConversationApi();
        let body: ExperienceRequest = req.body;
        let startText = await conversationApi.TranslateText(
          ExperienceSeedPrompt,
          body.language
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
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const conversationApi = new ConversationApi();
        const response = await conversationApi.getTitle(
          req.body.model ?? new ModelApi().GetDefaultModel(),
          req.body.content
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
