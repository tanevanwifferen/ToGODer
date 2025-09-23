import { Response } from 'express';

/**
 * Thin, reusable Server-Sent Events helper for clean streaming endpoints.
 */
export class SseStream {
  private keepAliveTimer: NodeJS.Timeout | null = null;

  constructor(private res: Response) {
    this.res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    this.res.setHeader('Cache-Control', 'no-cache, no-transform');
    this.res.setHeader('Connection', 'keep-alive');
    // Hint reverse proxies (e.g., nginx) not to buffer SSE
    this.res.setHeader('X-Accel-Buffering', 'no');
    // Some proxies respect this older header variant
    this.res.setHeader('X-Content-Type-Options', 'nosniff');

    // Disable Nagle to reduce coalescing at the TCP layer
    try {
      (this.res.socket as any)?.setNoDelay?.(true);
    } catch {}

    // Flush headers immediately
    (this.res as any).flushHeaders?.();

    // Send an initial padding to encourage immediate flush through proxies/TLS
    // Many intermediaries flush on ~1-2KB; this helps chunk early
    try {
      const padding = ' '.repeat(2048);
      this.res.write(`: open\n:${padding}\n\n`);
      (this.res as any).flush?.();
    } catch {
      // Ignore write errors on closed sockets
    }

    // Periodic keep-alive to keep the connection and prompt flushes
    this.keepAliveTimer = setInterval(() => {
      this.comment('keep-alive');
    }, 1000 * 10);
  }

  event<T = any>(name: string, data: T) {
    try {
      this.res.write(`event: ${name}\n`);
      this.res.write(`data: ${JSON.stringify(data)}\n\n`);
      // Attempt to flush immediately when compression middleware is present
      (this.res as any).flush?.();
    } catch {
      // Ignore write errors on closed sockets
    }
  }

  comment(text: string) {
    try {
      this.res.write(`: ${text}\n\n`);
      (this.res as any).flush?.();
    } catch {
      // Ignore write errors on closed sockets
    }
  }

  done() {
    try {
      if (this.keepAliveTimer) {
        clearInterval(this.keepAliveTimer);
        this.keepAliveTimer = null;
      }
      this.res.end();
    } catch {
      // Ignore
    }
  }
}
