import {
  ChatCompletionFunctionTool,
  ChatCompletionTool,
} from 'openai/resources/chat/completions/completions';

/**
 * Context passed to a backend tool handler when executed.
 */
export interface ToolContext {
  /** The parsed arguments from the LLM tool call */
  arguments: Record<string, any>;
}

/**
 * A registered backend tool definition.
 */
export interface RegisteredTool {
  /** OpenAI-format function tool definition (name, description, JSON schema) */
  definition: ChatCompletionFunctionTool;
  /** Async handler that executes the tool and returns a string result */
  handler: (ctx: ToolContext) => Promise<string>;
}

/**
 * Singleton registry for backend-executed tools.
 *
 * Tools registered here will be:
 * 1. Included in LLM requests alongside any frontend-provided tools
 * 2. Executed server-side when the LLM calls them
 * 3. Their results fed back to the LLM automatically
 *
 * Tools NOT registered here are forwarded to the frontend as tool_call events.
 */
export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, RegisteredTool> = new Map();

  private constructor() {}

  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  /**
   * Register a backend tool.
   * @param name Unique tool name (must match the function name in the definition)
   * @param definition OpenAI ChatCompletionFunctionTool definition
   * @param handler Async function that executes the tool
   */
  register(
    name: string,
    definition: ChatCompletionFunctionTool,
    handler: (ctx: ToolContext) => Promise<string>
  ): void {
    this.tools.set(name, { definition, handler });
  }

  /** Check if a tool is registered as a backend tool */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /** Get a registered tool by name */
  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  /** Get all registered tool definitions (for merging into LLM requests) */
  getDefinitions(): ChatCompletionTool[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  /** Remove a registered tool */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /** Clear all registered tools */
  clear(): void {
    this.tools.clear();
  }
}
