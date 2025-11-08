import { Request, Response, NextFunction, Router } from 'express';
import { RateLimitRequestHandler } from 'express-rate-limit';
import { setAuthUser } from './Middleware/auth';
import { ToGODerRequest } from './Model/ToGODerRequest';
import { RealtimeVoiceService } from '../Services/RealtimeVoiceService';
import {
  ChatRequest,
  ChatRequestCommunicationStyle,
} from '../Model/ChatRequest';
import { AIProvider, getDefaultModel } from '../LLM/Model/AIProvider';
import { BillingApi } from '../Api/BillingApi';
import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { Duplex } from 'stream';
import { Decimal } from '@prisma/client/runtime/binary';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { getDbContext } from '../Entity/Database';
import { User } from '@prisma/client';

function getAssistantName(): string {
  return process.env.ASSISTANT_NAME ?? 'ToGODer';
}

/**
 * Controller for handling OpenAI Realtime API voice conversations.
 * Provides WebSocket endpoint for bidirectional audio streaming.
 */
export function GetRealtimeVoiceRouter(
  messageLimiter: RateLimitRequestHandler
): Router {
  const router = Router();

  // HTTP endpoint to initiate realtime session
  // Returns session info and prepares for WebSocket upgrade
  router.post(
    '/api/realtime/session',
    messageLimiter,
    setAuthUser,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = (req as ToGODerRequest).togoder_auth?.user ?? null;

        // Parse the chat request from body
        let body: ChatRequest = req.body;
        if (!('prompts' in req.body)) {
          body = {
            model: getDefaultModel(),
            humanPrompt: false,
            keepGoing: false,
            outsideBox: false,
            holisticTherapist: false,
            communicationStyle: ChatRequestCommunicationStyle.Default,
            prompts: [],
            memories: {},
            memoryIndex: [],
            assistant_name: getAssistantName(),
          };
        }
        if (body.assistant_name == null || body.assistant_name == '') {
          body.assistant_name = getAssistantName();
        }

        // For realtime, we only use configurableData (short-term memory)
        // No memory fetching to keep it fast
        res.json({
          status: 'ready',
          message: 'Realtime session ready. Upgrade to WebSocket.',
          assistant_name: body.assistant_name,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

/**
 * Sets up WebSocket server for realtime voice connections
 */
export function setupRealtimeVoiceWebSocket(
  wss: WebSocket.Server,
  messageLimiter?: RateLimitRequestHandler
): void {
  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    console.log('New realtime voice connection');

    const billingApi = new BillingApi();
    let sessionStartTime: number | null = null;
    let user: User | null = null;

    try {
      // Parse query parameters for session configuration
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const params = url.searchParams;

      // Authenticate user via JWT token
      // Try authorization header first, then fall back to query parameter
      const authHeader = req.headers.authorization;
      let token: string | null = null;

      if (authHeader) {
        token = authHeader.split(' ')[1];
      } else {
        // WebSocket in browsers doesn't support custom headers, so check query params
        token = params.get('token');
      }

      if (token) {
        try {
          if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET not configured');
          }
          const { id } = jwt.verify(
            token,
            process.env.JWT_SECRET
          ) as JwtPayload;
          const db = getDbContext();
          user = await db.user.findUnique({ where: { id } });

          if (!user) {
            console.log('User not found for token');
            ws.close(1008, 'Authentication failed: User not found');
            return;
          }
        } catch (error) {
          console.log('JWT verification failed:', error);
          ws.close(1008, 'Authentication failed: Invalid token');
          return;
        }
      }

      // Check balance before allowing connection (if authenticated)
      if (user) {
        const balance = await billingApi.GetTotalBalance(user.email);
        if (balance.lessThanOrEqualTo(0)) {
          console.log(`Insufficient balance for user: ${user.email}`);
          ws.close(
            1008,
            'Insufficient balance. Please add credits to continue.'
          );
          return;
        }
      }

      // Build chat request from query params
      const chatRequest: ChatRequest = {
        model: (params.get('model') as AIProvider) || getDefaultModel(),
        humanPrompt: params.get('humanPrompt') === 'true',
        keepGoing: params.get('keepGoing') === 'true',
        outsideBox: params.get('outsideBox') === 'true',
        holisticTherapist: params.get('holisticTherapist') === 'true',
        communicationStyle:
          (params.get(
            'communicationStyle'
          ) as unknown as ChatRequestCommunicationStyle) ||
          ChatRequestCommunicationStyle.Default,
        prompts: [],
        memories: {},
        memoryIndex: [],
        assistant_name: params.get('assistant_name') || getAssistantName(),
        configurableData: params.get('configurableData') || undefined,
        staticData: params.get('staticData')
          ? JSON.parse(params.get('staticData')!)
          : undefined,
        persona: params.get('persona') || undefined,
        customSystemPrompt: params.get('customSystemPrompt') || undefined,
        libraryIntegrationEnabled: false, // Disable for realtime
      };

      // Handle custom prompt mode (e.g., '/wakeUp' for morning routine)
      const promptMode = params.get('promptMode');
      if (promptMode) {
        // Add prompt mode as the first message to trigger the specific system prompt
        chatRequest.prompts = [
          {
            role: 'user',
            content: promptMode,
          },
        ];
      }

      const service = new RealtimeVoiceService(chatRequest.assistant_name!);

      // Track transcripts for potential storage
      const transcriptParts: Array<{
        role: 'user' | 'assistant';
        text: string;
      }> = [];

      // Create connection to OpenAI Realtime API
      const openAiWs = await service.createRealtimeConnection(
        chatRequest,
        null // TODO: Add user auth support if needed
      );

      // Mark session start time for billing
      sessionStartTime = Date.now();

      // Relay messages between client and OpenAI
      service.relayMessages(ws, openAiWs, (role, text) => {
        if (text && text.trim()) {
          transcriptParts.push({ role, text: text.trim() });
        }
      });

      // Handle billing and cleanup when session ends
      const handleSessionEnd = async () => {
        console.log('Realtime voice connection closed');

        // Calculate session duration and bill
        if (sessionStartTime && user) {
          const sessionDurationMs = Date.now() - sessionStartTime;
          const sessionDurationMinutes = sessionDurationMs / 60000;

          // OpenAI Realtime API pricing (approximate):
          // Audio input: $0.06 per minute
          // Audio output: $0.24 per minute
          // Text input: $5 per million tokens
          // Text output: $20 per million tokens
          //
          // For simplicity, we'll estimate average cost per minute
          // Assuming roughly equal input/output: ($0.06 + $0.24) / 2 = $0.15 per minute
          const costPerMinute = new Decimal(0.15);
          const sessionCost = costPerMinute.mul(sessionDurationMinutes);

          try {
            await billingApi.BillForMonth(sessionCost, user.email);
            console.log(
              `Billed ${user.email} $${sessionCost.toFixed(4)} for ${sessionDurationMinutes.toFixed(2)} minute voice session`
            );
          } catch (error) {
            console.error('Error billing for voice session:', error);
          }
        }

        if (transcriptParts.length > 0) {
          // Log transcript (could be extended to save to database)
          console.log(
            'Session transcript:',
            JSON.stringify(transcriptParts, null, 2)
          );
        }
      };

      ws.on('close', handleSessionEnd);
    } catch (error) {
      console.error('Error setting up realtime voice connection:', error);

      // Provide specific error message based on error type
      let errorMessage = 'Internal server error';
      let closeCode = 1011;

      if (error instanceof Error) {
        if (error.message.includes('OPENAI_API_KEY')) {
          errorMessage = 'OpenAI API key not configured';
          closeCode = 1011;
        } else if (
          error.message.includes('balance') ||
          error.message.includes('credits')
        ) {
          errorMessage = 'Insufficient balance';
          closeCode = 1008;
        } else if (
          error.message.includes('authentication') ||
          error.message.includes('token')
        ) {
          errorMessage = 'Authentication failed';
          closeCode = 1008;
        } else {
          errorMessage = error.message;
        }
      }

      console.error(
        'Closing WebSocket with code:',
        closeCode,
        'message:',
        errorMessage
      );
      ws.close(closeCode, errorMessage);
    }
  });
}
