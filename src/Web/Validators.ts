import { Request, Response, NextFunction } from 'express';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

export const isValidChatCompletionMessageParam = (
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

export const validateChatCompletionMessageArray = (
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

export const validateSingleChatCompletionMessage = (
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
