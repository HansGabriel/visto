// API types matching server contracts and desktop app types

export interface PairRequest {
  pairingCode: string;
}

export interface PairResponse {
  sessionId: string;
  desktopId: string;
}

export interface ChatMessage {
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  mediaType?: 'screenshot' | 'video' | null;
  mediaUrl?: string;
  storageId?: string; // Convex storage ID for media
  createdAt: number;
}

export interface SendMessageRequest {
  message: string;
  requestScreenshot?: boolean;
  screenshotUrl?: string;
  videoUrl?: string;
  storageId?: string; // Convex storage ID for media
}

export interface SendMessageResponse {
  messageId: string;
  aiResponse?: string;
  status: string;
}

export interface GetMessagesResponse {
  messages: ChatMessage[];
}

export interface StartRecordingResponse {
  recordingId: string;
  status: string;
}

export interface StopRecordingResponse {
  status: string;
}
