import { ChatRequest } from '../Model/ChatRequest';
import { User } from '@prisma/client';
import { ChatService } from './ChatService';
import { MemoryService } from './MemoryService';
import { BillingApi } from '../Api/BillingApi';
import { ConversationApi } from '../Api/ConversationApi';

/**
 * Events emitted during streaming. Consumers can map these to SSE frames or other transports.
 */
export type StreamEvent =
  | { type: 'memory_request'; data: { keys: string[] } }
  | { type: 'chunk'; data: { delta: string } }
  | { type: 'signature'; data: { signature: string } }
  | { type: 'error'; data: { message: string } }
  | { type: 'done'; data?: null };

/**
 * Encapsulates the streaming chat logic so controllers remain thin.
 * Currently simulates token streaming by chunking a full response, but can be
 * upgraded to real provider streaming without changing controller code.
 */
export class StreamingChatService {
  private chatService: ChatService;
  private memoryService: MemoryService;
  private billingApi: BillingApi;
  private conversationApi: ConversationApi;

  constructor(assistantName: string) {
    this.chatService = new ChatService(assistantName);
    this.memoryService = new MemoryService(assistantName);
    this.billingApi = new BillingApi();
    this.conversationApi = new ConversationApi(assistantName);
  }

  /**
   * Streams chat result as an async generator of StreamEvent objects.
   * Flow:
   *  - balance check (authenticated users with long chats)
   *  - memory request check
   *  - generate streamed response (native provider streaming)
   *  - emit chunk events from provider deltas
   *  - emit signature and done
   */
  async *streamChat(
    body: ChatRequest,
    user: User | null
  ): AsyncGenerator<StreamEvent, void, void> {
    const totalMessages = Array.isArray(body.prompts) ? body.prompts.length : 0;
    const paywallMessage =
      'Insufficient balance. Please donate through KoFi with this email address to continue using the service.';

    // Balance check mirrors existing behavior but also covers unauthenticated users
    if (totalMessages >= 10) {
      if (!user) {
        yield { type: 'chunk', data: { delta: paywallMessage } };
        const signature = this.chatService.generateSignature([
          ...body.prompts,
          { content: paywallMessage, role: 'assistant' },
        ]);
        yield { type: 'signature', data: { signature } };
        yield { type: 'done' };
        return;
      }

      const balance = await this.billingApi.GetBalance(user.email);
      if (balance.lessThanOrEqualTo(0)) {
        yield { type: 'chunk', data: { delta: paywallMessage } };
        const signature = this.chatService.generateSignature([
          ...body.prompts,
          { content: paywallMessage, role: 'assistant' },
        ]);
        yield { type: 'signature', data: { signature } };
        yield { type: 'done' };
        return;
      }
    }

    // Memory request flow (requires user)
    if (!!body.memoryIndex && body.memoryIndex.length > 0 && user != null) {
      const requestForMemory = await this.memoryService.requestMemories(
        body,
        user
      );
      if (requestForMemory.keys.length > 0) {
        yield { type: 'memory_request', data: requestForMemory };
        yield { type: 'done' };
        return;
      }
    }

    // Stream response from provider and forward chunks, accumulating for signature
    let full = '';
    for await (const delta of this.conversationApi.streamResponse(body, user)) {
      if (delta && delta.length > 0) {
        full += delta;
        yield { type: 'chunk', data: { delta } };
      }
    }

    // Emit signature and done
    const signature = this.chatService.generateSignature([
      ...body.prompts,
      { content: full, role: 'assistant' },
    ]);
    yield { type: 'signature', data: { signature } };
    yield { type: 'done' };
  }
}
