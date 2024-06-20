import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import { AIWrapper } from '../LLM/AIWrapper';
import { OpenAIWrapper } from '../LLM/OpenAI';
import {
  AdaptToConversantsCommunicationStyle,
  FormattingPrompt,
  HumanResponsePrompt,
  keepConversationGoingPrompt,
  lessBloatPrompt,
} from '../LLM/prompts/chatprompts';
import { PromptList } from '../LLM/prompts/promptlist';
import { GetTitlePrompt } from '../LLM/prompts/systemprompts';
import {
  ChatRequest,
  ChatRequestCommunicationStyle,
} from '../Models/ChatRequest';
import { AIProvider } from '../Models/AIProvider';
import { OpenRouterWrapper } from '../LLM/OpenRouter';
import { ModelApi } from './ModelApi';

let quote = '';
export class ConversationApi {
  public getQuote() {
    return quote;
  }

  /**
   * Get a short title for a conversation based on the first prompt.
   */
  public async getTitle(
    model: AIProvider,
    body: ChatCompletionMessageParam[]
  ): Promise<string> {
    if (body.length > 1) {
      throw new Error('Only one prompt is allowed for this endpoint');
    }
    var aiWrapper = this.getAIWrapper(model);

    var prompt = GetTitlePrompt + body[0].content;

    return await aiWrapper.getResponse(prompt, body);
  }

  public async getResponseRaw(
    input: ChatCompletionMessageParam[],
    systemprompt: string
  ) {
    var aiWrapper = this.getAIWrapper(new ModelApi().GetDefaultModel());
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
    var aiWrapper = this.getAIWrapper(input.model);

    var firstPrompt = (<string>input.prompts[0].content)?.split(' ')[0];

    var systemprompt = PromptList['/default'].prompt;
    if (firstPrompt in PromptList) {
      systemprompt = PromptList[firstPrompt].prompt;
    }
    systemprompt += '\n\n' + FormattingPrompt;
    if (input.humanPrompt) {
      systemprompt += '\n\n' + HumanResponsePrompt;
    }

    switch (input.communcationStyle) {
      case ChatRequestCommunicationStyle.Default:
        break;
      case ChatRequestCommunicationStyle.LessBloat:
        systemprompt += '\n\n' + lessBloatPrompt;
        break;
      case ChatRequestCommunicationStyle.AdaptToConversant:
        systemprompt += '\n\n' + AdaptToConversantsCommunicationStyle;
        break;
    }

    if (input.keepGoing) {
      systemprompt += '\n\n' + keepConversationGoingPrompt;
    }
    return await aiWrapper.getResponse(systemprompt, input.prompts);
  }

  private getAIWrapper(model: AIProvider): AIWrapper {
    switch (model) {
      case AIProvider.Gpt4o:
        return new OpenAIWrapper();
      case AIProvider.Claude3SonnetBeta:
        return new OpenRouterWrapper('anthropic/claude-3.5-sonnet:beta');
      default:
        return new OpenAIWrapper();
    }
  }
}

async function updateQuote() {
  quote = await new ConversationApi().getResponseRaw(
    [{ content: 'the assistant is a spiritual guide', role: 'user' }],
    'Share a short fitting message for people who seek. make it quotable.'
  );
}

updateQuote();
setInterval(updateQuote, 1000 * 60 * 60 * 24);
