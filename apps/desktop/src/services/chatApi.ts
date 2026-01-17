import { API_URL } from '../utils/constants'
import type {
  ChatMessage,
  SendMessageRequest,
  SendMessageResponse,
  GetMessagesResponse,
} from '../types/chat'

// Chat API endpoints
const CHAT_ENDPOINTS = {
  SEND_MESSAGE: (sessionId: string) => `${API_URL}/api/chat/${sessionId}/message`,
  GET_MESSAGES: (sessionId: string) => `${API_URL}/api/chat/${sessionId}/messages`,
} as const

/**
 * Send a chat message
 */
export async function sendMessage(
  sessionId: string,
  request: SendMessageRequest
): Promise<SendMessageResponse> {
  const response = await fetch(CHAT_ENDPOINTS.SEND_MESSAGE(sessionId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to send message' }))
    throw new Error(error.error || `Failed to send message: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get chat message history
 */
export async function getMessages(sessionId: string): Promise<GetMessagesResponse> {
  const response = await fetch(CHAT_ENDPOINTS.GET_MESSAGES(sessionId), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to get messages' }))
    throw new Error(error.error || `Failed to get messages: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Poll for new messages (optional - for real-time updates)
 * Returns messages if there are new ones, null otherwise
 */
export async function pollForMessages(
  sessionId: string,
  lastMessageId?: string
): Promise<ChatMessage[] | null> {
  try {
    const response = await getMessages(sessionId)
    
    // If we have a lastMessageId, filter for new messages only
    if (lastMessageId) {
      const lastMessageIndex = response.messages.findIndex(
        (msg) => msg.messageId === lastMessageId
      )
      
      if (lastMessageIndex !== -1 && lastMessageIndex < response.messages.length - 1) {
        return response.messages.slice(lastMessageIndex + 1)
      }
      
      return null
    }
    
    return response.messages
  } catch (error) {
    console.error('Failed to poll for messages:', error)
    return null
  }
}
