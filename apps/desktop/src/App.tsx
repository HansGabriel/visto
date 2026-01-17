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
    onScreenshotRequest: captureScreenshot,
    onStartRecordingRequest: startRecording,
    onStopRecordingRequest: stopRecording,
    enabled: !!desktopId,
  })

  // TODO: Poll for mobile connection status
  // For now, we'll assume mobile is connected if desktopId exists
  useEffect(() => {
    setMobileConnected(!!desktopId && !!pairingCode)
  }, [desktopId, pairingCode])

  const handleTestScreenshot = async () => {
    try {
      await captureScreenshot()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Test screenshot failed:', errorMessage)
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

  const handleStopRecording = async () => {
    try {
      await stopRecording()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Stop recording failed:', errorMessage)
    }
  }

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
      </div>
    </div>
  )
}

export default App
