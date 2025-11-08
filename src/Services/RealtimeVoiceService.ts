import WebSocket from 'ws';
import { ChatRequest } from '../Model/ChatRequest';
import { User } from '@prisma/client';
import { ConversationApi } from '../Api/ConversationApi';

/**
 * Service to handle OpenAI Realtime API for voice conversations.
 * Manages WebSocket connections between client and OpenAI Realtime API.
 */
export class RealtimeVoiceService {
  private conversationApi: ConversationApi;
  private openAiApiKey: string;

  constructor(assistantName: string) {
    this.conversationApi = new ConversationApi(assistantName);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required for Realtime API');
    }
    this.openAiApiKey = apiKey;
  }

  /**
   * Creates a WebSocket connection to OpenAI Realtime API
   * with the appropriate configuration
   */
  async createRealtimeConnection(
    chatRequest: ChatRequest,
    user: User | null
  ): Promise<WebSocket> {
    // Build system prompt using existing conversation API logic
    const systemPrompt = await this.buildSystemInstructions(chatRequest);

    // Connect to OpenAI Realtime API
    const url =
      'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
    const ws = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${this.openAiApiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    return new Promise((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        reject(new Error('OpenAI Realtime API connection timeout'));
        ws.close();
      }, 15000); // 15 second timeout for OpenAI connection

      ws.on('open', () => {
        clearTimeout(connectionTimeout);
        console.log('Connected to OpenAI Realtime API');

        // Configure session with system instructions
        ws.send(
          JSON.stringify({
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: systemPrompt,
              voice: 'alloy',
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: {
                model: 'whisper-1',
              },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
              },
              temperature: 0.8,
              max_response_output_tokens: 4096,
            },
          })
        );
        resolve(ws);
      });

      ws.on('error', (error: Error) => {
        clearTimeout(connectionTimeout);
        console.error('OpenAI Realtime API WebSocket error:', error);

        // Enhance error message
        let errorMessage = 'Failed to connect to OpenAI Realtime API';
        if (
          error.message.includes('401') ||
          error.message.includes('Unauthorized')
        ) {
          errorMessage += ': Invalid API key';
        } else if (error.message.includes('429')) {
          errorMessage += ': Rate limit exceeded';
        } else if (error.message.includes('timeout')) {
          errorMessage += ': Connection timeout';
        } else if (error.message) {
          errorMessage += `: ${error.message}`;
        }

        reject(new Error(errorMessage));
      });
    });
  }

  /**
   * Builds system instructions similar to regular chat
   * Uses only the short-term memory (configurableData) as specified
   */
  private async buildSystemInstructions(
    chatRequest: ChatRequest
  ): Promise<string> {
    // Use the same prompt building logic but simplified for realtime
    const conversationApi = this.conversationApi as any;

    // Build base system prompt
    let systemPrompt = await conversationApi.buildSystemPrompt(chatRequest);

    // For realtime, we only include the short-term memory (configurableData)
    // Skip the memory fetching process to keep it fast
    let personalDataPrompt = '';
    if (chatRequest.configurableData) {
      personalDataPrompt =
        'Personal data about the user (short-term memory): ' +
        (typeof chatRequest.configurableData === 'string'
          ? chatRequest.configurableData
          : JSON.stringify(chatRequest.configurableData));
    }

    if (chatRequest.staticData) {
      personalDataPrompt +=
        '\n\nStatic data about the user: ' +
        JSON.stringify(chatRequest.staticData);
    }

    const date =
      chatRequest.staticData?.date ||
      new Date().toDateString() + ' ' + new Date().toTimeString();
    personalDataPrompt += '\n\nThe date today = ' + date;

    // Combine prompts
    const instructions = systemPrompt + '\n\n' + personalDataPrompt;

    return instructions;
  }

  /**
   * Handles relay of messages between client WebSocket and OpenAI WebSocket
   */
  relayMessages(
    clientWs: WebSocket,
    openAiWs: WebSocket,
    onTranscript?: (role: 'user' | 'assistant', text: string) => void
  ): void {
    // Forward messages from client to OpenAI
    clientWs.on('message', (data: Buffer, isBinary: boolean) => {
      try {
        if (openAiWs.readyState !== WebSocket.OPEN) {
          console.warn('OpenAI WebSocket not open, cannot forward message');
          return;
        }

        if (isBinary) {
          // A. Binary audio from the client (e.g., mic frames)
          // Base64-encode it and push into the input audio buffer
          const b64 = data.toString('base64');
          openAiWs.send(
            JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: b64,
            })
          );
        } else {
          // B. Text/JSON messages from the client
          const message = JSON.parse(data.toString());

          // Track transcripts if callback provided
          if (onTranscript && message.type === 'conversation.item.created') {
            const item = message.item;
            if (item?.type === 'message' && item.content) {
              for (const content of item.content) {
                if (content.type === 'input_text' || content.type === 'text') {
                  onTranscript(
                    item.role === 'user' ? 'user' : 'assistant',
                    content.text || content.transcript || ''
                  );
                }
              }
            }
          }

          // Forward the JSON message as-is to OpenAI
          openAiWs.send(data);
        }
      } catch (error) {
        console.error('Error processing client message:', error);
      }
    });

    // Forward messages from OpenAI to client
    openAiWs.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        // Track transcripts from OpenAI events
        if (onTranscript) {
          if (
            message.type ===
            'conversation.item.input_audio_transcription.completed'
          ) {
            onTranscript('user', message.transcript || '');
          } else if (message.type === 'response.audio_transcript.delta') {
            // Accumulate assistant transcript deltas
            onTranscript('assistant', message.delta || '');
          }
        }

        // Forward to client
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data);
        }
      } catch (error) {
        console.error('Error processing OpenAI message:', error);
      }
    });

    // Handle disconnections
    clientWs.on('close', () => {
      if (openAiWs.readyState === WebSocket.OPEN) {
        openAiWs.close();
      }
    });

    openAiWs.on('close', (code: number, reason: Buffer) => {
      console.log(
        'OpenAI WebSocket closed. Code:',
        code,
        'Reason:',
        reason.toString()
      );
      if (clientWs.readyState === WebSocket.OPEN) {
        // Forward the close code and reason from OpenAI to the client
        const reasonText = reason.toString() || 'OpenAI connection closed';
        clientWs.close(code || 1011, reasonText);
      }
    });

    // Handle errors
    clientWs.on('error', (error: Error) => {
      console.error('Client WebSocket error:', error);
      if (openAiWs.readyState === WebSocket.OPEN) {
        openAiWs.close();
      }
    });

    openAiWs.on('error', (error: Error) => {
      console.error('OpenAI WebSocket error:', error);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close();
      }
    });
  }
}
