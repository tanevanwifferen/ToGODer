import { ConversationApi } from '../Api/ConversationApi';
import { ChatRequest } from '../Model/ChatRequest';
import { User } from '@prisma/client';
import { AIProvider, getAIWrapper } from '../LLM/Model/AIProvider';
import { requestForMemoryPrompt } from '../LLM/prompts/systemprompts';

export const MAX_MEMORY_FETCH_LOOPS = 4;

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
    if (prompts.length === 0) {
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
    if (
      body.memoryLoopLimitReached ||
      (body.memoryLoopCount ?? 0) >= MAX_MEMORY_FETCH_LOOPS
    ) {
      return { keys: [] };
    }

    var result: any = null;
    let tries = 0;
    const memory_index = body.memoryIndex;
    if (memory_index.length === 0) {
      return { keys: [] };
    }
    while (
      result == null ||
      !('keys' in result) ||
      !Array.isArray(result.keys) ||
      result?.keys?.some((k: any) => typeof k !== 'string') ||
      result.keys.some((x: string) => !memory_index.includes(x))
    ) {
      result = await this.conversationApi.requestMemories(body, user);
      console.log('fetching memories', tries++);
      if (tries >= MAX_MEMORY_FETCH_LOOPS) {
        break;
      }
    }
    if (
      result == null ||
      !('keys' in result) ||
      !Array.isArray(result.keys) ||
      result?.keys?.some((k: any) => typeof k !== 'string') ||
      result.keys.some((x: string) => !memory_index.includes(x))
    ) {
      return { keys: [] };
    }
    return result;
  }
}
