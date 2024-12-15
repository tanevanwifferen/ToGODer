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
      console.log('moderationResult', moderationResult);
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
    try {
      var isFlagged = await this.getModeration(userAndAgentPrompts);
      if (isFlagged) {
        return ErrorJsonCompletion(this.model);
      }
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
      return await this.openAI.beta.chat.completions.parse(request);
    } catch (error) {
      console.error('Error:', error);
      throw new Error('Failed to get JSON response from OpenAI API');
    }
  }
}
