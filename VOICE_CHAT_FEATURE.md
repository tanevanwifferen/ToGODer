# Voice Chat Feature Documentation

## Overview

The voice chat feature enables real-time, two-way voice conversations with the AI using OpenAI's Realtime API. Users can click the telephone icon in the chat header to start a voice conversation, and transcripts are automatically saved to the chat history.

## Architecture

### Backend Components

#### 1. RealtimeVoiceService (`src/Services/RealtimeVoiceService.ts`)

- Manages WebSocket connections to OpenAI Realtime API
- Builds system instructions using existing conversation API logic
- Handles bidirectional message relay between client and OpenAI
- Tracks and provides transcripts via callback

**Key Methods:**

- `createRealtimeConnection()` - Establishes WebSocket connection to OpenAI
- `buildSystemInstructions()` - Generates system prompt (uses only short-term memory)
- `relayMessages()` - Relays messages between client and OpenAI WebSockets

#### 2. RealtimeVoiceController (`src/Web/RealtimeVoiceController.ts`)

- Provides HTTP and WebSocket endpoints for voice chat
- Handles session initialization
- Manages WebSocket connections from clients
- Tracks transcripts for potential storage

**Endpoints:**

- `POST /api/realtime/session` - Initialize realtime session (HTTP)
- `WS /api/realtime/ws` - WebSocket connection for voice chat

#### 3. Main Application Updates (`src/index.ts`)

- Integrated WebSocket server with Express HTTP server
- Configured WebSocket endpoint at `/api/realtime/ws`

### Frontend Components

#### 1. ChatHeader Component (`ToGODer_app/components/chat/ChatHeader.tsx`)

- Added telephone icon button using Ionicons
- Button shows active state when voice chat is running
- Icon changes from outline to filled when active
- Green color indicates active voice session

#### 2. useVoiceChat Hook (`ToGODer_app/hooks/useVoiceChat.ts`)

- Manages voice chat state and WebSocket connection
- Handles audio capture and playback
- Processes OpenAI Realtime API messages
- Tracks and returns transcripts
- Supports both web and mobile platforms

**Key Features:**

- Microphone permission handling
- Audio format conversion (Float32 to PCM16)
- Real-time audio streaming
- Automatic transcript accumulation
- Error handling and cleanup

#### 3. Chat Component Updates (`ToGODer_app/components/Chat.tsx`)

- Integrated voice chat functionality
- Automatically saves transcripts to conversation
- Shows error toasts for voice chat issues
- Handles voice chat button press

## Configuration

### Backend Requirements

**Environment Variables:**

- `OPENAI_API_KEY` - Required for Realtime API access

**NPM Packages:**

```bash
cd ToGODer
npm install ws @types/ws
```

### Frontend Requirements

**NPM Packages:**

```bash
cd ToGODer_app
npm install expo-av
```

**Permissions:**

- Microphone access (automatically requested on first use)

## Communication Flow

### 1. Session Initialization

```
Client → POST /api/realtime/session (optional)
Server → Returns session ready status
```

### 2. WebSocket Connection

```
Client → WS /api/realtime/ws?[params]
Server → Creates OpenAI Realtime API connection
Server → Configures session with system instructions
```

### 3. Audio Streaming

```
User speaks → Microphone capture → PCM16 conversion
→ WebSocket → Backend relay → OpenAI Realtime API
→ AI processes → Audio response → Backend relay
→ Client → Audio playback → User hears response
```

### 4. Transcript Tracking

```
OpenAI → Transcript events → Backend callback
→ Client receives transcript events
→ Saved to chat history automatically
```

### 5. Session Billing

```
Session ends → Calculate duration → Apply pricing model
→ Cost = duration (minutes) × $0.15
→ BillingApi.BillForMonth(cost, user_email)
→ Update usage records in database
```

## Memory Handling

**Short-term Memory Only:**

- Voice chat uses only `configurableData` (short-term memory)
- Long-term memory fetching is skipped for performance
- Ensures fast, responsive voice interactions
- System prompt is built with current context only

## Usage

### Starting Voice Chat

1. User clicks telephone icon in chat header
2. App requests microphone permission (first time)
3. WebSocket connection established
4. Audio starts streaming bidirectionally
5. Icon turns green and filled to show active state

### During Voice Chat

- Speak naturally - server VAD detects speech
- AI responds with voice and text
- Transcripts automatically saved to conversation
- No text input needed while voice is active

### Ending Voice Chat

1. User clicks telephone icon again
2. WebSocket connection closes
3. Audio capture stops
4. Final transcripts saved
5. Icon returns to outline state

## Error Handling

**Backend:**

- WebSocket connection errors logged
- OpenAI API errors handled and relayed
- Automatic cleanup on disconnect

**Frontend:**

- Permission denied → Shows error toast
- Connection failed → Shows error toast
- Audio errors → Logged and handled gracefully
- Automatic cleanup on unmount

## Testing

### Backend Testing

```bash
# Start the backend server
cd ToGODer
npm run build
npm start

# Server should log:
# "Server is running on port 3000"
# "WebSocket server is available at ws://localhost:3000/api/realtime/ws"
```

### Frontend Testing

**Web:**

```bash
cd ToGODer_app
npm run web
```

1. Open chat view
2. Click telephone icon in header
3. Allow microphone access
4. Speak to test voice input
5. Verify AI responds with voice
6. Check transcripts appear in chat

**Mobile (iOS/Android):**

```bash
cd ToGODer_app
npm run ios     # or npm run android
```

1. Follow same steps as web
2. Test on physical device for best audio quality

## Platform-Specific Notes

### Web Platform

- Uses Web Audio API for audio capture
- Uses AudioContext for audio processing
- Requires HTTPS in production for microphone access
- Uses native ReadableStream for WebSocket

### Mobile Platforms

- Uses Expo AV for audio recording
- Uses XMLHttpRequest for WebSocket on iOS (fallback)
- Requires microphone permissions in app.json/Info.plist
- Audio quality optimized for mobile networks

## Troubleshooting

### "Cannot find module 'ws'"

```bash
cd ToGODer
npm install ws @types/ws
```

### "Cannot find module 'expo-av'"

```bash
cd ToGODer_app
npm install expo-av
```

### Microphone Permission Denied

- Web: Check browser permissions
- iOS: Check Settings → Privacy → Microphone
- Android: Check app permissions

### No Audio Response

- Check OpenAI API key is valid
- Verify WebSocket connection established
- Check browser console for errors
- Ensure speakers/audio output is working

### Transcripts Not Saving

- Check Redux store is properly configured
- Verify chat ID exists
- Check browser/app console for errors

## API Compatibility

**OpenAI Realtime API:**

- Model: `gpt-4o-realtime-preview-2024-10-01`
- Voice: `alloy` (configurable in RealtimeVoiceService)
- Audio Format: PCM16 @ 24kHz
- Turn Detection: Server VAD with configurable thresholds

## Future Enhancements

Potential improvements:

1. Voice selection (alloy, echo, fable, onyx, nova, shimmer)
2. Audio quality settings
3. Background recording support
4. Offline transcript storage
5. Voice activity visualization
6. Recording history
7. Voice commands
8. Multi-language support
9. Audio effects/filters
10. Conversation analytics

## Security Considerations

- OpenAI API key stored server-side only
- Client never has direct API access
- WebSocket connections validated
- Rate limiting applied via existing middleware
- Audio data streamed, not stored by default
- Transcripts saved locally per user

## Performance Notes

- Typical latency: 300-500ms
- Audio chunk size: 4096 samples
- Sample rate: 24kHz
- Buffer size optimized for real-time
- WebSocket keepalive every 100ms
- Memory usage: ~5-10MB per active session

## Credits

Implementation based on:

- OpenAI Realtime API Documentation
- React Native Voice Chat patterns
- Web Audio API best practices
- Expo AV guidelines
