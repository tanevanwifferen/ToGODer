import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import { AIWrapper } from './AIWrapper';
import ChatCompletion = OpenAI.ChatCompletion;
import { AIProvider } from './Model/AIProvider';

export class TogetherWrapper implements AIWrapper {
  private apiKey: string;
  private url: string = 'https://api.together.xyz/v1';
  private openAI: OpenAI;

  constructor(private model: AIProvider = AIProvider.Claude3SonnetBeta) {
    let apiKey = process.env.TOGETHER_API_KEY;
    if (apiKey == null)
      throw new Error(
        'Open Router API key (process.env.OPENROUTER_API_KEY) is required'
      );
    this.apiKey = apiKey;

    this.openAI = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.url,
      defaultHeaders: {
        'HTTP-Referer': 'https://chat.togoder.click', // Optional, for including your app on openrouter.ai rankings.
        'X-Title': 'ToGODer', // Optional. Shows in rankings on openrouter.ai.
      },
    });
  }

  public get Model() {
    return this.model;
  }

  async getResponse(
    systemPrompt: string,
    userAndAgentPrompts: ChatCompletionMessageParam[]
  ): Promise<ChatCompletion> {
    try {
      return await this.openAI.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          ...userAndAgentPrompts,
        ],
        model: this.model,
      });
    } catch (error) {
      console.error('Error:', error);
      throw new Error('Failed to get response from OpenRouter API');
    }
  }

  async getJSONResponse(
    systemPrompt: string,
    userAndAgentPrompts: ChatCompletionMessageParam[]
  ): Promise<ChatCompletion> {
    try {
      return await this.openAI.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          ...userAndAgentPrompts,
        ],
        model: this.model,
        response_format: { type: 'json_object' },
      });
    } catch (error) {
      console.error('Error:', error);
      throw new Error('Failed to get JSON response from OpenRouter API');
    }
  }
}
