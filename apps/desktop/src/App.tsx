import { useEffect, useState } from 'react'
import { useDesktopRegistration } from './hooks/useDesktopRegistration'
import { useScreenCapture } from './hooks/useScreenCapture'
import { usePolling } from './hooks/usePolling'
import { PairingCode } from './components/PairingCode'
import { StatusIndicator } from './components/StatusIndicator'
import { RecordingControl } from './components/RecordingControl'

function App() {
  const { desktopId, pairingCode, isLoading, error, regeneratePairingCode } =
    useDesktopRegistration()

  const {
    captureScreenshot,
    startRecording,
    stopRecording,
    isRecording,
    isCapturing,
    error: captureError,
    getRecordingDuration,
  } = useScreenCapture(desktopId)

  const [mobileConnected, setMobileConnected] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [lastScreenshotResponse, setLastScreenshotResponse] = useState<string | null>(null)
  const [lastScreenshotPreview, setLastScreenshotPreview] = useState<string | null>(null)
  const [lastVideoResponse, setLastVideoResponse] = useState<string | null>(null)
  const [lastVideoPreview, setLastVideoPreview] = useState<string | null>(null)

  // Update recording duration every second when recording
  useEffect(() => {
    if (!isRecording) {
      setRecordingDuration(0)
      return
    }

    const interval = setInterval(() => {
      setRecordingDuration(getRecordingDuration())
    }, 1000)

    return () => clearInterval(interval)
  }, [isRecording, getRecordingDuration])

  // Set up polling for pending requests
  usePolling({
    desktopId,
    onScreenshotRequest: async () => {
      await captureScreenshot()
    },
    onStartRecordingRequest: startRecording,
    onStopRecordingRequest: async () => {
      await stopRecording()
    },
    enabled: !!desktopId,
  })

  // TODO: Poll for mobile connection status
  // For now, we'll assume mobile is connected if desktopId exists
  useEffect(() => {
    setMobileConnected(!!desktopId && !!pairingCode)
  }, [desktopId, pairingCode])

  const handleTestScreenshot = async (query?: string) => {
    try {
      setLastScreenshotResponse(null)
      setLastScreenshotPreview(null)
      const result = await captureScreenshot(query)
      if (result.analysis) {
        setLastScreenshotResponse(result.analysis)
      }
      if (result.previewUrl) {
        setLastScreenshotPreview(result.previewUrl)
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Test screenshot failed:', errorMessage)
      setLastScreenshotResponse(null)
      setLastScreenshotPreview(null)
    }
  }

  const handleStartRecording = async () => {
    try {
      await startRecording()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Start recording failed:', errorMessage)
    }
  }

  const handleStopRecording = async (query?: string) => {
    try {
      // Clean up previous video preview URL
      if (lastVideoPreview) {
        URL.revokeObjectURL(lastVideoPreview)
      }
      setLastVideoResponse(null)
      setLastVideoPreview(null)
      const result = await stopRecording(query)
      if (result.analysis) {
        setLastVideoResponse(result.analysis)
      }
      if (result.previewUrl) {
        setLastVideoPreview(result.previewUrl)
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Stop recording failed:', errorMessage)
      setLastVideoResponse(null)
      setLastVideoPreview(null)
    }
  }

  // Cleanup video preview URL on unmount
  useEffect(() => {
    return () => {
      if (lastVideoPreview) {
        URL.revokeObjectURL(lastVideoPreview)
      }
    }
  }, [lastVideoPreview])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-center mb-6">
          Desktop AI Assistant
        </h1>

        {error && (
          <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            Error: {error}
          </div>
        )}

        {captureError && (
          <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            Capture Error: {captureError}
          </div>
        )}

        <PairingCode
          pairingCode={pairingCode}
          isLoading={isLoading}
          onRegenerate={regeneratePairingCode}
        />

        <StatusIndicator
          mobileConnected={mobileConnected}
          isRecording={isRecording}
          recordingDuration={recordingDuration}
        />

        <RecordingControl
          onTestScreenshot={handleTestScreenshot}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          isRecording={isRecording}
          isCapturing={isCapturing}
          isDisabled={!desktopId || isLoading}
        />

        {lastScreenshotResponse && (
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">📸 Screenshot AI Analysis:</h3>
            {lastScreenshotPreview && (
              <div className="mb-3 rounded-lg overflow-hidden border border-gray-600">
                <img 
                  src={lastScreenshotPreview} 
                  alt="Screenshot preview" 
                  className="w-full h-auto max-h-96 object-contain"
                />
              </div>
            )}
            <p className="text-white whitespace-pre-wrap text-sm leading-relaxed">
              {lastScreenshotResponse}
            </p>
          </div>
        )}

        {lastVideoResponse && (
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">🎥 Video AI Analysis:</h3>
            {lastVideoPreview && (
              <div className="mb-3 rounded-lg overflow-hidden border border-gray-600">
                <video 
                  src={lastVideoPreview} 
                  controls 
                  className="w-full h-auto max-h-96"
                  preload="auto"
                  autoPlay={false}
                  muted
                  playsInline
                  onError={(e) => {
                    console.error('Video playback error:', e)
                    const videoEl = e.currentTarget
                    console.error('Video error details:', {
                      error: videoEl.error,
                      src: videoEl.src,
                      networkState: videoEl.networkState,
                      readyState: videoEl.readyState
                    })
                  }}
                  onLoadedMetadata={(e) => {
                    console.log('Video metadata loaded:', {
                      duration: e.currentTarget.duration,
                      videoWidth: e.currentTarget.videoWidth,
                      videoHeight: e.currentTarget.videoHeight
                    })
                  }}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
            <p className="text-white whitespace-pre-wrap text-sm leading-relaxed">
              {lastVideoResponse}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
