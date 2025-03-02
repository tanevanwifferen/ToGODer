import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import { AIWrapper } from './AIWrapper';
import { AIProvider } from './Model/AIProvider';
import { zodResponseFormat } from 'openai/helpers/zod';
import { ParsedChatCompletion } from 'openai/resources/beta/chat/completions.mjs';

export class OpenRouterWrapper implements AIWrapper {
  private apiKey: string;
  private url: string = 'https://openrouter.ai/api/v1';
  private openAI: OpenAI;

  constructor(private model: AIProvider = AIProvider.Claude3SonnetBeta) {
    let apiKey = process.env.OPENROUTER_API_KEY;
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
  ): Promise<OpenAI.ChatCompletion> {
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
    userAndAgentPrompts: ChatCompletionMessageParam[],
    structure?: any
  ): Promise<ParsedChatCompletion<any>> {
    // Prepare the request
    var request: any = {
      messages: [
        { role: 'system', content: systemPrompt },
        ...userAndAgentPrompts,
      ],
      model: this.model,
      response_format: { type: 'json_object' },
    };
    if (structure) {
      request.response_format = zodResponseFormat(structure, 'json_object');
    }

    // Implement retry logic for JSON parsing
    const maxRetries = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.openAI.beta.chat.completions.parse(request);
      } catch (error) {
        lastError = error;
        console.error(
          `JSON parse attempt ${attempt}/${maxRetries} failed:`,
          error
        );

        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          throw new Error(
            `Failed to get valid JSON response from OpenRouter API after ${maxRetries} attempts: ${lastError.message}`
          );
        }

        // Small delay before retrying
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // This should never be reached due to the throw in the loop, but TypeScript requires a return
    throw new Error('Failed to get JSON response from OpenRouter API');
  }
}
