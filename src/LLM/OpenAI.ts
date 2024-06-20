import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import { AIWrapper } from './AIWrapper';

export class OpenAIWrapper implements AIWrapper {
  private apiKey: string;
  private model = process.env.OPENAI_MODEL || 'gpt-4o';
  private openAI: OpenAI;

  constructor() {
    let apiKey = process.env.OPENAI_API_KEY;
    if (apiKey == null) throw new Error('OpenAI API key is required');
    this.apiKey = apiKey;
    this.openAI = new OpenAI({ apiKey: this.apiKey });
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
  ): Promise<string> {
    try {
      var isFlagged = await this.getModeration(userAndAgentPrompts);
      if (isFlagged) {
        return 'OpenAI has flagged this conversation as potentially harmful. If available, it is recommended to change the model and try again.';
      }
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
      throw new Error('Failed to get response from OpenAI API');
    }
  }
}
