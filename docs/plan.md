# Hack&Roll 2026 - Remote Desktop AI Assistant

## Project Overview

A cross-platform solution that enables users to get AI-powered assistance for their computer workflow by capturing desktop context (screenshots, screen recordings, browser tabs, file system info) and sending it to an AI backend via a mobile chat interface.

**Hackathon:** [Hack&Roll 2026](https://hacknroll.nushackers.org/) — 24-hour hackathon (17-18 Jan 2026)

**Time Budget:** ~15 hours of active development

---

## Core Concept

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Mobile App    │────▶│   Backend API   │◀────│   Desktop App   │
│  (Expo/React    │     │   (Fastify +    │     │   (Electron)    │
│   Native)       │     │    LLM)         │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
       │                       │                       │
       │                       │                       │
   Chat UI &              AI Processing           Screen Capture
   Voice Input            & Context               Browser Tabs
                          Management              File System
```

---

## Tech Stack

### Monorepo Structure (Turborepo)

```
/apps
  /mobile          → Expo TypeScript
  /desktop         → Electron TypeScript
  /server          → Fastify TypeScript
```

### Mobile App (Expo)

| Category | Choice | Reason |
| --- | --- | --- |
| Framework | **Expo SDK 52+** | Fast dev, easy build, TypeScript |
| Navigation | **Expo Router** | File-based routing, familiar |
| State/Fetching | **TanStack Query** | Caching, mutations, real-time |
| UI | **NativeWind (Tailwind CSS)** | Tailwind for React Native, consistent styling |
| Voice Input | **expo-speech** or **Whisper API** | Audio transcription |

### Desktop App (Electron)

| Category | Choice | Reason |
| --- | --- | --- |
| Framework | **Electron + Vite + React** | Fast builds, TypeScript, React UI |
| UI Styling | **Tailwind CSS** | Rapid styling, consistent design |
| Screenshots | **screenshot-desktop** | Cross-platform native screenshots |
| Screen Recording | **desktopCapturer + MediaRecorder** | Built-in, captures video flows |
| Video Processing | **@ffmpeg/ffmpeg** (WebAssembly) | Compress videos before upload |
| System Info | **systeminformation** | CPU, memory, processes |
| File System | **Node fs** | Native access |
| Tray Icon | **Electron Tray** | Background running |

### Backend (Fastify)

| Category | Choice | Reason |
| --- | --- | --- |
| Framework | **Fastify** | Stable, fast, great TypeScript support |
| Validation | **Zod + fastify-type-provider-zod** | Type-safe validation |
| Auth (Optional) | **Clerk** (mobile only) | 5-min setup, handles OAuth, optional for demo |
| File Upload | **@fastify/multipart** | Handle screenshots/videos (up to 100MB) |
| WebSocket | **@fastify/websocket** | Real-time (optional MVP+) |
| LLM | **Multi-model support** (switchable) | Claude, GPT-4o, Gemini |
| Database | **Convex** | Real-time sync, easy setup |
| Video Storage | **Convex File Storage** | Built-in blob storage |

<aside>
💡

**Why Fastify over Hono/Elysia?** Fastify has better ecosystem maturity, more plugins for file uploads, and proven stability — important for a hackathon where you can't afford debugging edge cases.

</aside>

### Multi-Model LLM Support

| LLM | Vision | Video | Speed | Cost |
| --- | --- | --- | --- | --- |
| **Claude 3.5 Sonnet** | ✅ Excellent | ✅ Good | Fast | $3/1M input |
| **GPT-4o** | ✅ Good | ✅ Good | Fast | $2.50/1M input |
| **Gemini 1.5 Pro** | ✅ Good | ✅ **Excellent** | Medium | Free tier (2M tokens/min) |
| **Gemini 1.5 Flash** | ✅ Good | ✅ Good | **Very Fast** | Free tier (15 RPM) |

**Strategy:** Start with **Gemini 1.5 Flash** for free demos, offer model switching in UI. Gemini has the best video capabilities and generous free tier.

---

## MVP Features (15-hour scope)

### ✅ Must Have (Core Demo)

- [ ]  **Mobile:** Chat interface with message threads
- [ ]  **Mobile:** Text + voice input modes
- [ ]  **Mobile:** Recording controls (start/stop)
- [ ]  **Mobile:** Connect to desktop via pairing code
- [ ]  **Desktop:** System tray app (runs in background)
- [ ]  **Desktop:** Capture screenshot on demand
- [ ]  **Desktop:** Record screen video (start/stop)
- [ ]  **Desktop:** Send media to backend
- [ ]  **Desktop:** Recording status indicator on desktop
- [ ]  **Backend:** Multi-model LLM routing
- [ ]  **Backend:** Process images + videos
- [ ]  **Backend:** Return AI response to mobile

### 🎯 Nice to Have (If time permits)

- [ ]  Video playback in chat
- [ ]  Browser tab information
- [ ]  Chat history persistence (Convex)
- [ ]  Multiple desktop connections
- [ ]  Video compression optimization

### ❌ Skip for Hackathon

- File system browsing
- Real-time WebSocket streaming
- Long video analysis (>30 seconds)
- Full user profiles and account management

---

## Authentication Strategy

<aside>
💡

**Hackathon Recommendation: Skip traditional auth entirely**

Your pairing code system already provides session security. For a 15-hour hackathon, adding Clerk or any auth system adds 1-2 hours of setup/debugging with minimal demo value.

</aside>

### Option 1: No Auth (Recommended for Hackathon) ⭐

**Why this works:**

- Pairing code acts as temporary session authentication
- Desktop app generates unique `desktopId` on first launch
- Mobile app pairs via 6-digit code (sufficient for demo security)
- No signup/login flow needed

**Pros:**

- Zero setup time
- No auth bugs during demo
- Works offline
- Focus on core features

**Cons:**

- No persistent user accounts
- Can't access sessions across devices

**Perfect for:** 24-hour hackathon demo

---

### Option 2: Clerk (If You Need User Accounts)

**When to use:**

- You want to save chat history across sessions
- Judges ask "how do users sign up?"
- You have extra time (1-2 hours)

**Setup Time:** ~45 minutes (mobile) + 30 minutes (backend)

#### Mobile Setup (Expo)

```bash
npm install @clerk/clerk-expo
```

```tsx
// app/_layout.tsx
import { ClerkProvider } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';

const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
};

export default function RootLayout() {
  return (
    <ClerkProvider 
      publishableKey={process.env.EXPO_PUBLIC_CLERK_KEY!}
      tokenCache={tokenCache}
    >
      <App />
    </ClerkProvider>
  );
}
```

```tsx
// screens/SignInScreen.tsx
import { useSignIn } from '@clerk/clerk-expo';

export function SignInScreen() {
  const { signIn, setActive } = useSignIn();
  
  const onSignInWithEmail = async (email: string) => {
    await signIn?.create({ identifier: email });
    // ... handle magic link or OTP
  };
  
  return (
    <View className="flex-1 justify-center p-6">
      <Text className="text-2xl font-bold mb-4">Sign In</Text>
      <TextInput 
        placeholder="Enter your email"
        className="border rounded-lg p-3 mb-4"
      />
      <Button onPress={() => onSignInWithEmail(email)}>Continue</Button>
    </View>
  );
}
```

#### Backend Setup (Fastify)

```bash
npm install @clerk/fastify
```

```tsx
// server.ts
import { clerkPlugin } from '@clerk/fastify';

fastify.register(clerkPlugin, {
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
});

// Protected route example
fastify.get('/api/user/sessions', {
  onRequest: fastify.clerkVerify, // Verifies JWT token
}, async (request, reply) => {
  const userId = request.auth.userId; // Clerk user ID
  // ... fetch user's sessions
});
```

#### Updated Schema (with Clerk)

```tsx
// Add userId to sessions table
sessions: defineTable({
  userId: v.optional(v.string()), // Clerk user ID
  desktopId: v.string(),
  mobileConnected: v.boolean(),
  pairingCode: v.string(),
  selectedModel: v.union(
    v.literal("claude"),
    v.literal("gpt4o"),
    v.literal("gemini-pro"),
    v.literal("gemini-flash")
  ),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_pairing_code", ["pairingCode"])
  .index("by_desktop_id", ["desktopId"]),
```

**Clerk Auth Flow:**

```
1. User opens mobile app
2. Clerk shows sign-in (email magic link or OAuth)
3. User authenticates → gets JWT token
4. Mobile includes token in API requests
5. Backend verifies token with Clerk
6. Sessions are linked to userId
```

---

### Option 3: Simple Email-Only Auth (Middle Ground)

**Best for:** Want some identity without Clerk complexity

```tsx
// Simple email verification
POST /api/auth/send-code
Body: { email: string }
Response: { success: true }

POST /api/auth/verify
Body: { email: string, code: string }
Response: { token: string, userId: string }

// Use JWT for subsequent requests
Headers: { Authorization: 'Bearer <token>' }
```

**Implementation:**

- Store email + verification code in Convex
- Send code via email (Resend API - free tier)
- Generate simple JWT on verification
- No passwords, no OAuth complexity

**Setup Time:** ~30 minutes

---

### Decision Matrix

| Option | Setup Time | Demo Value | Recommendation |
| --- | --- | --- | --- |
| **No Auth** | 0 min | ⭐⭐⭐ | **Best for hackathon** |
| **Clerk** | 75 min | ⭐⭐ | Only if time permits |
| **Email-Only** | 30 min | ⭐⭐ | Good compromise |

### Our Recommendation

**For your 15-hour timeline: Skip auth entirely.**

Your pairing code system is clever and sufficient. In the demo, you can say:

> "We use a secure pairing code system - like how Apple AirDrop works. For production, we'd add user accounts, but for the demo, the pairing code provides session security and makes the experience instant."
> 

This turns the lack of traditional auth into a **feature** (instant access, no signup friction), not a bug.

**If judges specifically ask about user accounts:** "We can add Clerk in about an hour post-demo - it's a drop-in solution that handles OAuth, magic links, and user management."

---

## Architecture & Data Flow

### Pairing Flow

```
1. Desktop app starts → generates unique pairing code (e.g., "ABC123")
2. Mobile app → user enters pairing code
3. Backend → validates & creates session linking mobile ↔ desktop
4. Both apps now share a sessionId for communication
```

### Chat Flow (Screenshot)

```jsx
1. User types/speaks query on mobile ("How do I fix this error?")
2. Mobile sends request to backend: { sessionId, query, requestScreenshot: true }
3. Backend notifies desktop: "Capture screenshot now"
4. Desktop captures screenshot → uploads to backend
5. Backend sends to selected LLM: [screenshot + query]
6. LLM responds with analysis/instructions
7. Backend returns response to mobile
8. Mobile displays AI response in chat
```

### Video Recording Flow

```jsx
1. User taps "Start Recording" on mobile
2. Mobile → Backend → Desktop: "Start screen recording"
3. Desktop begins recording screen activity
4. User performs actions (login, encounter error, etc.)
5. User taps "Stop Recording" on mobile (max 30s)
6. Desktop stops recording → compresses video
7. Desktop uploads video to backend
8. User types question: "Why did I get this error?"
9. Backend sends video + query to Gemini 1.5 Pro
10. Gemini analyzes video flow and responds
11. Mobile displays AI response with video context
```

---

## API Endpoints

### Desktop → Backend

```tsx
// Register desktop & get pairing code
POST /api/desktop/register
Response: { desktopId: string, pairingCode: string }

// Upload screenshot
POST /api/desktop/:desktopId/screenshot
Body: FormData { screenshot: File }
Response: { screenshotUrl: string }

// Upload video recording
POST /api/desktop/:desktopId/video
Body: FormData { video: File, duration: number }
Response: { videoUrl: string }

// Poll for capture requests
GET /api/desktop/:desktopId/pending-requests
Response: { 
  requests: [{ 
    requestId: string, 
    type: 'screenshot' | 'start-recording' | 'stop-recording' 
  }] 
}
```

### Mobile → Backend

```tsx
// Pair with desktop using code
POST /api/mobile/pair
Body: { pairingCode: string }
Response: { sessionId: string, desktopId: string }

// Control recording
POST /api/recording/:sessionId/start
Response: { recordingId: string }

POST /api/recording/:sessionId/stop
Response: { videoUrl: string, duration: number }

// Send chat message
POST /api/chat/:sessionId/message
Body: { 
  message: string, 
  requestScreenshot?: boolean,
  videoUrl?: string,
  model?: 'claude' | 'gpt4o' | 'gemini-pro' | 'gemini-flash'
}
Response: { 
  messageId: string,
  aiResponse: string,
  mediaUrl?: string 
}

// Get chat history
GET /api/chat/:sessionId/messages
Response: { messages: Message[] }
```

---

## Convex Schema Implementation

```tsx
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    desktopId: v.string(),
    mobileConnected: v.boolean(),
    pairingCode: v.string(),
    selectedModel: v.union(
      v.literal("claude"),
      v.literal("gpt4o"),
      v.literal("gemini-pro"),
      v.literal("gemini-flash")
    ),
    createdAt: v.number(),
  })
    .index("by_pairing_code", ["pairingCode"])
    .index("by_desktop_id", ["desktopId"]),

  messages: defineTable({
    sessionId: 
```

---

## 15-Hour Development Timeline

### Phase 1: Setup (2 hours)

| Time | Task |
| --- | --- |
| 0:00 - 0:30 | Initialize Turborepo, configure TypeScript |
| 0:30 - 1:00 | Setup Expo app with basic navigation |
| 1:00 - 1:30 | Setup Electron app with Vite |
| 1:30 - 2:00 | Setup Fastify server, Convex connection |

### Phase 2: Core Backend (3 hours)

| Time | Task |
| --- | --- |
| 2:00 - 2:30 | Implement pairing endpoints |
| 2:30 - 3:00 | Implement screenshot upload endpoint |
| 3:00 - 3:30 | Implement video upload endpoint |
| 3:30 - 4:30 | Multi-model LLM integration (Gemini + Claude) |
| 4:30 - 5:00 | Implement chat message endpoint with model routing |

### Phase 3: Desktop App (3.5 hours)

| Time | Task |
| --- | --- |
| 5:00 - 5:30 | System tray setup, React UI with Tailwind |
| 5:30 - 6:00 | Screenshot capture implementation |
| 6:00 - 7:00 | Video recording (start/stop/compress) |
| 7:00 - 8:00 | Polling for requests, upload logic |
| 8:00 - 8:30 | Display pairing code UI, recording indicator |

### Phase 4: Mobile App (4 hours)

| Time | Task |
| --- | --- |
| 8:30 - 9:00 | Setup NativeWind (Tailwind) + basic screens |
| 9:00 - 9:30 | Pairing screen UI |
| 9:30 - 10:30 | Chat interface UI (messages, input, media) |
| 10:30 - 11:00 | Recording controls (start/stop buttons) |
| 11:00 - 11:30 | Model selector UI |
| 11:30 - 12:00 | TanStack Query integration |
| 12:00 - 12:30 | Polish UI, loading states, error handling |

### Phase 5: Integration & Demo Prep (2.5 hours)

| Time | Task |
| --- | --- |
| 12:30 - 13:30 | End-to-end testing (screenshot + video flows) |
| 13:30 - 14:00 | Demo flow preparation, test recordings |
| 14:00 - 15:00 | Buffer for issues, final polish |

---

## Quick Start Commands

```bash
# Initialize monorepo
npx create-turbo@latest desktop-ai-assistant
cd desktop-ai-assistant

# Add Expo app with NativeWind
cd apps
npx create-expo-app mobile --template expo-template-blank-typescript
cd mobile
npx expo install nativewind tailwindcss
npx tailwindcss init

# (OPTIONAL) Add Clerk to mobile if using auth
npm install @clerk/clerk-expo expo-secure-store

# Add Electron app with React + Tailwind
cd ..
npm create electron-vite@latest desktop -- --template react-ts
cd desktop
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Add Fastify server
cd ../server
npm init -y
npm install fastify @fastify/cors @fastify/multipart zod
npm install @anthropic-ai/sdk @google/generative-ai openai convex
npm install @ffmpeg/ffmpeg  # For video compression (optional)

# (OPTIONAL) Add Clerk to backend if using auth
npm install @clerk/fastify

# Install shared dependencies
cd ../.. 
npm install -D typescript @types/node
```

---

## Key Code Snippets

### Multi-Model LLM Service (Backend)

```tsx
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

type ModelType = 'claude' | 'gpt4o' | 'gemini-pro' | 'gemini-flash';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

async function analyzeMedia(
  model: ModelType,
  mediaBase64: string,
  mediaType: 'image' | 'video',
  userQuery: string
) {
  switch (model) {
    case 'gemini-pro':
    case 'gemini-flash': {
      const geminiModel = genAI.getGenerativeModel({
        model: model === 'gemini-pro' ? 'gemini-1.5-pro' : 'gemini-1.5-flash',
      });
      const result = await geminiModel.generateContent([
        {
          inlineData: {
            data: mediaBase64,
            mimeType: mediaType === 'video' ? 'video/mp4' : 'image/png',
          },
        },
        userQuery,
      ]);
      return result.response.text();
    }

    case 'claude': {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: mediaBase64,
                },
              },
              { type: 'text', text: userQuery },
            ],
          },
        ],
      });
      return response.content[0].text;
    }

    case 'gpt4o': {
      const response = await 
```

### Screenshot Capture (Electron)

```tsx
import { desktopCapturer, screen } from 'electron';

async function captureScreen(): Promise<string> {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height },
  });
  
  const screenshot = sources[0].thumbnail.toPNG();
  return screenshot.toString('base64');
}
```

### Video Recording (Electron)

```tsx
import { desktopCapturer } from 'electron';

let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];

async function startRecording() {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
  });
  
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: sources[0].id,
      },
    } as any,
  });
  
  recordedChunks = [];
  mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
  });
  
  mediaRecorder.ondataavailable = (e) => {
    if (
```

### TanStack Query Hook (Mobile)

```tsx
import { useMutation, useQuery } from '@tanstack/react-query';

export function useSendMessage(sessionId: string) {
  return useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch(`${API_URL}/chat/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, requestScreenshot: true }),
      });
      return res.json();
    },
  });
}
```

---

## Mobile App Wireframes

### Screen 1: Pairing Screen

```
┌─────────────────────────────────┐
│  ← Back      Desktop AI    ⚙️   │
├─────────────────────────────────┤
│                                 │
│                                 │
│         🖥️ 📱                   │
│                                 │
│    Connect to Your Desktop      │
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │   Enter Pairing Code      │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │      [  A  B  C  1  2  3  ]   │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │        CONNECT            │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  💡 Find the code in your       │
│     desktop app's system tray   │
│                                 │
└─────────────────────────────────┘
```

### Screen 2: Chat Screen (Idle)

```
┌─────────────────────────────────┐
│  ⋮    Desktop Assistant     🔌  │
│                                 │
│  Model: [Gemini Flash ▼]        │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐    │
│  │ How can I help?         │ 🤖 │
│  │ Connect and ask me      │    │
│  │ anything about your     │    │
│  │ computer!               │    │
│  └─────────────────────────┘    │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
├─────────────────────────────────┤
│ 🎤  ⏺  📸  │ Type message... ➤ │
└─────────────────────────────────┘
```

### Screen 3: Chat with Screenshot

```
┌─────────────────────────────────┐
│  ⋮    Desktop Assistant     🔌  │
│                                 │
│  Model: [Claude 3.5 ▼]          │
├─────────────────────────────────┤
│                                 │
│                           ┌───┐ │
│  How do I enable         │You│ │
│  dark mode?              └───┘ │
│  [📸 Screenshot attached]       │
│                                 │
│  ┌─────────────────────────┐    │
│  │ To enable dark mode:    │ 🤖 │
│  │ 1. Click Settings       │    │
│  │ 2. Go to Appearance     │    │
│  │ 3. Select "Dark" theme  │    │
│  │ [View Screenshot]       │    │
│  └─────────────────────────┘    │
│                                 │
├─────────────────────────────────┤
│ 🎤  ⏺  📸  │ Type message... ➤ │
└─────────────────────────────────┘
```

### Screen 4: Recording in Progress

```
┌─────────────────────────────────┐
│  ⋮    Desktop Assistant     🔌  │
│                                 │
│  Model: [Gemini Pro ▼]          │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐    │
│  │  🔴 Recording...        │    │
│  │                         │    │
│  │      00:12 / 00:30      │    │
│  │                         │    │
│  │  ┌─────────────────┐    │    │
│  │  │                 │    │    │
│  │  │   STOP REC ⏹    │    │    │
│  │  │                 │    │    │
│  │  └─────────────────┘    │    │
│  │                         │    │
│  │  Perform your actions   │    │
│  │  on the desktop...      │    │
│  └─────────────────────────┘    │
│                                 │
├─────────────────────────────────┤
│ 🎤  ⏺  📸  │ Disabled...     ➤ │
└─────────────────────────────────┘
```

### Screen 5: Video Analysis

```
┌─────────────────────────────────┐
│  ⋮    Desktop Assistant     🔌  │
│                                 │
│  Model: [Gemini Pro ▼]          │
├─────────────────────────────────┤
│                           ┌───┐ │
│  Why did I get this      │You│ │
│  login error?            └───┘ │
│  [🎬 Video: 12s]                │
│                                 │
│  ┌─────────────────────────┐    │
│  │ Analyzing video...      │ 🤖 │
│  │ ▓▓▓▓▓▓░░░░░░░░  45%    │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ I see the issue:        │ 🤖 │
│  │ You entered the wrong   │    │
│  │ username format. The    │    │
│  │ system expects email    │    │
│  │ address, not username.  │    │
│  │ [▶️ Replay Video]       │    │
│  └─────────────────────────┘    │
│                                 │
├─────────────────────────────────┤
│ 🎤  ⏺  📸  │ Type message... ➤ │
└─────────────────────────────────┘
```

---

## Mobile UI Plan (NativeWind/Tailwind)

### Screen Structure

**1. Pairing Screen**

- Large input field for pairing code
- "Connect" button
- Status indicator

**2. Chat Screen**

- Header with model selector dropdown
- Message list (user/assistant bubbles)
- Media previews (screenshots/video thumbnails)
- Bottom input bar with:
    - Text input
    - Voice button
    - Recording button (start/stop)
    - Screenshot button
    - Send button

**3. Recording Controls**

- Large START/STOP button (color changes red when recording)
- Timer display
- "Recording in progress" indicator

```tsx
// Example Tailwind classes for mobile (NativeWind)
<View className="flex-1 bg-gray-50">
  <View className="bg-white border-b border-gray-200 p-4">
    <Text className="text-lg font-bold">Desktop Assistant</Text>
    <Picker className="mt-2 border rounded-lg">
      <Picker.Item label="Gemini Flash (Fast)" value="gemini-flash" />
      <Picker.Item label="Gemini Pro (Video)" value="gemini-pro" />
      <Picker.Item label="Claude 3.5" value="claude" />
      <Picker.Item label="GPT-4o" value="gpt4o" />
    </Picker>
  </View>
  
  <ScrollView className="flex-1 p-4">
    {/* Chat messages */}
  </ScrollView>
  
  <View className="flex-row items-center gap-2 p-4 bg-white border-t">
    <TouchableOpacity className="p-3 bg-blue-500 rounded-full">
      <Text>🎤</Text>
    </TouchableOpacity>
    <TouchableOpacity 
      className={`p-3 rounded-full ${recording ? 'bg-red-500' : 'bg-gray-300'}`}
      onPress={toggleRecording}
    >
      <Text>{recording ? '⏹' : '⏺'}</Text>
    </TouchableOpacity>
    <TextInput className="flex-1 border rounded-full px-4 py-2" />
    <TouchableOpacity className="p-3 bg-blue-500 rounded-full">
      <Text>📸</Text>
    </TouchableOpacity>
  </View>
</View>
```

---

## Desktop App UI Wireframes

### System Tray Window (Pairing)

```
┌─────────────────────────────────┐
│  Desktop AI Assistant       ✕   │
├─────────────────────────────────┤
│                                 │
│         Pairing Code            │
│                                 │
│      ┌─────────────────┐        │
│      │                 │        │
│      │   A B C 1 2 3   │        │
│      │                 │        │
│      └─────────────────┘        │
│                                 │
│  📱 Enter this code in your     │
│     mobile app to connect       │
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │    Generate New Code      │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  Status: ⚪ Waiting...          │
│                                 │
└─────────────────────────────────┘
```

### System Tray Window (Connected)

```
┌─────────────────────────────────┐
│  Desktop AI Assistant       ✕   │
├─────────────────────────────────┤
│                                 │
│  Status: 🟢 Connected           │
│                                 │
│  Session: ABC123                │
│  Device: iPhone 14 Pro          │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  Recent Activity:               │
│                                 │
│  📸 Screenshot captured         │
│     2 minutes ago               │
│                                 │
│  🎬 Recording: 12s              │
│     5 minutes ago               │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  ┌─────────────┐ ┌───────────┐  │
│  │ Disconnect  │ │ Settings  │  │
│  └─────────────┘ └───────────┘  │
│                                 │
└─────────────────────────────────┘
```

### System Tray Window (Recording)

```
┌─────────────────────────────────┐
│  Desktop AI Assistant       ✕   │
├─────────────────────────────────┤
│                                 │
│  🔴 RECORDING IN PROGRESS       │
│                                 │
│      ┌─────────────────┐        │
│      │                 │        │
│      │    00:12:45     │        │
│      │                 │        │
│      └─────────────────┘        │
│                                 │
│  Recording your screen...       │
│  Waiting for stop signal        │
│  from mobile app                │
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │   EMERGENCY STOP ⏹        │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

### System Tray Icon States

```
Idle:       🖥️  (gray)
Connected:  🖥️  (blue)
Recording:  🔴  (red, pulsing)
Uploading:  ⬆️  (green)
```

---

## Convex Database Schema (Visual)

### Tables Overview

```
┌──────────────────────────────────────────────────────────┐
│                     SESSIONS TABLE                       │
├──────────────────────────────────────────────────────────┤
│  _id              │ string (auto)                        │
│  desktopId        │ string (unique)                      │
│  mobileConnected  │ boolean                              │
│  pairingCode      │ string (6 chars, uppercase)          │
│  selectedModel    │ 'claude' | 'gpt4o' | 'gemini-...'   │
│  createdAt        │ number (timestamp)                   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                     MESSAGES TABLE                       │
├──────────────────────────────────────────────────────────┤
│  _id              │ string (auto)                        │
│  sessionId        │ Id<"sessions"> (foreign key)         │
│  role             │ 'user' | 'assistant'                 │
│  content          │ string (message text)                │
│  mediaType        │ 'screenshot' | 'video' | null        │
│  mediaUrl         │ string (Convex storage URL) | null   │
│  model            │ string (which LLM was used)          │
│  createdAt        │ number (timestamp)                   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                    RECORDINGS TABLE                      │
├──────────────────────────────────────────────────────────┤
│  _id              │ string (auto)                        │
│  sessionId        │ Id<"sessions"> (foreign key)         │
│  storageId        │ Id<"_storage"> (Convex file)         │
│  duration         │ number (seconds)                     │
│  status           │ 'recording' | 'processing' | 'ready' │
│  createdAt        │ number (timestamp)                   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                 PENDING_REQUESTS TABLE                   │
├──────────────────────────────────────────────────────────┤
│  _id              │ string (auto)                        │
│  desktopId        │ string (foreign key)                 │
│  requestType      │ 'screenshot' | 'start-rec' | 'stop-rec' │
│  processed        │ boolean                              │
│  createdAt        │ number (timestamp)                   │
└──────────────────────────────────────────────────────────┘
```

### Relationships

```
   SESSIONS
       │
       ├─────────────┬─────────────────┐
       │             │                 │
       ▼             ▼                 ▼
   MESSAGES     RECORDINGS    PENDING_REQUESTS
       │             │
       │             │
       ▼             ▼
(media files)  (video files)
  _storage        _storage
```

### Example Data Flow

```tsx
// 1. Desktop registers
sessions.insert({
  desktopId: "desktop_abc123",
  mobileConnected: false,
  pairingCode: "ABC123",
  selectedModel: "gemini-flash",
  createdAt: 
```

---

## Deployment Options

| Platform | Setup Time | Cost | Pros | Cons |
| --- | --- | --- | --- | --- |
| **Railway** | 5 min | $5 trial credit | One-click deploy, WebSocket support, good for demos | Credit card required |
| **Render** | 10 min | Free tier | Free, no CC needed, good uptime | Cold starts (slow first request) |
| [**Fly.io**](http://Fly.io) | 10 min | Free tier ($5 credit) | Fast, global edge, Dockerfile support | Requires CC for verification |
| **ngrok** (dev) | 2 min | Free | ⭐ **Fastest for hackathon**, no deploy needed | Temporary URL, local machine must run |

### **Recommendation: Use ngrok for Demo**

For a hackathon, **ngrok** is perfect:

```bash
# Run your server locally
cd apps/server
npm run dev  # Runs on 
```

**Why ngrok for hackathon:**

- Setup in 2 minutes
- No deployment issues
- No cold starts
- Easy debugging (logs on your machine)
- Works with Convex, LLM APIs without config

**Backup:** If you want a "real" deployment for the demo, use **Railway** (fastest cloud deploy).

---

## Demo Script Suggestions

<aside>
🎬

**Demo Flow (4-6 minutes)**

1. **Show desktop app** → "Our desktop companion runs in the system tray"
2. **Show pairing** → "Enter the code on mobile to connect"
3. **Screenshot demo** → "I'll ask: 'How do I enable dark mode?'" (instant screenshot)
4. **Show AI response** → "Gemini analyzes and gives me steps"
5. **Video recording demo** → "Now I'll press Start Recording..."
6. **Perform action** → Login to an app, encounter an error
7. **Stop recording** → "Stop, and ask: 'Why did I get this login error?'"
8. **Show video analysis** → "Gemini watches the video and identifies the issue"
9. **Model switching** → "We support Claude, GPT, and Gemini — switch anytime"
</aside>

---

## Prize Categories to Target

Based on your project, consider targeting:

| Prize | Fit | Notes |
| --- | --- | --- |
| **Most Overengineered use of AI** | ⭐⭐⭐ | Multi-platform AI vision assistant |
| **Most Socially Useful Hack** | ⭐⭐ | Helps non-tech users troubleshoot |
| **Top 8** | ⭐⭐ | Novel concept, good execution |

---

## Resources & Links

- [Turborepo Docs](https://turbo.build/repo/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [Electron Quick Start](https://www.electronjs.org/docs/latest/tutorial/quick-start)
- [Fastify Documentation](https://fastify.dev/docs/latest/)
- [Anthropic Claude API](https://docs.anthropic.com/en/docs/build-with-claude/vision)
- [Convex Documentation](https://docs.convex.dev/)
- [TanStack Query](https://tanstack.com/query/latest)

---

## Team Task Assignment (2 People)

| Person | Responsibilities | Key Deliverables |
| --- | --- | --- |
| **Person 1: Mobile** | Expo app with NativeWind | - Pairing screen

- Chat UI with Tailwind

- Recording controls (start/stop buttons)

- Model selector

- Voice input integration

- TanStack Query for API calls
 |
| **Person 2: Desktop + Backend** | Electron app + Fastify server | **Electron:**

- System tray app

- Screenshot capture

- Video recording (start/stop)

- Polling & upload logic

- React UI with Tailwind

**Backend:**

- Fastify server setup

- Pairing endpoints

- Multi-model LLM routing

- File upload handling

- Convex integration
 |

### Coordination Points

- **Hour 2:** Agree on API contract (endpoints, schemas)
- **Hour 8:** First integration test (pairing + screenshot)
- **Hour 12:** Video recording integration test
- **Hour 13:** Final integration, start demo prep

---

*Good luck at Hack&Roll 2026! 🚀*