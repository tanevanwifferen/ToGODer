import OpenAI from 'openai';
import { ParsedChatCompletion } from 'openai/resources/chat/completions';

export function ErrorJsonCompletion(model: string): ParsedChatCompletion<any> {
  return {
    id: 'empty',
    created: new Date().getTime(),
    object: 'chat.completion',
    model: model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content:
            'OpenAI has flagged this conversation as potentially harmful. If available, it is recommended to change the model and try again.',
          refusal: 'flagged',
          parsed: null,
          tool_calls: [],
        },
        finish_reason: 'stop',
        logprobs: null,
      },
    ],
    usage: {
      completion_tokens: 0,
      prompt_tokens: 0,
      total_tokens: 0,
    },
  };
}

export function ErrorCompletion(model: string): OpenAI.ChatCompletion {
  return {
    id: 'empty',
    created: new Date().getTime(),
    object: 'chat.completion',
    model: model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content:
            'OpenAI has flagged this conversation as potentially harmful. If available, it is recommended to change the model and try again.',
          refusal: 'flagged',
        },
        finish_reason: 'stop',
        logprobs: null,
      },
    ],
    usage: {
      completion_tokens: 0,
      prompt_tokens: 0,
      total_tokens: 0,
    },
  };
}
