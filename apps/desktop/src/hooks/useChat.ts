import { useState, useEffect, useCallback } from 'react'
import { sendMessage, getMessages, pollForMessages } from '../services/chatApi'
import type { ChatMessage, SendMessageRequest } from '../types/chat'

interface UseChatOptions {
  sessionId: string | null
  enablePolling?: boolean
  pollingInterval?: number
}

export function useChat(sessionIdOrOptions: string | null | UseChatOptions) {
  // Support both object and string (sessionId) as parameter
  const config: UseChatOptions = 
    typeof sessionIdOrOptions === 'string' || sessionIdOrOptions === null
      ? { sessionId: sessionIdOrOptions, enablePolling: false, pollingInterval: 3000 }
      : { enablePolling: false, pollingInterval: 3000, ...sessionIdOrOptions }

  const { sessionId, enablePolling, pollingInterval } = config

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load messages when sessionId changes
  const loadMessages = useCallback(async () => {
    if (!sessionId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await getMessages(sessionId)
      setMessages(response.messages)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages'
      setError(errorMessage)
      console.error('Failed to load messages:', err)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  // Load messages on mount and when sessionId changes
  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  // Optional polling for new messages
  useEffect(() => {
    if (!sessionId || !enablePolling) return

    const interval = setInterval(async () => {
      const lastMessage = messages[messages.length - 1]
      const newMessages = await pollForMessages(
        sessionId,
        lastMessage?.messageId
      )

      if (newMessages && newMessages.length > 0) {
        setMessages((prev) => [...prev, ...newMessages])
      }
    }, pollingInterval)

    return () => clearInterval(interval)
  }, [sessionId, enablePolling, pollingInterval, messages])

  // Send a message
  const send = useCallback(
    async (
      content: string,
      requestScreenshot?: boolean,
      screenshotUrl?: string,
      videoUrl?: string,
      mediaPreviewUrl?: string,
      storageId?: string
    ) => {
      if (!sessionId) {
        throw new Error('No session ID available')
      }

      if (!content.trim() && !screenshotUrl && !videoUrl) {
        throw new Error('Message content or media is required')
      }

      setIsSending(true)
      setError(null)

      try {
        const request: SendMessageRequest = {
          message: content.trim() || (screenshotUrl ? 'Screenshot' : videoUrl ? 'Video recording' : ''),
          requestScreenshot,
          screenshotUrl,
          videoUrl,
          storageId, // Pass Convex storage ID
        }

        // Determine media type and URL for optimistic update
        const mediaType: 'screenshot' | 'video' | null = screenshotUrl
          ? 'screenshot'
          : videoUrl
          ? 'video'
          : null
        const mediaUrl = mediaPreviewUrl || screenshotUrl || videoUrl

        // Add user message optimistically with media preview
        const userMessage: ChatMessage = {
          messageId: `temp-${Date.now()}`,
          role: 'user',
          content: content.trim() || (screenshotUrl ? 'Screenshot' : videoUrl ? 'Video recording' : ''),
          mediaType,
          mediaUrl,
          createdAt: Date.now(),
        }
        setMessages((prev) => [...prev, userMessage])

        const response = await sendMessage(sessionId, request)

        // Reload messages to get the actual message IDs and AI response
        await loadMessages()

        return response
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
        setError(errorMessage)
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((msg) => !msg.messageId.startsWith('temp-')))
        throw err
      } finally {
        setIsSending(false)
      }
    },
    [sessionId, loadMessages]
  )

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage: send,
    loadMessages,
    clearMessages,
  }
}
