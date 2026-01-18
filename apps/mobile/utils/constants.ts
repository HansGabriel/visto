// API Configuration
// Use the network address provided, or fallback to localhost for development
// Note: Server runs on port 3000, not 8081 (8081 is Expo dev server)
export const API_URL = process.env.EXPO_PUBLIC_API_URL || ''

// Polling interval for message updates (in milliseconds)
export const POLLING_INTERVAL = 3000;

// API Endpoints
export const API_ENDPOINTS = {
  MOBILE_PAIR: `${API_URL}/api/mobile/pair`,
  RECORDING_START: (sessionId: string) => `${API_URL}/api/recording/${sessionId}/start`,
  RECORDING_STOP: (sessionId: string) => `${API_URL}/api/recording/${sessionId}/stop`,
  CHAT_SEND_MESSAGE: (sessionId: string) => `${API_URL}/api/chat/${sessionId}/message`,
  CHAT_GET_MESSAGES: (sessionId: string) => `${API_URL}/api/chat/${sessionId}/messages`,
  CHAT_REQUEST_SCREENSHOT: (sessionId: string) => `${API_URL}/api/chat/${sessionId}/request-screenshot`,
  CHAT_GET_SCREENSHOT_RESULT: (sessionId: string, requestId: string) => `${API_URL}/api/chat/${sessionId}/screenshot-result/${requestId}`,
} as const;
