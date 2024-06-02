import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { ConversationApi } from './Api/ConversationApi';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import { PromptList } from './LLM/prompts/promptlist';

const app = express();
const port = process.env.PORT || 3000;

// Trust the first proxy to allow the app to get the client's IP address
app.set('trust proxy', 1);

// Rate limiter to prevent abuse
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 6, // The first one is the initial request so we (4 + 1)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    console.log(`Rate limit exceeded for IP: ${req.ip}`);
    res
      .status(429)
      .send('Too many messages sent from this IP, please try again later.');
  },
  headers: true,
});

app.use(express.json());

// Serve static files from the "../Frontend" directory
app.use(express.static(path.join(__dirname, '../Frontend')));

const isValidChatCompletionMessageParam = (
  obj: any
): obj is ChatCompletionMessageParam => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.role === 'string' &&
    typeof obj.content === 'string' &&
    (obj.role === 'user' || obj.role === 'assistant' || obj.role === 'system')
  );
};

const validateChatCompletionMessageArray = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const body: any = req.body;
  if (!Array.isArray(body)) {
    return res.status(400).send('Invalid request body: Expected an array.');
  }

  for (const item of body) {
    if (!isValidChatCompletionMessageParam(item)) {
      return res
        .status(400)
        .send(
          "Invalid request body: Each item must have 'role' and 'content' as strings, with 'role' being 'user', 'assistant', or 'system'."
        );
    }
  }

  next();
};

const validateSingleChatCompletionMessage = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const body: any = req.body;
  if (
    !Array.isArray(body) ||
    body.length !== 1 ||
    !isValidChatCompletionMessageParam(body[0])
  ) {
    return res
      .status(400)
      .send(
        "Invalid request body: Expected exactly one item with 'role' and 'content' as strings, with 'role' being 'user', 'assistant', or 'system'."
      );
  }
  next();
};

// Route handlers
app.post(
  '/api/chat',
  messageLimiter,
  validateChatCompletionMessageArray,
  async (req, res, next) => {
    try {
      const conversationApi = new ConversationApi();
      const response = await conversationApi.getResponse(req.body);
      res.json({ content: response });
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  '/api/title',
  messageLimiter,
  validateSingleChatCompletionMessage,
  async (req, res, next) => {
    try {
      const conversationApi = new ConversationApi();
      const response = await conversationApi.getTitle(req.body);
      res.json({ content: response });
    } catch (error) {
      next(error);
    }
  }
);

app.get('/api/prompts', (req, res) => {
  res.send(PromptList);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend/index.html'));
});

// Centralized error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).send('Internal Server Error');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
