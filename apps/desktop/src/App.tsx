import { useEffect, useState, useCallback, useRef } from 'react'
import { useDesktopRegistration } from './hooks/useDesktopRegistration'
import { useScreenCapture } from './hooks/useScreenCapture'
import { usePolling } from './hooks/usePolling'
import { useChat } from './hooks/useChat'
import { PairingScreen } from './components/PairingScreen'
import { ConnectedScreen } from './components/ConnectedScreen'
import { ChatInterface } from './components/ChatInterface'
import { RecordingOverlay } from './components/RecordingOverlay'

type ViewState = 'pairing' | 'connected' | 'chat'

function App() {
  const { desktopId, pairingCode, sessionId, mobileConnected, isLoading, error, regeneratePairingCode } =
    useDesktopRegistration()

  const {
    captureScreenshot,
    startRecording,
    stopRecording,
    isRecording,
    isCapturing,
    error: captureError,
    getRecordingDuration,
    getVideoUploadResult,
  } = useScreenCapture(desktopId)

  const [viewState, setViewState] = useState<ViewState>('pairing')
  const [manuallyNavigated, setManuallyNavigated] = useState(false)

  // Set up polling for pending requests (only when mobile is connected)
  usePolling({
    desktopId,
    onScreenshotRequest: async () => {
      await captureScreenshot()
    },
    onStartRecordingRequest: startRecording,
    onStopRecordingRequest: async () => {
      await stopRecording()
    },
    enabled: !!desktopId && mobileConnected,
  })

  // Initialize chat
  const { messages, sendMessage, isLoading: chatLoading, isSending } = useChat(sessionId)

  // Wrapper for sendMessage to match ChatInterface type signature
  const handleSendMessage = async (
    message: string,
    requestScreenshot?: boolean,
    screenshotUrl?: string,
    videoUrl?: string,
    mediaPreviewUrl?: string,
    storageId?: string
  ): Promise<void> => {
    // Revoke blob URLs before sending to prevent memory leaks
    // Always revoke video preview URL if it exists, regardless of whether videoUrl is present
    if (videoPreviewResult?.previewUrl) {
      URL.revokeObjectURL(videoPreviewResult.previewUrl)
    }
    // Also revoke mediaPreviewUrl if it's a blob URL (starts with blob:)
    if (mediaPreviewUrl && mediaPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreviewUrl)
    }
    
    await sendMessage(message, requestScreenshot, screenshotUrl, videoUrl, mediaPreviewUrl, storageId)
    
    // Clear video preview after sending
    setVideoPreviewResult(null)
  }

  // Handle screenshot capture from chat - returns preview for input area
  const handleCaptureScreenshot = useCallback(async () => {
    if (!desktopId) {
      throw new Error('Desktop ID not available')
    }

    try {
      // Capture and upload screenshot
      const result = await captureScreenshot()
      
      // Return preview data for ChatInput to display
      if (result.previewUrl && result.screenshotUrl) {
        return {
          previewUrl: result.previewUrl,
          screenshotUrl: result.screenshotUrl,
          storageId: result.storageId, // Include Convex storage ID
        }
      }
      return null
    } catch (error) {
      console.error('Failed to capture screenshot:', error)
      throw error
    }
  }, [desktopId, captureScreenshot])

  // Handle start recording from chat
  const handleStartRecording = useCallback(async () => {
    if (!desktopId) {
      throw new Error('Desktop ID not available')
    }

    try {
      await startRecording()
    } catch (error) {
      console.error('Failed to start recording:', error)
      throw error
    }
  }, [desktopId, startRecording])

  // Store video preview result when recording stops
  const [videoPreviewResult, setVideoPreviewResult] = useState<{
    previewUrl: string
    videoUrl: string
    duration?: number
    storageId?: string
  } | null>(null)
  const videoPreviewResultRef = useRef(videoPreviewResult)
  
  // Track when RecordingOverlay is processing the stop (to wait for it)
  const stopRecordingPromiseRef = useRef<Promise<void> | null>(null)
  
  // Keep ref in sync with state
  useEffect(() => {
    videoPreviewResultRef.current = videoPreviewResult
  }, [videoPreviewResult])

  // Store getVideoUploadResult in a ref to avoid dependency issues
  const getVideoUploadResultRef = useRef(getVideoUploadResult)
  useEffect(() => {
    getVideoUploadResultRef.current = getVideoUploadResult
  }, [getVideoUploadResult])

  // Handle stop recording - returns preview for ChatInput (doesn't auto-send)
  const handleStopRecording = useCallback(async () => {
    console.log('📹 App: handleStopRecording called, checking for existing result...')
    
    // Use ref to get latest function without adding to dependencies
    const getResult = getVideoUploadResultRef.current
    
    // First, check if we have a final upload result from useScreenCapture (with videoUrl and storageId)
    const finalUploadResult = getResult()
    if (finalUploadResult && finalUploadResult.videoUrl) {
      console.log('📹 App: Found final upload result with videoUrl and storageId')
      const preview = {
        previewUrl: finalUploadResult.previewUrl || '',
        videoUrl: finalUploadResult.videoUrl,
        duration: finalUploadResult.duration,
        storageId: finalUploadResult.storageId,
      }
      // Update state if different
      if (!videoPreviewResultRef.current || videoPreviewResultRef.current.videoUrl !== finalUploadResult.videoUrl) {
        setVideoPreviewResult(preview)
      }
      return preview
    }
    
    // Check current value using ref (not stale closure)
    if (videoPreviewResultRef.current) {
      // Check if we have an updated final result
      const updatedResult = getResult()
      if (updatedResult && updatedResult.videoUrl && (!videoPreviewResultRef.current.videoUrl || !videoPreviewResultRef.current.storageId)) {
        console.log('📹 App: Updating preview with final upload result')
        const updatedPreview = {
          previewUrl: videoPreviewResultRef.current.previewUrl,
          videoUrl: updatedResult.videoUrl,
          duration: updatedResult.duration,
          storageId: updatedResult.storageId,
        }
        setVideoPreviewResult(updatedPreview)
        return updatedPreview
      }
      console.log('📹 App: Returning existing video preview result')
      return videoPreviewResultRef.current
    }

    // If recording was just stopped by RecordingOverlay, wait for it to complete
    // RecordingOverlay calls handleStopRecordingForOverlay which stores the result
    if (!isRecording && stopRecordingPromiseRef.current) {
      console.log('📹 App: Recording already stopped, waiting for RecordingOverlay to finish upload...')
      try {
        // Wait for the stop recording promise to complete
        await stopRecordingPromiseRef.current
        // After promise completes, check for final upload result
        const uploadResult = getResult()
        if (uploadResult && uploadResult.videoUrl) {
          const preview = {
            previewUrl: uploadResult.previewUrl || '',
            videoUrl: uploadResult.videoUrl,
            duration: uploadResult.duration,
            storageId: uploadResult.storageId,
          }
          setVideoPreviewResult(preview)
          return preview
        }
        // Check ref for current value
        if (videoPreviewResultRef.current) {
          console.log('📹 App: Found video preview result after RecordingOverlay completed')
          return videoPreviewResultRef.current
        }
      } catch (error) {
        console.error('📹 App: Error waiting for RecordingOverlay to complete:', error)
      }
    }

    // If still no result, wait a bit more (in case there's a timing issue)
    if (!isRecording) {
      console.log('📹 App: Recording stopped but no promise found, polling for result...')
      // Wait up to 30 seconds for the final upload result (for large video uploads)
      for (let i = 0; i < 300; i++) {
        await new Promise(resolve => setTimeout(resolve, 100))
        // Check for final upload result first
        const uploadResult = getResult()
        if (uploadResult && uploadResult.videoUrl) {
          console.log('📹 App: Found final upload result after polling', i + 1, 'iterations')
          const preview = {
            previewUrl: uploadResult.previewUrl || '',
            videoUrl: uploadResult.videoUrl,
            duration: uploadResult.duration,
            storageId: uploadResult.storageId,
          }
          setVideoPreviewResult(preview)
          return preview
        }
        // Check ref for current value (not stale closure)
        if (videoPreviewResultRef.current) {
          console.log('📹 App: Found video preview result after polling', i + 1, 'iterations')
          return videoPreviewResultRef.current
        }
      }
      // If still no result after waiting, return null
      console.warn('📹 App: Video preview result not available after waiting 30 seconds')
      return null
    }

    // If we're still recording, stop it now
    if (!desktopId) {
      throw new Error('Desktop ID not available')
    }

    try {
      // Stop recording and upload video
      const result = await stopRecording()
      
      // Return preview data for ChatInput to display (don't auto-send)
      // videoUrl may be empty if upload is still in progress
      if (result.previewUrl) {
        const preview = {
          previewUrl: result.previewUrl,
          videoUrl: result.videoUrl || '', // May be empty initially
          duration: result.duration,
          storageId: result.storageId, // Include Convex storage ID
        }
        setVideoPreviewResult(preview)
        
        // Poll for final upload result (with videoUrl and storageId)
        // This will be updated in the background by useScreenCapture
        for (let i = 0; i < 300; i++) {
          await new Promise(resolve => setTimeout(resolve, 100))
          const finalResult = getResult()
          if (finalResult && finalResult.videoUrl) {
            console.log('📹 App: Final upload result available after', i + 1, 'iterations')
            const updatedPreview = {
              previewUrl: preview.previewUrl,
              videoUrl: finalResult.videoUrl,
              duration: finalResult.duration,
              storageId: finalResult.storageId,
            }
            setVideoPreviewResult(updatedPreview)
            return updatedPreview
          }
        }
        
        return preview
      }
      return null
    } catch (error) {
      console.error('Failed to stop recording:', error)
      throw error
    }
  }, [desktopId, stopRecording, isRecording])

  // Wrapper for RecordingOverlay that stores the result
  const handleStopRecordingForOverlay = useCallback(async () => {
    if (!desktopId) {
      throw new Error('Desktop ID not available')
    }

    // Create a promise for this stop operation
    const stopPromise = (async () => {
      try {
        console.log('📹 App: RecordingOverlay stopping recording...')
        // Stop recording and upload video
        const result = await stopRecording()
        console.log('📹 App: Recording stopped, result received:', {
          hasPreviewUrl: !!result.previewUrl,
          hasVideoUrl: !!result.videoUrl,
          duration: result.duration,
        })
        
        // Store preview data immediately (videoUrl may be empty if upload is still in progress)
        if (result.previewUrl) {
          const preview = {
            previewUrl: result.previewUrl,
            videoUrl: result.videoUrl || '', // May be empty initially
            duration: result.duration,
            storageId: result.storageId, // Include Convex storage ID
          }
          console.log('📹 App: Storing video preview result (upload may still be in progress)')
          setVideoPreviewResult(preview)
          // Also update ref immediately
          videoPreviewResultRef.current = preview
          
          // Note: Video upload happens in background in useScreenCapture
          // The result will be available via getVideoUploadResult() and handleStopRecording()
          // No need for polling here - handleStopRecording already handles this
        } else {
          console.warn('📹 App: Video result missing previewUrl', result)
        }
      } catch (error) {
        console.error('📹 App: Failed to stop recording:', error)
        throw error
      }
    })()

    // Store the promise so handleStopRecording can await it
    stopRecordingPromiseRef.current = stopPromise
    
    // Clear the promise ref when done
    stopPromise.finally(() => {
      stopRecordingPromiseRef.current = null
    })

    return stopPromise
  }, [desktopId, stopRecording])

  // Clear video preview when recording starts (new recording)
  useEffect(() => {
    if (isRecording && videoPreviewResultRef.current) {
      // Clean up previous preview URL if exists
      if (videoPreviewResultRef.current.previewUrl) {
        URL.revokeObjectURL(videoPreviewResultRef.current.previewUrl)
      }
      setVideoPreviewResult(null)
    }
  }, [isRecording]) // Only depend on isRecording

  // Cleanup video preview URL on unmount
  useEffect(() => {
    return () => {
      if (videoPreviewResultRef.current?.previewUrl) {
        URL.revokeObjectURL(videoPreviewResultRef.current.previewUrl)
      }
    }
  }, []) // Only run on unmount

  // Recording duration state for overlay
  const [recordingDuration, setRecordingDuration] = useState(0)

  // Update recording duration when recording
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

  // Handle view state transitions based on mobile connection status
  useEffect(() => {
    if (isLoading) {
      return
    }

    // Only auto-transition if user hasn't manually navigated
    if (manuallyNavigated) {
      return
    }

    if (mobileConnected && viewState === 'pairing') {
      // Transition to connected screen when mobile connects
      setViewState('connected')
    } else if (!mobileConnected && pairingCode && viewState !== 'pairing') {
      // Only reset to pairing if we're not already there and not manually navigated
      setViewState('pairing')
    }
  }, [mobileConnected, isLoading, pairingCode, viewState, manuallyNavigated])

  // Development mode: Allow skipping to chat with keyboard shortcut (C key)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only in development mode and when on pairing screen
      if (
        (import.meta.env.DEV || import.meta.env.VITE_DEV_SERVER_URL) &&
        viewState === 'pairing' &&
        sessionId &&
        (e.key === 'c' || e.key === 'C')
      ) {
        e.preventDefault()
        console.log('🛠️ [Dev] Skipping to chat for testing...')
        setManuallyNavigated(true)
        setViewState('chat')
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [viewState, sessionId])

  // Handle transition from connected to chat
  const handleConnectedContinue = () => {
    setManuallyNavigated(true)
    setViewState('chat')
  }

  // Handle manual skip to chat from pairing screen
  const handleSkipToChat = () => {
    setManuallyNavigated(true)
    setViewState('chat')
  }

  // Handle back from chat to pairing screen
  const handleBackFromChat = () => {
    setManuallyNavigated(true)
    setViewState('pairing')
  }

  // Render based on view state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
        <div className="p-6 bg-red-900/50 border border-red-500 rounded-lg text-red-200 max-w-md">
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (captureError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
        <div className="p-6 bg-red-900/50 border border-red-500 rounded-lg text-red-200 max-w-md">
          <h2 className="text-xl font-semibold mb-2">Capture Error</h2>
          <p>{captureError}</p>
        </div>
      </div>
    )
  }

  if (viewState === 'pairing') {
    return (
      <PairingScreen
        pairingCode={pairingCode}
        isLoading={isLoading}
        onRegenerate={regeneratePairingCode}
        onSkipToChat={handleSkipToChat}
        sessionId={sessionId}
      />
    )
  }

  if (viewState === 'connected') {
    return (
      <ConnectedScreen
        onContinue={handleConnectedContinue}
        autoContinue={true}
        autoContinueDelay={3000}
      />
    )
  }

  // Chat view - full-screen with responsive mobile-like layout
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Content container with max-width constraint for mobile-like appearance */}
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full relative">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          onCaptureScreenshot={handleCaptureScreenshot}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onBack={handleBackFromChat}
          isLoading={chatLoading}
          isSending={isSending}
          isCapturing={isCapturing}
          isRecording={isRecording}
          sessionId={sessionId}
        />
        <RecordingOverlay
          isRecording={isRecording}
          duration={recordingDuration}
          onStop={handleStopRecordingForOverlay}
          maxDuration={30}
        />
      </div>
    </div>
  )
}

export default App
