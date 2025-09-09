import { Response } from 'express';

/**
 * Thin, reusable Server-Sent Events helper for clean streaming endpoints.
 */
export class SseStream {
  constructor(private res: Response) {
    this.res.setHeader('Content-Type', 'text/event-stream');
    this.res.setHeader('Cache-Control', 'no-cache, no-transform');
    this.res.setHeader('Connection', 'keep-alive');
    (this.res as any).flushHeaders?.();
  }

  event<T = any>(name: string, data: T) {
    try {
      this.res.write(`event: ${name}\n`);
      this.res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      // Ignore write errors on closed sockets
    }
  }

  comment(text: string) {
    try {
      this.res.write(`: ${text}\n\n`);
    } catch {
      // Ignore write errors on closed sockets
    }
  }

  done() {
    try {
      this.res.end();
    } catch {
      // Ignore
    }
  }
}
