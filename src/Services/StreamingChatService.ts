import { ChatRequest } from '../Model/ChatRequest';
import { User } from '@prisma/client';
import { ChatService } from './ChatService';
import { MemoryService, MAX_MEMORY_FETCH_LOOPS } from './MemoryService';
import { BillingApi } from '../Api/BillingApi';
import { ConversationApi } from '../Api/ConversationApi';
import { AIProvider } from '../LLM/Model/AIProvider';
import { isServerTool, getServerTool } from './ServerToolRegistry';
import { ChatCompletionMessageParam } from 'openai/resources/index';

/**
 * Tool call event data for artifact operations
 */
export interface ToolCallData {
  id: string;
  name: string;
  arguments: Record<string, any>;
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
    user: User | null,
    signal?: AbortSignal
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
      const MAX_TOOL_LOOPS = 10;

      for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
        const pendingToolCalls: Array<{
          id: string;
          name: string;
          arguments: string;
        }> = [];
        let assistantText = '';

        for await (const chunk of this.conversationApi.streamResponseWithTools(
          body,
          user,
          signal
        )) {
          if (chunk.type === 'text') {
            if (chunk.content && chunk.content.length > 0) {
              full += chunk.content;
              assistantText += chunk.content;
              yield { type: 'chunk', data: { delta: chunk.content } };
            }
          } else if (chunk.type === 'tool_call') {
            pendingToolCalls.push({
              id: chunk.id,
              name: chunk.name,
              arguments: chunk.arguments,
            });
          }
        }

        // No tool calls — LLM finished with a text response
        if (pendingToolCalls.length === 0) {
          break;
        }

        const serverCalls = pendingToolCalls.filter((tc) =>
          isServerTool(tc.name)
        );
        const clientCalls = pendingToolCalls.filter(
          (tc) => !isServerTool(tc.name)
        );

        // Emit client-side tool calls to SSE stream
        for (const tc of clientCalls) {
          let args: Record<string, any> = {};
          try {
            args = tc.arguments ? JSON.parse(tc.arguments) : {};
          } catch (e) {
            console.error('Failed to parse tool call arguments:', e);
            args = { raw: tc.arguments };
          }
          yield {
            type: 'tool_call',
            data: { id: tc.id, name: tc.name, arguments: args },
          };
        }

        // No server-side tool calls — all were client-side, stop looping
        if (serverCalls.length === 0) {
          break;
        }

        // Build assistant message with ALL tool_calls for conversation history
        const assistantMessage: ChatCompletionMessageParam = {
          role: 'assistant',
          content: assistantText || null,
          tool_calls: pendingToolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: tc.arguments },
          })),
        };
        body.prompts.push(assistantMessage);

        // Execute server-side tools and append results
        for (const tc of serverCalls) {
          let args: Record<string, any> = {};
          try {
            args = tc.arguments ? JSON.parse(tc.arguments) : {};
          } catch (e) {
            args = {};
          }

          const handler = getServerTool(tc.name)!;
          let result: string;
          try {
            result = await handler.execute(args);
          } catch (error: any) {
            result = JSON.stringify({
              error: error?.message ?? 'Tool execution failed',
            });
          }

          body.prompts.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: result,
          } as ChatCompletionMessageParam);
        }

        // If there were also client-side tool calls, stop looping —
        // the client needs to provide those results in a follow-up request
        if (clientCalls.length > 0) {
          break;
        }

        // All tool calls were server-side — continue loop for next LLM response
      }
    } else {
      // Use standard streaming without tools
      for await (const delta of this.conversationApi.streamResponse(
        body,
        user,
        signal
      )) {
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
