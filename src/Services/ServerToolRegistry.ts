/**
 * Registry for server-side tool handlers.
 * Tools registered here are executed on the server rather than being
 * passed through to the client as SSE events.
 */

export interface ServerToolHandler {
  execute(args: Record<string, any>): Promise<string>;
}

const serverTools = new Map<string, ServerToolHandler>();

export function registerServerTool(
  name: string,
  handler: ServerToolHandler
): void {
  serverTools.set(name, handler);
}

export function isServerTool(name: string): boolean {
  return serverTools.has(name);
}

export function getServerTool(name: string): ServerToolHandler | undefined {
  return serverTools.get(name);
}
