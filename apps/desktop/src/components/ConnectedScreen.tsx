import { useEffect } from 'react'

interface ConnectedScreenProps {
  onContinue: () => void
  autoContinue?: boolean
  autoContinueDelay?: number
}

export function ConnectedScreen({
  onContinue,
  autoContinue = true,
  autoContinueDelay = 3000,
}: ConnectedScreenProps) {
  useEffect(() => {
    if (autoContinue) {
      const timer = setTimeout(() => {
        onContinue()
      }, autoContinueDelay)

      return () => clearTimeout(timer)
    }
  }, [autoContinue, autoContinueDelay, onContinue])

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
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={() => window.history.back()}
            className="text-white/60 hover:text-white transition-colors p-2"
            aria-label="Back"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-white flex-1 text-center">Connected!</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Connection Illustration */}
        <div className="flex items-center justify-center gap-4 my-8">
          {/* Laptop icon */}
          <div className="relative">
            <div className="w-16 h-12 bg-gradient-to-br from-purple-500/50 to-blue-500/50 rounded-lg border-2 border-purple-400/50 shadow-lg shadow-purple-500/30">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-5 bg-white/10 rounded border border-white/20"></div>
              </div>
            </div>
          </div>

          {/* Connection line with dots */}
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>

          {/* Shield icon with checkmark */}
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500/50 to-blue-500/50 rounded-full border-2 border-purple-400/50 shadow-lg shadow-purple-500/30 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Phone icon */}
          <div className="relative">
            <div className="w-10 h-16 bg-gradient-to-br from-purple-500/50 to-blue-500/50 rounded-lg border-2 border-purple-400/50 shadow-lg shadow-purple-500/30">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-8 bg-white/10 rounded"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-white/90 text-lg">You are now connected to your desktop.</p>

          {/* Syncing indicator */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex gap-1.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 animate-bounce"
                  style={{
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: '1s',
                  }}
                />
              ))}
            </div>
            <span className="text-white/60 text-sm">Syncing data...</span>
          </div>
        </div>

        {/* CONTINUE Button */}
        <button
          onClick={onContinue}
          className="w-full py-4 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 hover:from-blue-600 hover:via-purple-600 hover:to-blue-600 active:scale-95 transition-all duration-200 shadow-lg shadow-blue-500/50 mt-4"
        >
          CONTINUE
        </button>
      </div>
    </div>
  )
}
