import { useState } from 'react'
import type { ChatMessage } from '../types/chat'

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const [showMediaFullscreen, setShowMediaFullscreen] = useState(false)

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 items-end gap-2`}>
      {/* Assistant Avatar */}
      {isAssistant && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-xs">C</span>
        </div>
      )}

      <div
        className={`max-w-[75%] rounded-xl px-4 py-3 relative ${
          isUser
            ? 'bg-black/40 border-2 border-purple-500/50'
            : 'bg-black/40 border-2 border-blue-500/50'
        } backdrop-blur-sm ${
          isUser ? 'glow-purple-blue' : ''
        }`}
        style={{
          boxShadow: isUser
            ? '0 0 20px rgba(147, 51, 234, 0.3), 0 0 40px rgba(59, 130, 246, 0.2)'
            : '0 0 20px rgba(59, 130, 246, 0.3), 0 0 40px rgba(147, 51, 234, 0.2)',
        }}
      >
        {/* Message content */}
        <div className="text-sm text-white whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
        </div>

        {/* Media preview */}
        {message.mediaType && message.mediaUrl && (
          <div className="mt-3 rounded-lg overflow-hidden border border-white/20">
            {message.mediaType === 'screenshot' && (
              <>
                {!showMediaFullscreen ? (
                  <div className="relative">
                    <img
                      src={message.mediaUrl}
                      alt="Screenshot"
                      className="w-full h-auto max-h-64 object-contain bg-black/50"
                    />
                    <button
                      onClick={() => setShowMediaFullscreen(true)}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors group"
                    >
                      <span className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Tap to view
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
                    <button
                      onClick={() => setShowMediaFullscreen(false)}
                      className="absolute top-4 right-4 text-white hover:text-white/70 transition-colors p-2"
                      aria-label="Close"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <img
                      src={message.mediaUrl}
                      alt="Screenshot"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
              </>
            )}
            {message.mediaType === 'video' && (
              <>
                {!showMediaFullscreen ? (
                  <div className="relative">
                    <video
                      src={message.mediaUrl}
                      controls
                      className="w-full h-auto max-h-64 bg-black/50"
                      preload="metadata"
                    >
                      Your browser does not support the video tag.
                    </video>
                    <button
                      onClick={() => setShowMediaFullscreen(true)}
                      className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      Tap to view
                    </button>
                  </div>
                ) : (
                  <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
                    <button
                      onClick={() => setShowMediaFullscreen(false)}
                      className="absolute top-4 right-4 text-white hover:text-white/70 transition-colors p-2"
                      aria-label="Close"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <video
                      src={message.mediaUrl}
                      controls
                      autoPlay
                      className="max-w-full max-h-full"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Media type indicator (if no URL) */}
        {message.mediaType && !message.mediaUrl && (
          <div className="mt-2 text-xs text-white/60 flex items-center gap-1">
            {message.mediaType === 'screenshot' && '📸 Screenshot attached'}
            {message.mediaType === 'video' && '🎥 Video attached'}
          </div>
        )}
      </div>

      {/* User indicator (right side) */}
      {isUser && (
        <div className="text-xs text-white/40 flex-shrink-0">You</div>
      )}
    </div>
  )
}
