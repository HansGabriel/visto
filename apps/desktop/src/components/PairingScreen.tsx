interface PairingScreenProps {
  pairingCode: string | null
  isLoading: boolean
  onRegenerate?: () => void
  onSkipToChat?: () => void // For development/testing
  sessionId?: string | null // For development mode check
}

export function PairingScreen({
  pairingCode,
  isLoading,
  onRegenerate,
  // onSkipToChat,
  // sessionId,
}: PairingScreenProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
        <div className="text-xl text-white/60">Loading pairing code...</div>
      </div>
    )
  }

  if (!pairingCode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
        <div className="text-xl text-red-400">Failed to generate pairing code</div>
      </div>
    )
  }

  // Split pairing code into individual characters (show all characters)
  const codeChars = pairingCode.split('')

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 relative overflow-hidden">
      {/* Cosmic background stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/20 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${Math.random() * 3 + 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          {/* <button
            onClick={() => window.history.back()}
            className="text-white/60 hover:text-white transition-colors p-2"
            aria-label="Back"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button> */}
          <h1 className="text-2xl font-semibold text-white">Pairing</h1>
          {/* <button className="text-white/60 hover:text-white transition-colors p-2 ml-auto" aria-label="Settings">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button> */}
        </div>

        {/* Title with gradient */}
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            Visto AI
          </h2>
          <p className="text-white/80 text-lg">Connect to Your Desktop</p>
        </div>

        {/* Pairing Code Display */}
        <div className="flex flex-col items-center gap-4 w-full">
          <label className="text-sm text-white/60 uppercase tracking-wide">Enter Pairing Code</label>
          
          {/* Character boxes */}
          <div className="flex gap-3 justify-center">
            {codeChars.map((char, index) => (
              <div
                key={index}
                className="w-14 h-14 rounded-lg border-2 border-white/20 bg-gray-900/50 flex items-center justify-center text-2xl font-bold text-white font-mono backdrop-blur-sm"
              >
                {char}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 w-full">
          <button
            onClick={async () => {
              if (pairingCode) {
                try {
                  await navigator.clipboard.writeText(pairingCode)
                } catch (error) {
                  console.error('Failed to copy:', error)
                }
              }
            }}
            className="flex-1 py-4 rounded-lg font-semibold text-white bg-black/40 border border-white/20 hover:bg-black/60 active:scale-95 transition-all duration-200"
          >
            Copy Code
          </button>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="flex-1 py-4 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 hover:from-purple-600 hover:via-blue-600 hover:to-purple-600 active:scale-95 transition-all duration-200 shadow-lg shadow-purple-500/50"
            >
              New Code
            </button>
          )}
        </div>

        {/* Hint */}
        <div className="flex flex-col items-center gap-3 text-white/50 text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>Find the code in your desktop app's system tray</span>
          </div>

          {/* Development mode: Skip to chat button
          {onSkipToChat && sessionId && (import.meta.env.DEV || import.meta.env.VITE_DEV_SERVER_URL) && (
            <button
              onClick={onSkipToChat}
              className="mt-2 px-4 py-2 text-xs rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-colors text-white/70"
            >
              🛠️ Dev: Skip to Chat (or press C)
            </button>
          )} */}
        </div>
      </div>
    </div>
  )
}
