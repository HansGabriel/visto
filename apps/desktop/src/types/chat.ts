// Chat types for desktop app

export interface ChatMessage {
  messageId: string
  role: 'user' | 'assistant'
  content: string
  mediaType?: 'screenshot' | 'video' | null
  mediaUrl?: string
  createdAt: number
}

export interface SendMessageRequest {
  message: string
  requestScreenshot?: boolean
  screenshotUrl?: string
  videoUrl?: string
  storageId?: string // Convex storage ID for media
}

export interface SendMessageResponse {
  messageId: string
  aiResponse?: string
  status: string
}

export interface GetMessagesResponse {
  messages: ChatMessage[]
}
