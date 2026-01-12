import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { GetChatRouter } from './Web/ChatController';
import { ConversationApi } from './Api/ConversationApi';
import { GetAuthRouter } from './Web/AuthController';
import { GetModelName, ListModels } from './LLM/Model/AIProvider';
import { GetBillingRouter } from './Web/BillingController';
import { setupKoFi } from './Web/KoFiController';
import { setupRunners } from './Auth/Runners';
import { GetShareRouter } from './Web/ShareController';
import { GetMemoryRouter } from './Web/MemoryController';
import { GetSyncRouter } from './Web/SyncController';
import {
  GetRealtimeVoiceRouter,
  setupRealtimeVoiceWebSocket,
} from './Web/RealtimeVoiceController';
import { createServer } from 'http';
import WebSocket from 'ws';

const app = express();
const port = process.env.PORT || 3000;

// Trust the first proxy to allow the app to get the client's IP address
app.set('trust proxy', 1);

// Rate limiter to prevent abuse
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 12, // The first one is the initial request so we (4 + 1)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    console.log(`Rate limit exceeded for IP: ${req.ip}`);
    res
      .status(429)
      .send('Too many messages sent from this IP, please try again later.');
  },
  headers: true,
});

app.use(express.json({limit: "50mb"}));

app.use(
  express.urlencoded({
    extended: true,
  })
);

// Serve static files from the "../Frontend" directory
app.use(express.static(path.join(__dirname, '../Frontend')));

// controllers
const chatRouter = GetChatRouter(messageLimiter);
const authRouter = GetAuthRouter();
const billingRouter = GetBillingRouter(messageLimiter);
const memoryRouter = GetMemoryRouter(messageLimiter);
const shareRouter = GetShareRouter(messageLimiter);
const realtimeVoiceRouter = GetRealtimeVoiceRouter(messageLimiter);
const syncRouter = GetSyncRouter(messageLimiter);

app.use(chatRouter);
app.use(authRouter);
app.use(billingRouter);
app.use(memoryRouter);
app.use(shareRouter);
app.use(realtimeVoiceRouter);
app.use(syncRouter);

const donateOptions: { address: string }[] = JSON.parse(
  process.env.DONATE_OPTIONS || '[]'
);
if (donateOptions.filter((x) => x.address.includes('ko-fi.com')).length > 0) {
  setupKoFi(app);
}

app.get('/api/links', (req, res) => {
  res.json(JSON.parse(process.env.LINKS || '[]'));
});

app.get('/api/global_config', (req, res) => {
  var donateOptions = JSON.parse(process.env.DONATE_OPTIONS || '[]');
  var showLogin = JSON.parse(process.env.SHOW_LOGIN || 'false');
  var quote = new ConversationApi('').getQuote();
  var models = ListModels().map((x) => ({ model: x, title: GetModelName(x) }));
  const libraryIntegrationEnabled =
    String(process.env.LIBRARY_INTEGRATION_ENABLED || 'false')
      .trim()
      .toLowerCase() === 'true';
  const librarianApiUrl = process.env.LIBRARIAN_API_URL || '';
  res.json({
    donateOptions: donateOptions,
    quote: quote,
    models,
    showLogin,
    libraryIntegrationEnabled,
    librarianApiUrl,
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend/index.html'));
});

// Centralized error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error at ' + new Date() + ':', err);
  console.error(_req.body);
  res.status(500).send('Internal Server Error');
});

// Create HTTP server and WebSocket server
const server = createServer(app);
const wss = new WebSocket.Server({
  server,
  path: '/api/realtime/ws',
});

// Setup realtime voice WebSocket handling
setupRealtimeVoiceWebSocket(wss, messageLimiter);

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(
    `WebSocket server is available at ws://localhost:${port}/api/realtime/ws`
  );
});

setupRunners();
