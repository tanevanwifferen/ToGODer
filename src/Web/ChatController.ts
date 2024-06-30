import { Express, Request, Response, NextFunction } from 'express';
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
import { AIProvider } from '../Models/AIProvider';
import { ModelApi } from '../Api/ModelApi';
import { ExperienceSeedPrompt } from '../LLM/prompts/experienceprompts';
import { start } from 'repl';

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
        let body: ChatRequest = req.body;
        if (!('humanPrompt' in req.body)) {
          body = {
            model: new ModelApi().GetDefaultModel(),
            humanPrompt: false,
            keepGoing: false,
            communcationStyle: ChatRequestCommunicationStyle.Default,
            prompts: req.body,
          };
        }
        const response = await conversationApi.getResponse(body);
        res.json({ content: response });
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
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

  app.post(
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

  app.get('/api/prompts', (req, res) => {
    res.send(PromptList);
  });

  app.get('/api/quote', (req, res) => {
    res.json({ quote: new ConversationApi().getQuote() });
  });
}
