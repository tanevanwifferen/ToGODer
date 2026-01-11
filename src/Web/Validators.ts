import { Request, Response, NextFunction } from 'express';
import { ChatCompletionMessageParam } from 'openai/resources/index';
import { AIProvider } from '../LLM/Model/AIProvider';

export const isValidChatCompletionMessageParam = (
  obj: any
): obj is ChatCompletionMessageParam => {
  if (typeof obj !== 'object' || obj === null || typeof obj.role !== 'string') {
    return false;
  }

  // Tool result messages: role='tool' with tool_call_id and content
  if (obj.role === 'tool') {
    return (
      typeof obj.tool_call_id === 'string' &&
      typeof obj.content === 'string'
    );
  }

  // Assistant messages: may have content string, or tool_calls array, or both
  if (obj.role === 'assistant') {
    const hasContent = typeof obj.content === 'string';
    const hasToolCalls = Array.isArray(obj.tool_calls);
    // Must have at least content or tool_calls
    return hasContent || hasToolCalls;
  }

  // User and system messages: require string content
  if (obj.role === 'user' || obj.role === 'system') {
    return typeof obj.content === 'string';
  }

  return false;
};

export const validateChatCompletionMessageArray = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const body: any = req.body;
  if (!Array.isArray(body) && !Array.isArray(body.prompts)) {
    return res
      .status(400)
      .send(
        'Invalid request body: Expected an array as root or as root.prompts.'
      );
  }

  var prompts: Array<ChatCompletionMessageParam> = Array.isArray(body)
    ? body
    : body.prompts;
  for (const item of prompts) {
    if (!isValidChatCompletionMessageParam(item)) {
      return res
        .status(400)
        .send(
          "Invalid request body: Each item must have 'role' as string. Valid roles: 'user', 'assistant', 'system' (with content), or 'tool' (with tool_call_id and content)."
        );
    }

    if (!Array.isArray(body)) {
      var model = body.model;
      if (model != null) {
        try {
          validateModel(model);
        } catch (err: any) {
          return res.status(400).send(err.message);
        }
      }
    }
  }

  next();
};

const validateModel = (model: string) => {
  if (Object.values(AIProvider).indexOf(model as AIProvider) === -1) {
    throw new Error(
      'Invalid "model" parameter. Expected one of: ' +
        Object.values(AIProvider).join(', ')
    );
  }
};

export const validateTitleMessage = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const body: ChatCompletionMessageParam[] = req.body.content;
  if (!req.body.content) {
    return res
      .status(400)
      .send(
        'Invalid request body: Expected an object with "content" as an array of ChatCompletionMessageParam objects.'
      );
  }
  if (!isValidChatCompletionMessageParam(body[0])) {
    return res
      .status(400)
      .send(
        "Invalid request body: Each item must have 'role' as string. Valid roles: 'user', 'assistant', 'system' (with content), or 'tool' (with tool_call_id and content)."
      );
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
        "Invalid request body: Expected exactly one valid message. Valid roles: 'user', 'assistant', 'system' (with content), or 'tool' (with tool_call_id and content)."
      );
  }
  next();
};
