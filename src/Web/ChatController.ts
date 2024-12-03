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
import crypto from 'crypto';

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
        assistant_name: getAssistantName(),
      };
    }
    if (body.assistant_name == null || body.assistant_name == '') {
      body.assistant_name = getAssistantName();
    }

    let response =
      'Please create a free account or login to have longer conversations.';
    let updateData = null;

    if (
      body.prompts.length <= 20 ||
      (req as ToGODerRequest).togoder_auth?.user !== null
    ) {
      const conversationApi = new ConversationApi(body.assistant_name);

      // Get personal data updates if data was provided
      if (body.configurableData && body.prompts.length > 0) {
        updateData = JSON.parse(
          await conversationApi.getPersonalDataUpdates(
            body.prompts,
            body.configurableData,
            body.model,
            (req as ToGODerRequest).togoder_auth?.user
          )
        );
      }

      body.configurableData = updateData;

      response = await conversationApi.getResponse(
        body,
        (req as ToGODerRequest).togoder_auth?.user
      );
    }
    const signature = crypto
      .createHmac('sha256', process.env.JWT_SECRET!)
      .update(body.prompts.map((x) => x.content).join(' '))
      .digest('base64');
    res.json({ content: response, signature: signature, updateData });
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

        const conversationApi = new ConversationApi(body.assistant_name);
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
        const conversationApi = new ConversationApi('');
        const response = await conversationApi.getTitle(
          req.body.content,
          getDefaultModel(),
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
    res.json({ quote: new ConversationApi('').getQuote() });
  });

  return chatRouter;
}
