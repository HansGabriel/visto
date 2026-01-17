import { useState, KeyboardEvent, useRef, useEffect } from 'react'

interface ScreenshotPreview {
  previewUrl: string
  screenshotUrl: string
  storageId?: string
}

interface VideoPreview {
  previewUrl: string
  videoUrl: string
  duration?: number
  storageId?: string
}

interface ChatInputProps {
  onSendMessage: (message: string, requestScreenshot?: boolean, screenshotUrl?: string, videoUrl?: string, mediaPreviewUrl?: string, storageId?: string) => Promise<void>
  onCaptureScreenshot?: () => Promise<ScreenshotPreview | null>
  onStartRecording?: () => Promise<void>
  onStopRecording?: () => Promise<VideoPreview | null>
  isDisabled?: boolean
  isSending?: boolean
  isCapturing?: boolean
  isRecording?: boolean
  placeholder?: string
}

export function ChatInput({
  onSendMessage,
  onCaptureScreenshot,
  onStartRecording,
  onStopRecording,
  isDisabled = false,
  isSending = false,
  isCapturing = false,
  isRecording = false,
  placeholder = 'Type a message...',
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const [screenshotPreview, setScreenshotPreview] = useState<ScreenshotPreview | null>(null)
  const [videoPreview, setVideoPreview] = useState<VideoPreview | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowAttachmentMenu(false)
      }
    }

    if (showAttachmentMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAttachmentMenu])

  const handleSend = async () => {
    if ((!message.trim() && !screenshotPreview && !videoPreview) || isDisabled || isSending) return

    try {
      // If video preview exists but videoUrl or storageId is not ready, wait for it (up to 30 seconds)
      let videoUrl = videoPreview?.videoUrl
      let storageId = videoPreview?.storageId
      
      if (videoPreview && (!videoUrl || !storageId)) {
        console.log('📹 ChatInput: Video upload in progress, waiting for videoUrl and storageId...', {
          hasVideoUrl: !!videoUrl,
          hasStorageId: !!storageId,
        })
        // Poll for videoUrl and storageId by calling onStopRecording again (it will return the updated result)
        if (onStopRecording) {
          for (let i = 0; i < 300; i++) {
            await new Promise(resolve => setTimeout(resolve, 100))
            try {
              const updatedResult = await onStopRecording()
              if (updatedResult) {
                // Update videoUrl if we got it
                if (updatedResult.videoUrl && !videoUrl) {
                  videoUrl = updatedResult.videoUrl
                  console.log('📹 ChatInput: Video URL received after waiting', i + 1, 'iterations')
                }
                // Update storageId if we got it
                if (updatedResult.storageId && !storageId) {
                  storageId = updatedResult.storageId
                  console.log('📹 ChatInput: Storage ID received after waiting', i + 1, 'iterations')
                }
                
                // Only update state once per iteration to avoid race conditions
                // Use functional update to ensure we have the latest state
                setVideoPreview((prev) => {
                  if (!prev) return prev
                  const newPreview = {
                    ...prev,
                    videoUrl: updatedResult.videoUrl || prev.videoUrl || '',
                    storageId: updatedResult.storageId || prev.storageId,
                  }
                  // Only update if something actually changed
                  if (newPreview.videoUrl !== prev.videoUrl || newPreview.storageId !== prev.storageId) {
                    return newPreview
                  }
                  return prev
                })
                
                // Break if we have both videoUrl and storageId (or at least videoUrl)
                if (videoUrl && storageId) {
                  console.log('📹 ChatInput: Both videoUrl and storageId are ready')
                  break
                }
              }
            } catch (error) {
              console.error('📹 ChatInput: Error polling for video result:', error)
              // Continue polling on error
            }
          }
          if (!videoUrl && !storageId) {
            console.warn('📹 ChatInput: Video upload timed out, sending without videoUrl and storageId')
          } else if (!storageId) {
            console.warn('📹 ChatInput: Video upload completed but storageId is missing')
          }
        }
      }

      await onSendMessage(
        message.trim() || (screenshotPreview ? 'Screenshot' : videoPreview ? 'Video recording' : ''),
        false,
        screenshotPreview?.screenshotUrl,
        videoUrl, // Use the potentially updated videoUrl
        screenshotPreview?.previewUrl || videoPreview?.previewUrl,
        screenshotPreview?.storageId || storageId || videoPreview?.storageId // Pass storage ID (prefer updated one)
      )
      setMessage('')
      setScreenshotPreview(null)
      setVideoPreview(null)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleScreenshot = async () => {
    setShowAttachmentMenu(false)
    if (onCaptureScreenshot) {
      try {
        const result = await onCaptureScreenshot()
        if (result) {
          setScreenshotPreview(result)
        }
      } catch (error) {
        console.error('Failed to capture screenshot:', error)
      }
    }
  }

  const handleRemoveScreenshot = () => {
    setScreenshotPreview(null)
  }

  const handleRemoveVideo = () => {
    if (videoPreview?.previewUrl) {
      URL.revokeObjectURL(videoPreview.previewUrl)
    }
    setVideoPreview(null)
  }

  const handleStartRecording = async () => {
    setShowAttachmentMenu(false)
    if (onStartRecording) {
      try {
        await onStartRecording()
      } catch (error) {
        console.error('Failed to start recording:', error)
      }
    }
  }

  // Handle stop recording - called from RecordingOverlay
  // When recording stops (isRecording becomes false), get the preview
  const previousIsRecordingRef = useRef(isRecording)
  
  useEffect(() => {
    const previousIsRecording = previousIsRecordingRef.current
    previousIsRecordingRef.current = isRecording

    // If recording just stopped (was true, now false) and we don't have a preview yet
    if (previousIsRecording && !isRecording && onStopRecording && !videoPreview) {
      // Wait longer to ensure RecordingOverlay has finished stopping, uploading, and storing the result
      // Video upload can take time for large files
      const timer = setTimeout(async () => {
        try {
          console.log('📹 ChatInput: Fetching video preview after recording stopped...')
          const result = await onStopRecording()
          if (result) {
            console.log('📹 ChatInput: Video preview received:', result)
            setVideoPreview(result)
          } else {
            console.warn('📹 ChatInput: No video preview result returned')
          }
        } catch (error) {
          console.error('📹 ChatInput: Failed to stop recording and get preview:', error)
        }
      }, 1000) // Increased delay to ensure upload completes

      return () => clearTimeout(timer)
    }
  }, [isRecording, onStopRecording, videoPreview])

  return (
    <div className="flex flex-col gap-2 p-4">
      {/* Input row */}
      <div className="flex items-center gap-3">
        {/* Attachment button (+ icon) */}
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            disabled={isDisabled || isSending || isCapturing || isRecording}
            className={`w-10 h-10 rounded-lg border border-white/20 bg-black/40 hover:bg-black/60 active:scale-95 transition-all flex items-center justify-center flex-shrink-0 ${
              isDisabled || isSending || isCapturing || isRecording
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
            }`}
            aria-label="Attach file"
          >
            {isCapturing ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>

          {/* Attachment menu */}
          {showAttachmentMenu && !isCapturing && !isRecording && (
            <div
              ref={menuRef}
              className="absolute bottom-full left-0 mb-2 w-48 bg-black/90 border border-white/20 rounded-lg shadow-lg backdrop-blur-sm z-50 overflow-hidden"
            >
              <button
                onClick={handleScreenshot}
                disabled={isDisabled || isSending || isCapturing}
                className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>Take Screenshot</span>
              </button>
              <button
                onClick={handleStartRecording}
                disabled={isDisabled || isSending || isRecording}
                className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span>Record Video</span>
              </button>
            </div>
          )}
        </div>

        {/* Message input */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={screenshotPreview || videoPreview ? 'Add a message (optional)...' : placeholder}
          disabled={isDisabled || isSending}
          rows={1}
          className={`flex-1 px-4 py-3 rounded-lg bg-black/40 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none transition-all ${
            isDisabled || isSending ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          style={{ minHeight: '44px', maxHeight: '120px' }}
          onInput={(e) => {
            const target = e.currentTarget
            target.style.height = 'auto'
            target.style.height = `${Math.min(target.scrollHeight, 120)}px`
          }}
        />

        {/* Send button (paper plane icon) */}
        <button
          onClick={handleSend}
          disabled={isDisabled || isSending || (!message.trim() && !screenshotPreview && !videoPreview)}
          className={`w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 active:scale-95 transition-all flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/50 ${
            isDisabled || isSending || (!message.trim() && !screenshotPreview && !videoPreview)
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer'
          }`}
          aria-label="Send message"
        >
          {isSending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Screenshot preview */}
      {screenshotPreview && (
        <div className="flex items-start gap-3 p-3 bg-black/30 rounded-lg border border-purple-500/30">
          <div className="relative flex-shrink-0">
            <img
              src={screenshotPreview.previewUrl}
              alt="Screenshot preview"
              className="w-20 h-20 object-cover rounded border border-white/20"
            />
            <button
              onClick={handleRemoveScreenshot}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors shadow-lg"
              aria-label="Remove screenshot"
            >
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-sm font-medium text-white">Screenshot captured</span>
            </div>
            <p className="text-xs text-white/60">Ready to send. Add a message above (optional) and click send.</p>
          </div>
        </div>
      )}

      {/* Video preview */}
      {videoPreview && (
        <div className="flex items-start gap-3 p-3 bg-black/30 rounded-lg border border-green-500/30">
          <div className="relative flex-shrink-0">
            <video
              src={videoPreview.previewUrl}
              className="w-20 h-20 object-cover rounded border border-white/20"
              preload="metadata"
              muted
              playsInline
            />
            <button
              onClick={handleRemoveVideo}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors shadow-lg"
              aria-label="Remove video"
            >
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {videoPreview.duration && (
              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-xs text-white">
                {videoPreview.duration}s
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm font-medium text-white">Video recorded</span>
            </div>
            <p className="text-xs text-white/60">Ready to send. Add a message above (optional) and click send.</p>
          </div>
        </div>
      )}

      {/* Status indicator */}
      <div className="flex items-center gap-2 px-1">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs text-white/60">Online</span>
      </div>
    </div>
  )
}
