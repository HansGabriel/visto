import { useEffect, useState } from 'react'

interface RecordingOverlayProps {
  isRecording: boolean
  duration: number
  onStop: () => Promise<void>
  maxDuration?: number
}

export function RecordingOverlay({
  isRecording,
  duration,
  onStop,
  maxDuration = 30,
}: RecordingOverlayProps) {
  const [isStopping, setIsStopping] = useState(false)

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const handleStop = async () => {
    if (isStopping) return
    setIsStopping(true)
    try {
      await onStop()
    } catch (error) {
      console.error('Failed to stop recording:', error)
    } finally {
      setIsStopping(false)
    }
  }

  if (!isRecording) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-black/90 border-2 border-purple-500/50 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        {/* Recording indicator */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white font-medium">Recording...</span>
        </div>

        {/* Timer */}
        <div className="text-center mb-6">
          <div className="text-2xl font-mono text-white mb-2">
            {formatTime(duration)} / {formatTime(maxDuration)}
          </div>
          <div className="text-sm text-white/60">Perform your actions on the desktop...</div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/10 rounded-full h-2 mb-6 overflow-hidden">
          <div
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-full transition-all duration-300"
            style={{ width: `${Math.min((duration / maxDuration) * 100, 100)}%` }}
          />
        </div>

        {/* Stop button */}
        <button
          onClick={handleStop}
          disabled={isStopping}
          className="w-full py-3 px-6 rounded-lg bg-red-600 hover:bg-red-700 active:scale-95 transition-all text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isStopping ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Stopping...</span>
            </>
          ) : (
            <>
              <div className="w-4 h-4 rounded bg-white" />
              <span>STOP REC</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
