import { ChatRequest } from '../Model/ChatRequest';
import { User } from '@prisma/client';
import { ChatService } from './ChatService';
import { MemoryService, MAX_MEMORY_FETCH_LOOPS } from './MemoryService';
import { BillingApi } from '../Api/BillingApi';
import { ConversationApi } from '../Api/ConversationApi';
import { AIProvider } from '../LLM/Model/AIProvider';

/**
 * Tool call event data for artifact operations
 */
export interface ToolCallData {
  id: string;
  tool: string;
  args: Record<string, any>;
}

/**
 * Events emitted during streaming. Consumers can map these to SSE frames or other transports.
 */
export type StreamEvent =
  | { type: 'memory_request'; data: { keys: string[] } }
  | { type: 'chunk'; data: { delta: string } }
  | { type: 'tool_call'; data: ToolCallData }
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

      const userBalance = await this.billingApi.GetBalance(user.email);
      if (userBalance.lessThanOrEqualTo(0)) {
        body.model = AIProvider.DeepSeekV3;
      }

      const balance = await this.billingApi.GetTotalBalance(user.email);
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
    if (
      !!body.memoryIndex &&
      body.memoryIndex.length > 0 &&
      user != null &&
      !body.memoryLoopLimitReached &&
      (body.memoryLoopCount ?? 0) < MAX_MEMORY_FETCH_LOOPS
    ) {
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

    // Use tool-aware streaming if tools are provided
    if (body.tools && body.tools.length > 0) {
      for await (const chunk of this.conversationApi.streamResponseWithTools(body, user)) {
        if (chunk.type === 'text') {
          if (chunk.content && chunk.content.length > 0) {
            full += chunk.content;
            yield { type: 'chunk', data: { delta: chunk.content } };
          }
        } else if (chunk.type === 'tool_call') {
          // Parse the arguments JSON string into an object
          let args: Record<string, any> = {};
          try {
            args = chunk.arguments ? JSON.parse(chunk.arguments) : {};
          } catch (e) {
            console.error('Failed to parse tool call arguments:', e);
            args = { raw: chunk.arguments };
          }
          yield {
            type: 'tool_call',
            data: {
              id: chunk.id,
              tool: chunk.name,
              args,
            },
          };
        }
      }
    } else {
      // Use standard streaming without tools
      for await (const delta of this.conversationApi.streamResponse(body, user)) {
        if (delta && delta.length > 0) {
          full += delta;
          yield { type: 'chunk', data: { delta } };
        }
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
