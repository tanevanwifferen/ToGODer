import { ChatRequest } from '../Model/ChatRequest';
import { User } from '@prisma/client';
import { ChatService } from './ChatService';
import { MemoryService, MAX_MEMORY_FETCH_LOOPS } from './MemoryService';
import { BillingApi } from '../Api/BillingApi';
import { ConversationApi } from '../Api/ConversationApi';
import { AIProvider, getDefaultModel } from '../LLM/Model/AIProvider';
import { StreamChunk } from '../LLM/AIWrapper';
import { ToolRegistry } from '../Tools/ToolRegistry';
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/index';

/** Maximum number of backend tool execution iterations before stopping */
const MAX_TOOL_LOOP_ITERATIONS = 10;

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
   *  - if LLM returns backend tool calls, execute them and loop
   *  - forward frontend-only tool calls to client
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

    // Balance check mirrors existing behavior but also covers unauthenticated users.
    // Skip paywall when using the default model — it's free for everyone.
    const isDefaultModel = body.model === getDefaultModel();

    if (totalMessages >= 10 && !isDefaultModel) {
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

    // Stream response from provider, with backend tool execution loop
    const registry = ToolRegistry.getInstance();
    const hasTools =
      (body.tools && body.tools.length > 0) ||
      registry.getDefinitionsForRequest(body).length > 0;

    if (hasTools) {
      yield* this.streamWithToolLoop(body, user, signal);
    } else {
      yield* this.streamSimple(body, user, signal);
    }
  }

  /**
   * Simple streaming without any tool handling.
   */
  private async *streamSimple(
    body: ChatRequest,
    user: User | null,
    signal?: AbortSignal
  ): AsyncGenerator<StreamEvent, void, void> {
    let full = '';
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

    const signature = this.chatService.generateSignature([
      ...body.prompts,
      { content: full, role: 'assistant' },
    ]);
    yield { type: 'signature', data: { signature } };
    yield { type: 'done' };
  }

  /**
   * Streaming with backend tool execution loop.
   *
   * When the LLM returns tool calls:
   * - Backend-registered tools are executed server-side, results fed back to the LLM
   * - Frontend-only tools are yielded as tool_call events to the client
   *
   * The loop continues until the LLM produces a text response with no backend
   * tool calls, or MAX_TOOL_LOOP_ITERATIONS is reached.
   */
  private async *streamWithToolLoop(
    body: ChatRequest,
    user: User | null,
    signal?: AbortSignal
  ): AsyncGenerator<StreamEvent, void, void> {
    const registry = ToolRegistry.getInstance();

    // Merge backend tool definitions with frontend-provided tools
    const mergedTools = this.mergeTools(body.tools ?? [], registry, body);

    // Work with a mutable copy of prompts that we extend with tool results
    const prompts: ChatCompletionMessageParam[] = [...body.prompts];
    let full = '';

    for (let iteration = 0; iteration < MAX_TOOL_LOOP_ITERATIONS; iteration++) {
      // Create a request copy with current prompts and merged tools
      const iterationBody: ChatRequest = {
        ...body,
        prompts,
        tools: mergedTools,
      };

      // Collect streaming output for this iteration
      const iterationResult = yield* this.streamOneIteration(
        iterationBody,
        user,
        signal
      );

      full += iterationResult.text;

      // If no tool calls at all, we're done
      if (iterationResult.toolCalls.length === 0) {
        break;
      }

      // Separate backend vs frontend tool calls
      const backendCalls = iterationResult.toolCalls.filter((tc) =>
        registry.has(tc.name)
      );
      const frontendCalls = iterationResult.toolCalls.filter(
        (tc) => !registry.has(tc.name)
      );

      // Yield frontend tool calls to the client
      for (const tc of frontendCalls) {
        yield { type: 'tool_call', data: tc };
      }

      // If no backend calls, stop looping (remaining are frontend-only)
      if (backendCalls.length === 0) {
        break;
      }

      // Build assistant message with tool_calls for the conversation history
      const assistantToolCalls = backendCalls.map((tc, index) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.arguments),
        },
      }));

      prompts.push({
        role: 'assistant',
        content: iterationResult.text || null,
        tool_calls: assistantToolCalls,
      });

      // Execute backend tools and add results to conversation
      for (const tc of backendCalls) {
        const tool = registry.get(tc.name);
        if (!tool) continue;

        let result: string;
        try {
          result = await tool.handler({
            arguments: tc.arguments,
            request: body,
          });
        } catch (err: any) {
          result = `Error executing tool ${tc.name}: ${err?.message ?? String(err)}`;
          console.error(`Backend tool execution error (${tc.name}):`, err);
        }

        prompts.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: result,
        });
      }

      // Loop continues - LLM will process the tool results
    }

    // Emit signature and done
    const signature = this.chatService.generateSignature([
      ...body.prompts,
      { content: full, role: 'assistant' },
    ]);
    yield { type: 'signature', data: { signature } };
    yield { type: 'done' };
  }

  /**
   * Stream one LLM iteration, yielding text chunks to the client and
   * collecting tool calls. Returns accumulated text and tool calls.
   */
  private async *streamOneIteration(
    body: ChatRequest,
    user: User | null,
    signal?: AbortSignal
  ): AsyncGenerator<
    StreamEvent,
    { text: string; toolCalls: ToolCallData[] },
    void
  > {
    let text = '';
    const toolCalls: ToolCallData[] = [];

    for await (const chunk of this.conversationApi.streamResponseWithTools(
      body,
      user,
      signal
    )) {
      if (chunk.type === 'text') {
        if (chunk.content && chunk.content.length > 0) {
          text += chunk.content;
          yield { type: 'chunk', data: { delta: chunk.content } };
        }
      } else if (chunk.type === 'tool_call') {
        let args: Record<string, any> = {};
        try {
          args = chunk.arguments ? JSON.parse(chunk.arguments) : {};
        } catch (e) {
          console.error('Failed to parse tool call arguments:', e);
          args = { raw: chunk.arguments };
        }
        toolCalls.push({
          id: chunk.id,
          name: chunk.name,
          arguments: args,
        });
      }
    }

    return { text, toolCalls };
  }

  /**
   * Merge frontend-provided tools with backend registry definitions.
   * Backend tools take precedence if there's a name conflict.
   */
  private mergeTools(
    frontendTools: ChatCompletionTool[],
    registry: ToolRegistry,
    request: ChatRequest
  ): ChatCompletionTool[] {
    const backendDefs = registry.getDefinitionsForRequest(request);
    const backendNames = new Set(
      backendDefs.map((d) => (d.type === 'function' ? d.function.name : ''))
    );

    // Filter out frontend tools that conflict with backend tool names
    const filteredFrontend = frontendTools.filter(
      (t) => t.type !== 'function' || !backendNames.has(t.function.name)
    );

    return [...backendDefs, ...filteredFrontend];
  }
}
