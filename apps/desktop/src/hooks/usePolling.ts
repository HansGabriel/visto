import { useEffect, useRef } from 'react'
import { getPendingRequests } from '../services/api'
import { POLLING_INTERVAL } from '../utils/constants'

interface UsePollingOptions {
  desktopId: string | null
  onScreenshotRequest?: () => Promise<void>
  onStartRecordingRequest?: () => Promise<void>
  onStopRecordingRequest?: () => Promise<void>
  enabled?: boolean
}

export function usePolling({
  desktopId,
  onScreenshotRequest,
  onStartRecordingRequest,
  onStopRecordingRequest,
  enabled = true,
}: UsePollingOptions) {
  const callbacksRef = useRef({
    onScreenshotRequest,
    onStartRecordingRequest,
    onStopRecordingRequest,
  })

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = {
      onScreenshotRequest,
      onStartRecordingRequest,
      onStopRecordingRequest,
    }
  }, [onScreenshotRequest, onStartRecordingRequest, onStopRecordingRequest])

  useEffect(() => {
    if (!desktopId || !enabled) {
      if (!enabled) {
        console.log('⏸️ Desktop polling disabled')
      }
      return
    }

    console.log('🔄 Desktop polling started for desktopId:', desktopId, 'interval:', POLLING_INTERVAL, 'ms')

    // Track processed request IDs to avoid processing the same request twice
    const processedRequestIds = new Set<string>()

    const poll = async () => {
      try {
        const { requests } = await getPendingRequests(desktopId)

        // Log when we find pending requests (helps debug timing issues)
        if (requests.length > 0) {
          const screenshotRequests = requests.filter(r => r.type === 'screenshot')
          if (screenshotRequests.length > 0) {
            console.log('📸 Found', screenshotRequests.length, 'screenshot request(s), capturing now...', 
              screenshotRequests.map(r => ({ id: r.requestId, processed: r.processed })))
          }
        }

        // Process each request
        for (const request of requests) {
          // Skip if already processed
          if (processedRequestIds.has(request.requestId)) {
            continue
          }

          // Mark as processed
          processedRequestIds.add(request.requestId)

          // Handle request based on type
          try {
            const startTime = Date.now()
            switch (request.type) {
              case 'screenshot':
                if (callbacksRef.current.onScreenshotRequest) {
                  console.log('📸 Starting screenshot capture for requestId:', request.requestId)
                  await callbacksRef.current.onScreenshotRequest()
                  console.log('📸 Screenshot capture completed in', Date.now() - startTime, 'ms')
                }
                break

              case 'start-recording':
                if (callbacksRef.current.onStartRecordingRequest) {
                  await callbacksRef.current.onStartRecordingRequest()
                }
                break

              case 'stop-recording':
                if (callbacksRef.current.onStopRecordingRequest) {
                  await callbacksRef.current.onStopRecordingRequest()
                }
                break

              default:
                console.warn('Unknown request type:', request.type)
            }
          } catch (error) {
            console.error(`Error handling ${request.type} request:`, error)
            // Remove from processed set so it can be retried
            processedRequestIds.delete(request.requestId)
          }
        }
      } catch (error) {
        console.error('Error polling for pending requests:', error)
      }
    }

    // Poll immediately on mount
    poll()

    // Set up interval for polling
    const interval = setInterval(poll, POLLING_INTERVAL)

    return () => {
      clearInterval(interval)
      processedRequestIds.clear()
    }
  }, [desktopId, enabled])
}