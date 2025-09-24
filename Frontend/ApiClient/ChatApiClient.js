class ChatApiClient {
  static async sendMessage(
    model,
    humanPrompt,
    keepGoing,
    outsideBox,
    communicationStyle,
    messages
  ) {
    const response = await ApiClient.post('/chat', {
      model,
      humanPrompt,
      keepGoing,
      outsideBox,
      communicationStyle,
      prompts: messages.map((x) => ({
        content: x.body,
        role: x.author === 'you' ? 'user' : 'assistant',
      })),
    });

    return {
      content: response.content,
      signature: response.signature,
    };
  }

  /**
   * Stream a chat response via SSE over POST to /api/chat/stream.
   * Emits:
   *  - onChunk(delta)
   *  - onSignature(signature)
   *  - onDone()
   *  - onError(message)
   */
  static async streamMessage(
    model,
    humanPrompt,
    keepGoing,
    outsideBox,
    communicationStyle,
    messages,
    { onChunk, onSignature, onDone, onError } = {}
  ) {
    const controller = new AbortController();
    const token = ApiClient.authStore?.token;

    const body = JSON.stringify({
      model,
      humanPrompt,
      keepGoing,
      outsideBox,
      communicationStyle,
      prompts: messages.map((x) => ({
        content: x.body,
        role: x.author === 'you' ? 'user' : 'assistant',
      })),
    });

    const res = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // Some proxies require this to avoid buffering
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
      body,
      signal: controller.signal,
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      const msg = `Stream failed (${res.status}): ${text}`;
      if (onError) onError(msg);
      throw new Error(msg);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let hasDone = false;

    const flushFrames = () => {
      // Split by double newline between SSE events
      const frames = buffer.split(/\n\n/);
      // Keep the last partial frame in buffer
      buffer = frames.pop() || '';
      for (const frame of frames) {
        // Parse SSE lines
        const lines = frame.split('\n').map((l) => l.trim());
        let event = 'message';
        let data = '';
        for (const line of lines) {
          if (line.startsWith('event:')) {
            event = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            data += (data ? '\n' : '') + line.slice(5).trim();
          }
        }

        try {
          const parsed = data ? JSON.parse(data) : null;
          switch (event) {
            case 'chunk':
              if (onChunk && parsed?.delta != null) onChunk(parsed.delta);
              break;
            case 'signature':
              if (onSignature && parsed?.signature)
                onSignature(parsed.signature);
              break;
            case 'memory_request':
              // Optional: surface to UI later if needed
              break;
            case 'error':
              if (onError && parsed?.message) onError(parsed.message);
              break;
            case 'done':
              if (!hasDone) {
                hasDone = true;
                if (onDone) onDone();
              }
              break;
          }
        } catch {
          // Ignore JSON parse errors on malformed frames
        }
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // Flush any remaining buffered content
        if (buffer.length > 0) flushFrames();
        if (!hasDone) {
          hasDone = true;
          if (onDone) onDone();
        }
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      flushFrames();
    }
  }

  static async getTitle(model, messages) {
    const response = await ApiClient.post('/title', {
      model,
      content: messages.map((x) => ({
        content: x.body,
        role: x.author === 'you' ? 'user' : 'assistant',
      })),
    });

    return response.content;
  }

  static async startExperience(model, language) {
    const response = await ApiClient.post('/experience', {
      model,
      language,
    });

    return response.content;
  }
}
