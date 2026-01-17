export interface Session {
  desktopId: string;
  mobileConnected: boolean;
  pairingCode: string;
  userId?: string;
  createdAt: number;
}

export interface Message {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  mediaType?: "screenshot" | "video" | null;
  mediaStorageId?: string;
  mediaUrl?: string;
  createdAt: number;
}

export interface PendingRequest {
  desktopId: string;
  requestType: "screenshot" | "start-recording" | "stop-recording";
  processed: boolean;
  createdAt: number;
}

export interface RegisterDesktopResponse {
  desktopId: string;
  pairingCode: string;
}

export interface PairResponse {
  sessionId: string;
  desktopId: string;
}

export interface PendingRequestsResponse {
  requests: Array<{
    requestId: string;
    type: "screenshot" | "start-recording" | "stop-recording";
    createdAt: number;
  }>;
}

export interface MessageResponse {
  messageId: string;
  aiResponse?: string;
  status: string;
}
