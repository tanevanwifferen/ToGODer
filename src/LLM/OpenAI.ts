import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import { AIWrapper } from './AIWrapper';
import { AIProvider } from './Model/AIProvider';
import { ErrorJsonCompletion, ErrorCompletion } from './Errors';
import { ParsedChatCompletion } from 'openai/resources/beta/chat/completions.mjs';

export class OpenAIWrapper implements AIWrapper {
  private apiKey: string;
  private openAI: OpenAI;

  constructor(private model: AIProvider) {
    let apiKey = process.env.OPENAI_API_KEY;
    if (apiKey == null) throw new Error('OpenAI API key is required');
    this.apiKey = apiKey;
    this.openAI = new OpenAI({ apiKey: this.apiKey });
  }

  public get Model(): AIProvider {
    return this.model;
  }

  private async getModeration(
    userAndAgentPrompts: ChatCompletionMessageParam[]
  ): Promise<boolean> {
    try {
      var count = userAndAgentPrompts.length;
      var itemsToSend = userAndAgentPrompts.map((x) => x.content as string);
      if (count > 2) {
        itemsToSend = itemsToSend.slice(count - 2, count);
      }
      const moderationResult = await this.openAI.moderations.create({
        input: itemsToSend,
        model: 'text-moderation-stable',
      });
      // Check if any of the messages are flagged
      return moderationResult.results
        .map((x) => x.flagged)
        .reduce((a, b) => a || b);
    } catch (e) {
      return true;
    }
  }

  async getResponse(
    systemPrompt: string,
    userAndAgentPrompts: ChatCompletionMessageParam[]
  ): Promise<OpenAI.ChatCompletion> {
    try {
      var isFlagged = await this.getModeration(userAndAgentPrompts);
      if (isFlagged) {
        return ErrorCompletion(this.model);
      }
      return await this.openAI.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          ...userAndAgentPrompts,
        ],
        model: this.model,
      });
    } catch (error) {
      console.error('Error:', error);
      throw new Error('Failed to get response from OpenAI API');
    }
  }

  async getJSONResponse(
    systemPrompt: string,
    userAndAgentPrompts: ChatCompletionMessageParam[],
    structure?: any
  ): Promise<ParsedChatCompletion<any>> {
    // Check for moderation flags first
    var isFlagged = await this.getModeration(userAndAgentPrompts);
    if (isFlagged) {
      return ErrorJsonCompletion(this.model);
    }

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
      request.response_format.structure = structure;
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
            `Failed to get valid JSON response from OpenAI API after ${maxRetries} attempts: ${lastError.message}`
          );
        }

        // Small delay before retrying
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // This should never be reached due to the throw in the loop, but TypeScript requires a return
    throw new Error('Failed to get JSON response from OpenAI API');
  }
}
