import { ConversationApi } from '../Api/ConversationApi';
import { ChatRequest } from '../Model/ChatRequest';
import { User } from '@prisma/client';
import { AIProvider, getAIWrapper } from '../LLM/Model/AIProvider';
import { requestForMemoryPrompt } from '../LLM/prompts/systemprompts';

export class MemoryService {
  private conversationApi: ConversationApi;

  constructor(assistantName: string) {
    this.conversationApi = new ConversationApi(assistantName);
  }

  async getPersonalDataUpdates(
    prompts: ChatRequest['prompts'],
    configurableData: any,
    date: string,
    model: AIProvider,
    user: User | null
  ): Promise<string | null> {
    if (!configurableData || prompts.length === 0) {
      return null;
    }

    const result = await this.conversationApi.getPersonalDataUpdates(
      prompts,
      configurableData,
      date,
      model,
      user
    );

    if (result === '' || result == '""' || result == "''") {
      return null;
    }

    return result;
  }

  async requestMemories(
    body: ChatRequest,
    user: User
  ): Promise<{ keys: string[] }> {
    var result: any = null;
    let tries = 0;
    while (
      result == null ||
      !('keys' in result) ||
      !Array.isArray(result.keys) ||
      result?.keys?.some((k: any) => typeof k !== 'string')
    ) {
      result = await this.conversationApi.requestMemories(body, user);
      console.log('fetching memories', tries++);
    }
    return result;
  }
}
