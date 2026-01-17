import { useEffect, useState } from 'react'
import { useDesktopRegistration } from './hooks/useDesktopRegistration'
import { useScreenCapture } from './hooks/useScreenCapture'
import { usePolling } from './hooks/usePolling'
import { useChat } from './hooks/useChat'
import { PairingScreen } from './components/PairingScreen'
import { ConnectedScreen } from './components/ConnectedScreen'
import { ChatInterface } from './components/ChatInterface'

type ViewState = 'pairing' | 'connected' | 'chat'

function App() {
  const { desktopId, pairingCode, sessionId, mobileConnected, isLoading, error, regeneratePairingCode } =
    useDesktopRegistration()

  const {
    captureScreenshot,
    startRecording,
    stopRecording,
    error: captureError,
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
  const handleSendMessage = async (message: string, requestScreenshot?: boolean): Promise<void> => {
    await sendMessage(message, requestScreenshot)
    // Return value is intentionally ignored to match ChatInterface signature
  }

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
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={chatLoading}
          isSending={isSending}
          sessionId={sessionId}
        />
      </div>
    </div>
  )
}

export default App
