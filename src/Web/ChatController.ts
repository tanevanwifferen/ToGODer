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

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Handles chat requests
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               model:
 *                 type: string
 *               humanPrompt:
 *                 type: boolean
 *               keepGoing:
 *                 type: boolean
 *               outsideBox:
 *                 type: boolean
 *               communicationStyle:
 *                 type: string
 *               prompts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     content:
 *                       type: string
 *               assistant_name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chat response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 content:
 *                   type: string
 *                 signature:
 *                   type: string
 *       500:
 *         description: Something went wrong
 */
const chatHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
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
    let response =
      'Please create a free account or login to have longer conversations.';
    if (
      body.prompts.length <= 20 ||
      (req as ToGODerRequest).togoder_auth?.user !== null
    ) {
      const conversationApi = new ConversationApi(body.assistant_name);
      response = await conversationApi.getResponse(
        body,
        (req as ToGODerRequest).togoder_auth?.user
      );
    }
    const signature = crypto
      .createHmac('sha256', process.env.JWT_SECRET!)
      .update(body.prompts.map((x) => x.content).join(' '))
      .digest('base64');
    res.json({ content: response, signature: signature });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/experience:
 *   post:
 *     summary: Handles experience requests
 *     tags: [Experience]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assistant_name:
 *                 type: string
 *               language:
 *                 type: string
 *     responses:
 *       200:
 *         description: Experience response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 content:
 *                   type: string
 *       500:
 *         description: Something went wrong
 */
const experienceHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
};

/**
 * @swagger
 * /api/title:
 *   post:
 *     summary: Handles title requests
 *     tags: [Title]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               model:
 *                 type: string
 *     responses:
 *       200:
 *         description: Title response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 content:
 *                   type: string
 *       500:
 *         description: Something went wrong
 */
const titleHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const conversationApi = new ConversationApi('');
    const response = await conversationApi.getTitle(
      req.body.content,
      req.body.model ?? getDefaultModel(),
      (req as ToGODerRequest).togoder_auth?.user
    );
    res.json({ content: response });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/prompts:
 *   get:
 *     summary: Get list of prompts
 *     tags: [Prompts]
 *     responses:
 *       200:
 *         description: List of prompts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */
const getPromptsHandler = (req: Request, res: Response) => {
  res.send(PromptList);
};

/**
 * @swagger
 * /api/quote:
 *   get:
 *     summary: Get a random quote
 *     tags: [Quote]
 *     responses:
 *       200:
 *         description: Random quote
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 quote:
 *                   type: string
 */
const getQuoteHandler = (req: Request, res: Response) => {
  res.json({ quote: new ConversationApi('').getQuote() });
};

export function GetChatRouter(messageLimiter: RateLimitRequestHandler): Router {
  const chatRouter = Router();

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
    experienceHandler
  );

  chatRouter.post(
    '/api/title',
    messageLimiter,
    validateTitleMessage,
    setAuthUser,
    titleHandler
  );

  chatRouter.get('/api/prompts', getPromptsHandler);

  chatRouter.get('/api/quote', getQuoteHandler);

  return chatRouter;
}
