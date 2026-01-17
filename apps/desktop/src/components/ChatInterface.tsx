import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import type { ChatMessage } from '../types/chat'

interface ChatInterfaceProps {
  messages: ChatMessage[]
  onSendMessage: (message: string, requestScreenshot?: boolean) => Promise<void>
  isLoading?: boolean
  isSending?: boolean
  sessionId: string | null
}

export function ChatInterface({
  messages,
  onSendMessage,
  isLoading = false,
  isSending = false,
  sessionId,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-screen w-full relative overflow-hidden bg-cosmic">
      {/* Cosmic background stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${Math.random() * 3 + 2}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur-sm border-b border-white/10">
        <button
          onClick={() => window.history.back()}
          className="text-white/60 hover:text-white transition-colors p-2"
          aria-label="Back"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          {/* App Logo */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <h1 className="text-lg font-semibold text-white">Desktop Assistant</h1>
          <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Model Selector */}
      <div className="relative z-10 px-4 py-2 bg-black/30 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-2 text-sm text-white/70">
          <span>Model: Gemini Flash</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Messages area */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {!sessionId && (
          <div className="flex items-center justify-center h-full text-white/50">
            <div className="text-center">
              <p className="text-lg mb-2">No session available</p>
              <p className="text-sm">Waiting for desktop registration...</p>
            </div>
          </div>
        )}

        {sessionId && messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full text-white/50">
            <div className="text-center max-w-xs">
              <p className="text-xl mb-3">How can I help?</p>
              <p className="text-sm text-white/60">Connect and ask me anything about your computer!</p>
            </div>
          </div>
        )}

        {isLoading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-white/60">Loading messages...</p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.messageId} message={message} />
        ))}

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      {sessionId && (
        <div className="relative z-10 border-t border-white/10 bg-black/40 backdrop-blur-sm">
          <ChatInput
            onSendMessage={onSendMessage}
            isDisabled={!sessionId}
            isSending={isSending}
          />
        </div>
      )}
    </div>
  )
}
