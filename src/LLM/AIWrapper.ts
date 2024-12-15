import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import OpenAI from 'openai';
import { AIProvider } from './Model/AIProvider';
import { ParsedChatCompletion } from 'openai/resources/beta/chat/completions.mjs';

export interface AIWrapper {
  get Model(): AIProvider;

  getResponse(
    systemPrompt: string,
    userAndAgentPrompts: ChatCompletionMessageParam[]
  ): Promise<OpenAI.ChatCompletion>;

  getJSONResponse(
    systemPrompt: string,
    userAndAgentPrompts: ChatCompletionMessageParam[],
    structure?: any
  ): Promise<ParsedChatCompletion<any>>;
}
