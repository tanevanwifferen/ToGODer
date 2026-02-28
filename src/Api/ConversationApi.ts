import {
  ChatCompletion,
  ChatCompletionMessageParam,
} from 'openai/resources/index';
import {
  AdaptToConversantsCommunicationStyle,
  FormattingPrompt,
  holisticTherapistPrompt,
  HumanResponsePrompt,
  InformalCommunicationStyle,
  keepConversationGoingPrompt,
  lessBloatPrompt,
  outsideBoxPrompt,
} from '../LLM/prompts/chatprompts';
import { PromptList } from '../LLM/prompts/promptlist';
import {
  GetTitlePrompt,
  requestForMemoryPrompt,
  requestForMemoryBasedOnSystemPromptPrompt,
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
import { StreamChunk } from '../LLM/AIWrapper';
import { TranslationPrompt } from '../LLM/prompts/experienceprompts';
import { User } from '@prisma/client';
import { BillingDecorator } from '../Decorators/BillingDecorator';
import { keysSchema } from '../zod/requestformemory';
import { rootpersona } from '../LLM/prompts/rootprompts';
import { ParsedChatCompletion } from 'openai/resources/chat/completions/index';

let quote = '';

function CompletionToContent(completion: ChatCompletion): string {
  return completion.choices[0].message.content!;
}

function JsonToContent(completion: ParsedChatCompletion<any>): string {
  const response = completion.choices[0].message;
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

  public getAIWrapper(provider: AIProvider, user: User | null | undefined) {
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
    shortTermMemory: any,
    date: string,
    model: AIProvider,
    user: User | null | undefined,
    signal?: AbortSignal
  ): Promise<string> {
    var aiWrapper = this.getAIWrapper(AIProvider.LLama3370b, user);
    var inputMessages = prompts.length > 2 ? prompts.slice(-2) : prompts;
    const data_str =
      typeof shortTermMemory == 'string'
        ? shortTermMemory
        : JSON.stringify(shortTermMemory);
    const messages = [
      {
        role: 'system' as const,
        content: `current date: ${date || new Date().toISOString()}`,
      },
      {
        role: 'system' as const,
        content: `Current memory log: ${shortTermMemory || 'emtpy'}\n\nUser messages: ${JSON.stringify(inputMessages)}`,
      },
    ];
    const response = await aiWrapper.getResponse(
      UpdatePersonalDataPrompt,
      messages,
      1,
      signal
    );
    const content = CompletionToContent(response);
    return content;
  }

  /**
   * Get a short title for a conversation based on the first prompt.
   */
  public async getTitle(
    body: ChatCompletionMessageParam[],
    model: AIProvider,
    user: User | null | undefined,
    signal?: AbortSignal
  ): Promise<string> {
    var aiWrapper = this.getAIWrapper(model, user);

    var prompt = GetTitlePrompt + body[0].content;

    return CompletionToContent(
      await aiWrapper.getResponse(prompt, body, 1, signal)
    );
  }

  public async requestMemories(
    body: ChatRequest,
    user: User,
    signal?: AbortSignal
  ): Promise<{ keys: string[] }> {
    if (!body.memoryIndex || body.memoryIndex.length == 0) {
      return { keys: [] };
    }
    let memoryPrompt = requestForMemoryPrompt;
    memoryPrompt += this.formatPersonalData(body);
    memoryPrompt +=
      '\n\nThis is the list of all possible memories you can choose from: ' +
      JSON.stringify(body.memoryIndex);

    const wrapper = this.getAIWrapper(AIProvider.DeepSeekV32, user);
    const json_response = await wrapper.getJSONResponse(
      memoryPrompt,
      body.prompts,
      keysSchema,
      1,
      signal
    );
    const content = JsonToContent(json_response);
    if ((await json_response).usage?.total_tokens == 0) {
      return { keys: [] };
    }

    console.log('memory response', json_response);
    var keys = JSON.parse(content) as { keys: string[] };
    var existing_keys = Object.keys(body.memories);
    keys.keys = keys.keys.filter((x) => !existing_keys.includes(x));
    return keys;
  }

  /**
   * Request memories that are relevant to a generated system prompt.
   * This method analyzes the system prompt content to determine which memories would enhance it.
   */
  public async requestMemoriesForSystemPrompt(
    systemPrompt: string,
    memoryIndex: string[],
    existingMemories: { [key: string]: string },
    user: User,
    signal?: AbortSignal
  ): Promise<{ keys: string[] }> {
    if (!memoryIndex || memoryIndex.length == 0) {
      return { keys: [] };
    }

    let memoryPrompt = requestForMemoryBasedOnSystemPromptPrompt;
    memoryPrompt += '\n\nGenerated system prompt:\n' + systemPrompt;
    memoryPrompt +=
      '\n\nThis is the list of all possible memories you can choose from: ' +
      JSON.stringify(memoryIndex);

    const wrapper = this.getAIWrapper(AIProvider.Grok3Mini, user);
    const json_response = await wrapper.getJSONResponse(
      memoryPrompt,
      [
        {
          role: 'system',
          content: `Current date: ${new Date().toISOString()}`,
        },
        {
          role: 'user',
          content:
            'Please analyze the system prompt and return relevant memory keys.',
        },
      ],
      keysSchema,
      1,
      signal
    );
    const content = JsonToContent(json_response);
    if ((await json_response).usage?.total_tokens == 0) {
      return { keys: [] };
    }

    console.log('memory response', content);
    var keys = JSON.parse(content) as { keys: string[] };
    var existing_keys = Object.keys(existingMemories);
    keys.keys = keys.keys.filter((x) => !existing_keys.includes(x));
    return keys;
  }

  public async getResponseRaw(
    input: ChatCompletionMessageParam[],
    systemPrompt: string,
    model: AIProvider = getDefaultModel(),
    user: User | null | undefined,
    signal?: AbortSignal
  ): Promise<ChatCompletion> {
    var aiWrapper = this.getAIWrapper(model, user);
    return await aiWrapper.getResponse(systemPrompt, input, 1, signal);
  }

  // Build the full system prompt string based on input request options
  private async buildSystemPrompt(input: ChatRequest): Promise<string> {
    let systemPrompt =
      input.customSystemPrompt ?? PromptList['/default'].prompt;

    const firstPrompt = (<string>input.prompts[0]?.content)?.split(' ')[0];
    if (firstPrompt in PromptList) {
      systemPrompt = PromptList[firstPrompt].prompt;
    } else if (
      Object.values(PromptList).some((x) => x.aliases?.includes(firstPrompt))
    ) {
      systemPrompt = Object.values(PromptList).find((x) =>
        x.aliases?.includes(firstPrompt)
      )?.prompt!;
    }

    if (input.persona && String(input.persona).length > 0) {
      const personaHeader =
        'User persona (personal background/preferences for better responses): ' +
        input.persona;
      systemPrompt = personaHeader + '\n\n' + systemPrompt;
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

    if (input.holisticTherapist) {
      systemPrompt += '\n\n' + holisticTherapistPrompt;
    }

    systemPrompt = systemPrompt.replace(
      /{{ name }}/g,
      () => this.assistant_name!
    );

    systemPrompt += '\n\n' + this.formatPersonalData(input);
    systemPrompt = rootpersona + '\n\n' + systemPrompt;

    return systemPrompt;
  }

  /**
   * Get a chat completion for a conversation with the AI.
   * @param input Chat history
   * @param user User to bill for the conversation
   * @param signal Optional AbortSignal to cancel the request
   * @returns string response from the AI
   */
  public async getResponse(
    input: ChatRequest,
    user: User | null | undefined,
    signal?: AbortSignal
  ): Promise<string> {
    if (input.prompts.length == 0) {
      return '';
    }
    const aiWrapper = this.getAIWrapper(input.model, user);
    const systemPrompt = await this.buildSystemPrompt(input);

    const output = CompletionToContent(
      await aiWrapper.getResponse(
        systemPrompt,
        input.prompts,
        input.libraryIntegrationEnabled ? 2 : 1,
        signal
      )
    );
    return output;
  }

  /**
   * Native streaming response generator using provider streaming.
   * Yields incremental content deltas as they are produced by the model.
   * @param input Chat history and configuration
   * @param user User to bill for the conversation
   * @param signal Optional AbortSignal to cancel the streaming request
   */
  public async *streamResponse(
    input: ChatRequest,
    user: User | null | undefined,
    signal?: AbortSignal
  ): AsyncGenerator<string, void, void> {
    if (input.prompts.length == 0) {
      return;
    }
    const aiWrapper = this.getAIWrapper(input.model, user);
    const systemPrompt = await this.buildSystemPrompt(input);
    for await (const delta of aiWrapper.streamResponse(
      systemPrompt,
      input.prompts,
      input.libraryIntegrationEnabled ? 2 : 1,
      signal
    )) {
      if (delta) yield delta;
    }
  }

  /**
   * Streaming response with tool support.
   * Yields StreamChunk objects that can be either text deltas or tool calls.
   * @param input Chat history and configuration
   * @param user User to bill for the conversation
   * @param signal Optional AbortSignal to cancel the streaming request
   */
  public async *streamResponseWithTools(
    input: ChatRequest,
    user: User | null | undefined,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk, void, void> {
    if (input.prompts.length == 0) {
      return;
    }
    const aiWrapper = this.getAIWrapper(input.model, user);
    const systemPrompt = await this.buildSystemPrompt(input);
    for await (const chunk of aiWrapper.streamResponseWithTools(
      systemPrompt,
      input.prompts,
      input.tools,
      input.libraryIntegrationEnabled ? 2 : 1,
      signal
    )) {
      yield chunk;
    }
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
    if (body.memories && Object.keys(body.memories).length > 0) {
      Object.keys(body.memories).forEach((key) => {
        personalData.push(`memory ${key}: ` + body.memories[key]);
      });
    }

    // Include artifact index so AI knows what files are available to read
    if (body.artifactIndex && body.artifactIndex.length > 0) {
      const artifactList = body.artifactIndex
        .map((a) => `- ${a.name} (${a.mimeType}) at path: ${a.path}`)
        .join('\n');
      personalData.push(
        'Available artifacts (files you can read using the read_file tool):\n' +
          artifactList
      );
    }

    var date = () =>
      new Date().toDateString() + ' ' + new Date().toTimeString();
    personalData.push('The date today = ' + body.staticData?.date || date());

    return personalData.join('\n\n');
  }

  public async TranslateText(
    text: string,
    language: string = 'English',
    model: AIProvider = AIProvider.LLama3370b,
    user: User | null | undefined,
    signal?: AbortSignal
  ): Promise<string> {
    var aiWrapper = this.getAIWrapper(model, user);
    text = text.replace(/{{ name }}/g, this.assistant_name);
    var result = await aiWrapper.getResponse(
      TranslationPrompt + language,
      [{ role: 'user', content: text }],
      1,
      signal
    );
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
