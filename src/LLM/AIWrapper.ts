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

  /**
   * Native token streaming. Yields incremental content deltas as soon as the provider produces them.
   */
  streamResponse(
    systemPrompt: string,
    userAndAgentPrompts: ChatCompletionMessageParam[]
  ): AsyncGenerator<string, void, void>;

  /**
   * If supported by provider: returns token usage of the most recent streamed completion.
   * Implementations may return null when usage is unavailable in streaming mode.
   * Call resets the stored usage snapshot.
   */
  getAndResetLastUsage(): {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  } | null;

  getJSONResponse(
    systemPrompt: string,
    userAndAgentPrompts: ChatCompletionMessageParam[],
    structure?: any
  ): Promise<ParsedChatCompletion<any>>;
}
