import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import { AIWrapper } from '../LLM/AIWrapper';
import { OpenAIWrapper } from '../LLM/OpenAI';
import {
  FormattingPrompt,
  HumanResponsePrompt,
  keepConversationGoingPrompt,
  lessBloatPrompt,
} from '../LLM/prompts/chatprompts';
import { PromptList } from '../LLM/prompts/promptlist';
import { GetTitlePrompt } from '../LLM/prompts/systemprompts';
import { ChatRequest } from '../Web/ChatController';

let quote = '';
export class ConversationApi {
  public getQuote() {
    return quote;
  }

  /**
   * Get a short title for a conversation based on the first prompt.
   */
  public async getTitle(body: ChatCompletionMessageParam[]): Promise<string> {
    if (body.length > 1) {
      throw new Error('Only one prompt is allowed for this endpoint');
    }
    var aiWrapper = this.getAIWrapper();

    var prompt = GetTitlePrompt + body[0].content;

    return await aiWrapper.getResponse(prompt, body);
  }

  public async getResponseRaw(
    input: ChatCompletionMessageParam[],
    systemprompt: string
  ) {
    var aiWrapper = this.getAIWrapper();
    return await aiWrapper.getResponse(systemprompt, input);
  }

  /**
   * Get a chat completion for a conversation with the AI.
   * @param prompts Chat history
   * @returns string response from the AI
   */
  public async getResponse(input: ChatRequest): Promise<string> {
    if (input.prompts.length == 0) {
      return '';
    }
    var aiWrapper = this.getAIWrapper();

    var firstPrompt = (<string>input.prompts[0].content)?.split(' ')[0];

    var systemprompt = PromptList['/default'].prompt;
    if (firstPrompt in PromptList) {
      systemprompt = PromptList[firstPrompt].prompt;
    }
    systemprompt += '\n\n' + FormattingPrompt;
    if (input.humanPrompt) {
      systemprompt += '\n\n' + HumanResponsePrompt;
    }
    if (input.lessBloat) {
      systemprompt += '\n\n' + lessBloatPrompt;
    }
    if (input.keepGoing) {
      systemprompt += '\n\n' + keepConversationGoingPrompt;
    }
    return await aiWrapper.getResponse(systemprompt, input.prompts);
  }

  private getAIWrapper(): AIWrapper {
    return new OpenAIWrapper();
  }
}

async function updateQuote() {
  quote = await new ConversationApi().getResponseRaw(
    [{ content: 'the assistant is a spiritual guide', role: 'user' }],
    'Share a fitting message for people who seek. make it quotable.'
  );
}

updateQuote();
setInterval(updateQuote, 1000 * 60 * 60 * 24);
