import {
  ChatCompletion,
  ChatCompletionMessageParam,
} from 'openai/resources/index.mjs';
import {
  AdaptToConversantsCommunicationStyle,
  FormattingPrompt,
  HumanResponsePrompt,
  keepConversationGoingPrompt,
  lessBloatPrompt,
  outsideBoxPrompt,
} from '../LLM/prompts/chatprompts';
import { PromptList } from '../LLM/prompts/promptlist';
import { GetTitlePrompt } from '../LLM/prompts/systemprompts';
import {
  ChatRequest,
  ChatRequestCommunicationStyle,
} from '../LLM/Model/ChatRequest';
import {
  AIProvider,
  getAIWrapper,
  getDefaultModel,
} from '../LLM/Model/AIProvider';
import { TranslationPrompt } from '../LLM/prompts/experienceprompts';
import { User } from '@prisma/client';
import { BillingDecorator } from '../Decorators/BillingDecorator';

let quote = '';

function CompletionToContent(completion: ChatCompletion): string {
  return completion.choices[0].message.content!;
}

export class ConversationApi {
  public getQuote() {
    return quote;
  }

  private getAIWrapper(provider: AIProvider, user: User | null | undefined) {
    var aiWrapper = getAIWrapper(provider);
    if (user != null) {
      aiWrapper = new BillingDecorator(aiWrapper, user);
    }
    return aiWrapper;
  }

  /**
   * Get a short title for a conversation based on the first prompt.
   */
  public async getTitle(
    body: ChatCompletionMessageParam[],
    model: AIProvider,
    user: User | null | undefined
  ): Promise<string> {
    if (body.length > 1) {
      throw new Error('Only one prompt is allowed for this endpoint');
    }
    var aiWrapper = this.getAIWrapper(model, user);

    var prompt = GetTitlePrompt + body[0].content;

    return CompletionToContent(await aiWrapper.getResponse(prompt, body));
  }

  public async getResponseRaw(
    input: ChatCompletionMessageParam[],
    systemPrompt: string,
    model: AIProvider = getDefaultModel(),
    user: User | null | undefined
  ): Promise<ChatCompletion> {
    var aiWrapper = this.getAIWrapper(model, user);
    return await aiWrapper.getResponse(systemPrompt, input);
  }

  /**
   * Get a chat completion for a conversation with the AI.
   * @param input Chat history
   * @param user User to bill for the conversation
   * @returns string response from the AI
   */
  public async getResponse(
    input: ChatRequest,
    user: User | null | undefined
  ): Promise<string> {
    if (input.prompts.length == 0) {
      return '';
    }
    var aiWrapper = this.getAIWrapper(input.model, user);

    var firstPrompt = (<string>input.prompts[0].content)?.split(' ')[0];

    var systemPrompt = PromptList['/default'].prompt;
    if (firstPrompt in PromptList) {
      systemPrompt = PromptList[firstPrompt].prompt;
    } else if (
      Object.values(PromptList).some((x) => x.aliases?.includes(firstPrompt))
    ) {
      systemPrompt = Object.values(PromptList).find((x) =>
        x.aliases?.includes(firstPrompt)
      )?.prompt!;
    }
    systemPrompt += '\n\n' + FormattingPrompt;
    if (input.humanPrompt) {
      systemPrompt += '\n\n' + HumanResponsePrompt;
    }

    switch (input.communicationStyle) {
      case ChatRequestCommunicationStyle.Default:
        break;
      case ChatRequestCommunicationStyle.LessBloat:
        systemPrompt += '\n\n' + lessBloatPrompt;
        break;
      case ChatRequestCommunicationStyle.AdaptToConversant:
        systemPrompt += '\n\n' + AdaptToConversantsCommunicationStyle;
        break;
    }

    if (input.outsideBox) {
      systemPrompt += '\n\n' + outsideBoxPrompt;
    }

    if (input.keepGoing) {
      systemPrompt += '\n\n' + keepConversationGoingPrompt;
    }
    return CompletionToContent(
      await aiWrapper.getResponse(systemPrompt, input.prompts)
    );
  }

  public async TranslateText(
    text: string,
    language: string = 'English',
    model: AIProvider = AIProvider.Gpt4oMini,
    user: User | null | undefined
  ): Promise<string> {
    var aiWrapper = this.getAIWrapper(model, user);
    var result = await aiWrapper.getResponse(TranslationPrompt + language, [
      { content: text, role: 'user' },
    ]);
    return CompletionToContent(result);
  }
}

async function updateQuote() {
  var q = await new ConversationApi().getResponseRaw(
    [{ content: 'the assistant is a spiritual guide', role: 'user' }],
    'Share a short fitting message for people who seek. make it quotable.',
    getDefaultModel(),
    null
  );
  quote = CompletionToContent(q);
}

updateQuote();
setInterval(updateQuote, 1000 * 60 * 60 * 24);
