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
  const videoQueryRef = useRef<string | undefined>(undefined)
  const videoUploadPromiseRef = useRef<{
    resolve: (result: UploadResponse) => void
    reject: (error: Error) => void
  } | null>(null)

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
      
      // Create data URL for preview
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      
      // Upload to backend with query
      const result = await uploadScreenshot(desktopId, blob, query)
      
      // Add preview URL to result
      const resultWithPreview = { ...result, previewUrl: dataUrl }
      
      setIsCapturing(false)
      return resultWithPreview
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
        if (event.data && event.data.size > 0) {
          console.log('📹 Video chunk received:', event.data.size, 'bytes')
          recordedChunksRef.current.push(event.data)
        } else {
          console.warn('📹 Received empty video chunk')
        }
      }

      mediaRecorder.onstop = async () => {
        console.log('📹 Recording stopped, total chunks:', recordedChunksRef.current.length)
        
        // Wait a bit to ensure all data is flushed
        await new Promise(resolve => setTimeout(resolve, 100))
        
        if (!desktopId) {
          videoUploadPromiseRef.current?.reject(new Error('Desktop ID not available'))
          videoUploadPromiseRef.current = null
          return
        }

        try {
          // Ensure we have data
          if (recordedChunksRef.current.length === 0) {
            throw new Error('No video data recorded - MediaRecorder did not capture any chunks')
          }
          
          // Calculate total size
          const totalSize = recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0)
          console.log('📹 Total video data size:', totalSize, 'bytes')
          
          if (totalSize === 0) {
            throw new Error('Video blob is empty - no data was captured')
          }
          
          // Create blob from chunks with explicit MIME type
          const videoBlob = new Blob(recordedChunksRef.current, { type: blobMimeType })
          console.log('📹 Video blob created:', videoBlob.size, 'bytes, type:', videoBlob.type)
          
          // Validate blob
          if (videoBlob.size === 0) {
            throw new Error('Created video blob is empty')
          }
          
          // Test if blob is valid by creating object URL
          const previewUrl = URL.createObjectURL(videoBlob)
          console.log('📹 Preview URL created:', previewUrl)
          
          // Verify the blob can be read (basic validation)
          try {
            const testReader = new FileReader()
            await new Promise<void>((resolve, reject) => {
              testReader.onloadend = () => {
                if (testReader.result && testReader.result instanceof ArrayBuffer) {
                  console.log('📹 Blob validation: readable, size:', testReader.result.byteLength, 'bytes')
                  resolve()
                } else {
                  reject(new Error('Blob validation failed: could not read blob data'))
                }
              }
              testReader.onerror = () => reject(new Error('Blob validation failed: FileReader error'))
              testReader.readAsArrayBuffer(videoBlob.slice(0, 1024)) // Read first 1KB to validate
            })
          } catch (validationError) {
            console.error('📹 Blob validation error:', validationError)
            throw new Error(`Video blob validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`)
          }
          
          // Calculate duration
          const duration = Math.floor((Date.now() - startTime) / 1000)
          console.log('📹 Video duration:', duration, 'seconds')

          // Upload to backend with query
          console.log('📹 Uploading video to backend...')
          const result = await uploadVideo(desktopId, videoBlob, duration, videoQueryRef.current, blobMimeType)
          console.log('📹 Video upload complete')

          // Add preview URL to result
          const resultWithPreview = { ...result, previewUrl }

          // Resolve the promise if it exists
          if (videoUploadPromiseRef.current) {
            videoUploadPromiseRef.current.resolve(resultWithPreview)
            videoUploadPromiseRef.current = null
          }

          // Stop all tracks
          stream.getTracks().forEach((track) => track.stop())
          streamRef.current = null
          mediaRecorderRef.current = null
          recordedChunksRef.current = []
          videoQueryRef.current = undefined
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to upload video'
          setError(errorMessage)
          console.error('📹 Failed to upload video:', err)
          
          // Clean up on error
          stream.getTracks().forEach((track) => track.stop())
          streamRef.current = null
          mediaRecorderRef.current = null
          recordedChunksRef.current = []
          videoQueryRef.current = undefined
          
          // Reject the promise if it exists
          if (videoUploadPromiseRef.current) {
            videoUploadPromiseRef.current.reject(err instanceof Error ? err : new Error(errorMessage))
            videoUploadPromiseRef.current = null
          }
        }
      }

      // Start recording with timeslice to collect data periodically (every 100ms)
      console.log('📹 Starting recording with MIME type:', blobMimeType)
      mediaRecorder.start(100)
      setIsRecording(true)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording'
      setError(errorMessage)
      throw err
    }
  }, [desktopId, isRecording])

  // Stop screen recording
  const stopRecording = useCallback(async (query?: string): Promise<UploadResponse> => {
    if (!isRecording || !mediaRecorderRef.current) {
      throw new Error('Not currently recording')
    }

    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }

    if (!desktopId) {
      throw new Error('Desktop ID not available')
    }

    // Store query for use in onstop handler
    videoQueryRef.current = query

    // Create a promise that will be resolved/rejected in the onstop handler
    const uploadPromise = new Promise<UploadResponse>((resolve, reject) => {
      videoUploadPromiseRef.current = { resolve, reject }
    })

    try {
      await window.electronAPI.stopRecording()

      const mediaRecorder = mediaRecorderRef.current
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        // Request any remaining data before stopping
        console.log('📹 Requesting final data from MediaRecorder...')
        mediaRecorder.requestData()
        
        // Wait a moment for data to be available
        await new Promise(resolve => setTimeout(resolve, 50))
        
        // Now stop the recorder
        console.log('📹 Stopping MediaRecorder...')
        mediaRecorder.stop()
      } else if (mediaRecorder && mediaRecorder.state === 'inactive') {
        console.warn('📹 MediaRecorder already stopped')
      }

      setIsRecording(false)
      setRecordingStartTime(null)

      // Wait for the upload to complete (onstop handler will resolve/reject)
      return await uploadPromise
    } catch (err: unknown) {
      // Clean up promise ref if error occurs before onstop
      videoUploadPromiseRef.current = null
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop recording'
      setError(errorMessage)
      setIsRecording(false)
      setRecordingStartTime(null)
      throw err
    }
  }, [isRecording, desktopId])

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
