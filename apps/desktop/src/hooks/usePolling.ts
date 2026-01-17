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
      return
    }

    // Track processed request IDs to avoid processing the same request twice
    const processedRequestIds = new Set<string>()

    const poll = async () => {
      try {
        const { requests } = await getPendingRequests(desktopId)

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
            switch (request.type) {
              case 'screenshot':
                if (callbacksRef.current.onScreenshotRequest) {
                  await callbacksRef.current.onScreenshotRequest()
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