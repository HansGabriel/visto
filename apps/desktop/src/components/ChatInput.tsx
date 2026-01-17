import { useState, KeyboardEvent } from 'react'

interface ChatInputProps {
  onSendMessage: (message: string, requestScreenshot?: boolean) => Promise<void>
  isDisabled?: boolean
  isSending?: boolean
  placeholder?: string
}

export function ChatInput({
  onSendMessage,
  isDisabled = false,
  isSending = false,
  placeholder = 'Type a message...',
}: ChatInputProps) {
  const [message, setMessage] = useState('')

  const handleSend = async () => {
    if (!message.trim() || isDisabled || isSending) return

    try {
      await onSendMessage(message.trim(), false)
      setMessage('')
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

  return (
    <div className="flex flex-col gap-2 p-4">
      {/* Input row */}
      <div className="flex items-center gap-3">
        {/* Attachment button (+ icon) */}
        <button
          onClick={() => {
            // TODO: Implement attachment menu for screenshot/video
            console.log('Attachment button clicked')
          }}
          disabled={isDisabled || isSending}
          className={`w-10 h-10 rounded-lg border border-white/20 bg-black/40 hover:bg-black/60 active:scale-95 transition-all flex items-center justify-center flex-shrink-0 ${
            isDisabled || isSending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
          aria-label="Attach file"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* Message input */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
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
          disabled={isDisabled || isSending || !message.trim()}
          className={`w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 active:scale-95 transition-all flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/50 ${
            isDisabled || isSending || !message.trim()
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

      {/* Status indicator */}
      <div className="flex items-center gap-2 px-1">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs text-white/60">Online</span>
      </div>
    </div>
  )
}
