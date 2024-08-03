import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import OpenAI from 'openai';
import ChatCompletion = OpenAI.ChatCompletion;
import { AIProvider } from './Model/AIProvider';

export interface AIWrapper {
  get Model(): AIProvider;

  getResponse(
    systemPrompt: string,
    userAndAgentPrompts: ChatCompletionMessageParam[]
  ): Promise<ChatCompletion>;
}
