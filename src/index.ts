import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { ChatController } from './Web/ChatController';
import { ConversationApi } from './Api/ConversationApi';
import { ModelApi } from './Api/ModelApi';

const app = express();
const port = process.env.PORT || 3000;

// Trust the first proxy to allow the app to get the client's IP address
app.set('trust proxy', 1);

// Rate limiter to prevent abuse
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 6, // The first one is the initial request so we (4 + 1)
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

app.use(express.json());

// Serve static files from the "../Frontend" directory
app.use(express.static(path.join(__dirname, '../Frontend')));

// controllers
ChatController(app, messageLimiter);

app.get('/api/links', (req, res) => {
  res.json(JSON.parse(process.env.LINKS || '[]'));
});

app.get('/api/global_config', (req, res) => {
  var donateOptions = JSON.parse(process.env.DONATE_OPTIONS || '[]');
  var quote = new ConversationApi().getQuote();
  var models = new ModelApi().ListModels();
  res.json({
    donateOptions: donateOptions,
    quote: quote,
    models,
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend/index.html'));
});

// Centralized error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).send('Internal Server Error');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
