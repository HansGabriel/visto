import { useState, useRef, useCallback, useEffect } from 'react'
import { uploadScreenshot, uploadVideo } from '../services/api'
import type { UploadResponse } from '../types/desktop'

export function useScreenCapture(desktopId: string | null) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop recording if still active
      if (mediaRecorderRef.current?.state !== 'inactive') {
        try {
          mediaRecorderRef.current?.stop()
        } catch (err) {
          console.error('Error stopping recorder on cleanup:', err)
        }
      }

      // Stop all tracks
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  // Capture screenshot
  const captureScreenshot = useCallback(async (query?: string): Promise<UploadResponse> => {
    if (!desktopId) {
      throw new Error('Desktop ID not available')
    }

    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }

    try {
      setIsCapturing(true)
      setError(null)

      // Get screenshot buffer from main process
      const screenshotBuffer = await window.electronAPI.captureScreenshot()
      
      // Convert to Blob
      const blob = new Blob([screenshotBuffer as BlobPart], { type: 'image/png' })
      
      // Upload to backend with query
      const result = await uploadScreenshot(desktopId, blob, query)
      
      setIsCapturing(false)
      return result
    } catch (err: unknown) {
      setIsCapturing(false)
      const errorMessage = err instanceof Error ? err.message : 'Failed to capture screenshot'
      setError(errorMessage)
      throw err
    }
  }, [desktopId])

  // Start screen recording
  const startRecording = useCallback(async (): Promise<void> => {
    if (!desktopId) {
      throw new Error('Desktop ID not available')
    }

    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }

    if (isRecording) {
      return
    }

    try {
      setError(null)
      
      // Get stream ID from main process
      const { streamId } = await window.electronAPI.startRecording()
      
      // Get screen stream in renderer process
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: streamId,
          },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      })

      streamRef.current = stream

      // Check if MediaRecorder is available
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder API is not supported in this environment')
      }

      // Create MediaRecorder with fallback mimeType
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
      ]
      
      const selectedMimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || ''

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
      })

      mediaRecorderRef.current = mediaRecorder
      recordedChunksRef.current = []

      // Capture start time for duration calculation
      const startTime = Date.now()
      setRecordingStartTime(startTime)

      // Capture mimeType for blob creation
      const blobMimeType = selectedMimeType || 'video/webm'

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        if (!desktopId) return

        try {
          // Create blob from chunks
          const videoBlob = new Blob(recordedChunksRef.current, { type: blobMimeType })
          
          // Calculate duration
          const duration = Math.floor((Date.now() - startTime) / 1000)

          // Upload to backend
          await uploadVideo(desktopId, videoBlob, duration)

          // Stop all tracks
          stream.getTracks().forEach((track) => track.stop())
          streamRef.current = null
          mediaRecorderRef.current = null
          recordedChunksRef.current = []
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to upload video'
          setError(errorMessage)
          console.error('Failed to upload video:', err)
        }
      }

      // Start recording
      mediaRecorder.start()
      setIsRecording(true)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording'
      setError(errorMessage)
      throw err
    }
  }, [desktopId, isRecording])

  // Stop screen recording
  const stopRecording = useCallback(async (): Promise<void> => {
    if (!isRecording || !mediaRecorderRef.current) {
      return
    }

    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }

    try {
      await window.electronAPI.stopRecording()

      const mediaRecorder = mediaRecorderRef.current
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop()
      }

      setIsRecording(false)
      setRecordingStartTime(null)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop recording'
      setError(errorMessage)
      throw err
    }
  }, [isRecording])

  // Get recording duration in seconds
  const getRecordingDuration = useCallback((): number => {
    if (!recordingStartTime) return 0
    return Math.floor((Date.now() - recordingStartTime) / 1000)
  }, [recordingStartTime])

  return {
    captureScreenshot,
    startRecording,
    stopRecording,
    isRecording,
    isCapturing,
    error,
    getRecordingDuration,
  }
}
