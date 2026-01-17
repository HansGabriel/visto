import { useState } from 'react'

interface RecordingControlProps {
  onTestScreenshot: (query?: string) => void
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
  const [query, setQuery] = useState('')

  const handleTestScreenshot = () => {
    onTestScreenshot(query.trim() || undefined)
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-800 rounded-lg">
      <h3 className="text-sm font-semibold text-gray-300 mb-2">Manual Testing</h3>

      <div className="flex flex-col gap-2">
        <label htmlFor="screenshot-query" className="text-xs text-gray-400">
          Screenshot Prompt (optional):
        </label>
        <input
          id="screenshot-query"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe what you see in this screenshot..."
          disabled={isDisabled || isCapturing || isRecording}
          className={`px-3 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-500 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
            isDisabled || isCapturing || isRecording
              ? 'opacity-50 cursor-not-allowed'
              : ''
          }`}
        />
      </div>

      <button
        onClick={handleTestScreenshot}
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