interface RecordingControlProps {
  onTestScreenshot: () => void
  onStartRecording: () => void
  onStopRecording: () => void
  isRecording: boolean
  isCapturing: boolean
  isDisabled?: boolean
}

export function RecordingControl({
  onTestScreenshot,
  onStartRecording,
  onStopRecording,
  isRecording,
  isCapturing,
  isDisabled = false,
}: RecordingControlProps) {
  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-800 rounded-lg">
      <h3 className="text-sm font-semibold text-gray-300 mb-2">Manual Testing</h3>

      <button
        onClick={onTestScreenshot}
        disabled={isDisabled || isCapturing || isRecording}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          isDisabled || isCapturing || isRecording
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
        }`}
      >
        {isCapturing ? 'Capturing...' : 'Test Screenshot'}
      </button>

      {!isRecording ? (
        <button
          onClick={onStartRecording}
          disabled={isDisabled || isCapturing}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isDisabled || isCapturing
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
          }`}
        >
          Start Recording
        </button>
      ) : (
        <button
          onClick={onStopRecording}
          disabled={isDisabled}
          className="px-4 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-colors"
        >
          Stop Recording
        </button>
      )}
    </div>
  )
}