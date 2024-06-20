import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import { AIWrapper } from './AIWrapper';

export class OpenRouterWrapper implements AIWrapper {
  private apiKey: string;
  private url: string = 'https://openrouter.ai/api/v1';
  private openAI: OpenAI;

  constructor(private model: string = 'anthropic/claude-3.5-sonnet:beta') {
    let apiKey = process.env.OPENROUTER_API_KEY;
    if (apiKey == null)
      throw new Error(
        'Open Router API key (process.env.OPENROUTER_API_KEY) is required'
      );
    this.apiKey = apiKey;

    this.openAI = new OpenAI({ apiKey: this.apiKey, baseURL: this.url });
  }

  async getResponse(
    systemPrompt: string,
    userAndAgentPrompts: ChatCompletionMessageParam[]
  ): Promise<string> {
    try {
      const completion = await this.openAI.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          ...userAndAgentPrompts,
        ],
        model: this.model,
      });
      return completion.choices[0].message.content!;
    } catch (error) {
      console.error('Error:', error);
      throw new Error('Failed to get response from OpenRouter API');
    }
  }
}
