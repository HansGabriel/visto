interface StatusIndicatorProps {
  mobileConnected: boolean
  isRecording: boolean
  recordingDuration?: number
}

export function StatusIndicator({
  mobileConnected,
  isRecording,
  recordingDuration = 0,
}: StatusIndicatorProps) {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col gap-2 p-4 bg-gray-800 rounded-lg">
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${
            mobileConnected ? 'bg-green-500' : 'bg-gray-500'
          }`}
        />
        <span className="text-sm text-gray-300">
          Status: {mobileConnected ? 'Connected' : 'Waiting...'}
        </span>
      </div>

      {isRecording && (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm text-red-400">
            Recording: {formatDuration(recordingDuration)}
          </span>
        </div>
      )}
    </div>
  )
}