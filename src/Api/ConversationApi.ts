import {
  ChatCompletion,
  ChatCompletionMessageParam,
} from 'openai/resources/index.mjs';
import {
  AdaptToConversantsCommunicationStyle,
  FormattingPrompt,
  HumanResponsePrompt,
  InformalCommunicationStyle,
  keepConversationGoingPrompt,
  lessBloatPrompt,
  outsideBoxPrompt,
} from '../LLM/prompts/chatprompts';
import { PromptList } from '../LLM/prompts/promptlist';
import {
  GetTitlePrompt,
  UpdatePersonalDataPrompt,
} from '../LLM/prompts/systemprompts';
import {
  ChatRequest,
  ChatRequestCommunicationStyle,
} from '../Model/ChatRequest';
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
  public get assistant_name(): string {
    return this._assistant_name;
  }

  constructor(private _assistant_name: string) {}

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
   * Get personal data updates based on the conversation
   */
  public async getPersonalDataUpdates(
    prompts: ChatCompletionMessageParam[],
    data: any,
    date: string,
    model: AIProvider,
    user: User | null | undefined
  ): Promise<string> {
    var aiWrapper = this.getAIWrapper(model, user);
    var inputMessages = prompts.length > 2 ? prompts.slice(-2) : prompts;
    const data_str = typeof data == 'string' ? data : JSON.stringify(data);
    const messages = [
      {
        role: 'system' as const,
        content: `current date: ${date || new Date().toISOString()}`,
      },
      {
        role: 'system' as const,
        content: `Current data: ${JSON.stringify(data)}\n\nUser message: ${JSON.stringify(inputMessages)}`,
      },
    ];
    const response = await aiWrapper.getResponse(
      UpdatePersonalDataPrompt,
      messages
    );
    const content = CompletionToContent(response);
    //console.log(messages, content);
    return content;
  }

  /**
   * Get a short title for a conversation based on the first prompt.
   */
  public async getTitle(
    body: ChatCompletionMessageParam[],
    model: AIProvider,
    user: User | null | undefined
  ): Promise<string> {
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
      case ChatRequestCommunicationStyle.Informal:
        systemPrompt += '\n\n' + InformalCommunicationStyle;
        break;
    }

    if (input.outsideBox) {
      systemPrompt += '\n\n' + outsideBoxPrompt;
    }

    if (input.keepGoing) {
      systemPrompt += '\n\n' + keepConversationGoingPrompt;
    }
    systemPrompt = systemPrompt.replace(
      /{{ name }}/g,
      () => this.assistant_name!
    );

    systemPrompt += '\n\n' + this.formatPersonalData(input);

    return CompletionToContent(
      await aiWrapper.getResponse(systemPrompt, input.prompts)
    );
  }

  private formatPersonalData(body: ChatRequest): string {
    // Add data as system message if provided
    let personalData = [];
    if (body.configurableData) {
      personalData.push(
        'This is personal data about the user: ' +
          JSON.stringify(body.configurableData)
      );
    }
    if (body.staticData) {
      personalData.push(
        'This is static data about the user: ' + JSON.stringify(body.staticData)
      );
    }
    personalData.push(
      'The date today = ' + body.staticData?.date || new Date().toISOString()
    );

    return personalData.join('\n\n');
  }

  public async TranslateText(
    text: string,
    language: string = 'English',
    model: AIProvider = AIProvider.Gpt4oMini,
    user: User | null | undefined
  ): Promise<string> {
    var aiWrapper = this.getAIWrapper(model, user);
    text = text.replace(/{{ name }}/g, this.assistant_name);
    var result = await aiWrapper.getResponse(TranslationPrompt + language, [
      { content: text, role: 'user' },
    ]);
    return CompletionToContent(result);
  }
}

async function updateQuote() {
  var q = await new ConversationApi('').getResponseRaw(
    [{ content: 'the assistant is a spiritual guide', role: 'user' }],
    'Share a short fitting message for people who seek. make it quotable.',
    getDefaultModel(),
    null
  );
  quote = CompletionToContent(q);
}

updateQuote();
setInterval(updateQuote, 1000 * 60 * 60 * 24);
