import { SharedChat, User } from '@prisma/client';
import { ChatService } from './ChatService';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import { getDbContext } from '../Entity/Database';

/**
 * Service for managing shared conversations.
 * Handles creating shared chats, verifying message signatures, and retrieving shared chats.
 */
export class ShareService {
  private chatService: ChatService;

  constructor() {
    this.chatService = new ChatService('');
  }

  /**
   * Creates a new shared chat after verifying all message signatures.
   * @param messages Array of messages with their signatures
   * @param title Title for the shared chat
   * @param description Optional description for the shared chat
   * @param owner The user sharing the chat
   * @returns The created SharedChat
   * @throws Error if any message signature is invalid
   */
  async createSharedChat(
    messages: { message: ChatCompletionMessageParam; signature: string }[],
    title: string,
    description: string | undefined,
    owner: User
  ): Promise<SharedChat> {
    // Verify all message signatures
    for (const { message, signature } of messages) {
      const expectedSignature = this.chatService.generateSignature([message]);
      if (signature !== expectedSignature) {
        throw new Error('Invalid message signature');
      }
    }

    // Store the chat with verified messages
    return await getDbContext().sharedChat.create({
      data: {
        ownerId: owner.id,
        title,
        description,
        messages: JSON.stringify(messages),
      },
    });
  }

  /**
   * Retrieves a shared chat by its ID.
   * @param id The ID of the shared chat
   * @returns The SharedChat with its messages
   */
  async getSharedChat(id: string): Promise<SharedChat | null> {
    const chat = await getDbContext().sharedChat.findUnique({
      where: { id },
      include: { owner: true },
    });

    if (chat) {
      // Increment view count
      await getDbContext().sharedChat.update({
        where: { id },
        data: { views: { increment: 1 } },
      });
    }

    return chat;
  }

  /**
   * Lists shared chats with pagination.
   * @param page Page number (1-based)
   * @param limit Number of items per page
   * @returns Array of SharedChats and total count
   */
  async listSharedChats(
    page: number = 1,
    limit: number = 50
  ): Promise<{ chats: SharedChat[]; total: number }> {
    const skip = (page - 1) * limit;

    const [chats, total] = await Promise.all([
      getDbContext().sharedChat.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { owner: true },
      }),
      getDbContext().sharedChat.count(),
    ]);

    return { chats, total };
  }
}
