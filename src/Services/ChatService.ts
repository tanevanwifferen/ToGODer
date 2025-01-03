import { ConversationApi } from '../Api/ConversationApi';
import { ChatRequest, ExperienceRequest } from '../Model/ChatRequest';
import { User } from '@prisma/client';
import crypto from 'crypto';
import { ExperienceSeedPrompt } from '../LLM/prompts/experienceprompts';
import { AIProvider } from '../LLM/Model/AIProvider';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

export class ChatService {
  private conversationApi: ConversationApi;
  private jwtSecret: string;

  constructor(assistantName: string) {
    this.conversationApi = new ConversationApi(assistantName);
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    this.jwtSecret = process.env.JWT_SECRET;
  }

  async getChatResponse(body: ChatRequest, user: User | null): Promise<string> {
    // Only allow longer conversations for authenticated users
    if (body.prompts.length > 20 && user === null) {
      return 'Please create a free account or login to have longer conversations.';
    }

    return await this.conversationApi.getResponse(body, user);
  }

  async getExperienceText(
    request: ExperienceRequest,
    user: User | null
  ): Promise<string> {
    const startText = await this.conversationApi.TranslateText(
      ExperienceSeedPrompt,
      request.language,
      request.model,
      user
    );
    return '/experience ' + startText;
  }

  async getTitle(
    content: ChatCompletionMessageParam[],
    model: AIProvider,
    user: User | null
  ): Promise<string> {
    return await this.conversationApi.getTitle(content, model, user);
  }

  getQuote(): string {
    return this.conversationApi.getQuote();
  }

  generateSignature(prompts: ChatRequest['prompts']): string {
    return crypto
      .createHmac('sha256', this.jwtSecret)
      .update(prompts.map((x) => x.content).join(' '))
      .digest('base64');
  }
}
