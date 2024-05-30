import { ConversationApi } from './Api/ConversationApi';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { PromptList } from './LLM/prompts/promptlist';

const app = express();
const port = process.env.PORT || 3000;

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
