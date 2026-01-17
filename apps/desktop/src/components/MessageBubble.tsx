import { useState, useRef, useEffect } from 'react'
import type { ChatMessage } from '../types/chat'

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const [showMediaFullscreen, setShowMediaFullscreen] = useState(false)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Get video duration when video loads
  useEffect(() => {
    if (message.mediaType === 'video' && videoRef.current) {
      const video = videoRef.current
      const handleLoadedMetadata = () => {
        if (video.duration && isFinite(video.duration)) {
          setVideoDuration(Math.round(video.duration))
        }
      }
      video.addEventListener('loadedmetadata', handleLoadedMetadata)
      return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [message.mediaType, message.mediaUrl])

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
          {message.mediaType === 'video' && videoDuration !== null && (
            <div className="mt-2 flex items-center gap-2 text-xs text-white/70">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span>[Video: {videoDuration}s]</span>
            </div>
          )}
        </div>

        {/* Media preview */}
        {message.mediaType && (
          <div className="mt-3 rounded-lg overflow-hidden border border-white/20">
            {message.mediaType === 'screenshot' && message.mediaUrl && (
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
                {message.mediaUrl ? (
                  <>
                    {!showMediaFullscreen ? (
                      <div className="relative">
                        <video
                          ref={videoRef}
                          src={message.mediaUrl}
                          controls
                          className="w-full h-auto max-h-64 bg-black/50 rounded"
                          preload="metadata"
                        >
                          Your browser does not support the video tag.
                        </video>
                        <button
                          onClick={() => setShowMediaFullscreen(true)}
                          className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          View Video
                        </button>
                      </div>
                    ) : (
                      <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
                        <button
                          onClick={() => setShowMediaFullscreen(false)}
                          className="absolute top-4 right-4 text-white hover:text-white/70 transition-colors p-2 bg-black/50 rounded-full"
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
                ) : (
                  <div className="p-4 bg-black/30 rounded text-center">
                    <p className="text-sm text-white/60">🎥 Video was uploaded (preview not available after reload)</p>
                  </div>
                )}
              </>
            )}
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
