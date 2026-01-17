import { API_ENDPOINTS } from '../utils/constants'
import type {
  RegisterDesktopResponse,
  PendingRequestsResponse,
  UploadResponse,
} from '../types/desktop'

// Register desktop and get pairing code
export async function registerDesktop(): Promise<RegisterDesktopResponse> {
  const response = await fetch(API_ENDPOINTS.DESKTOP_REGISTER, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Registration failed' }))
    throw new Error(error.error || `Registration failed: ${response.statusText}`)
  }

  return response.json()
}

// Get pending requests for desktop
export async function getPendingRequests(desktopId: string): Promise<PendingRequestsResponse> {
  const response = await fetch(API_ENDPOINTS.DESKTOP_PENDING_REQUESTS(desktopId), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch requests' }))
    throw new Error(error.error || `Failed to fetch requests: ${response.statusText}`)
  }

  return response.json()
}

// Upload screenshot to backend
export async function uploadScreenshot(
  desktopId: string,
  screenshotBuffer: Uint8Array | Blob
): Promise<UploadResponse> {
  const formData = new FormData()
  
  // Convert Uint8Array to Blob if needed
  const blob = screenshotBuffer instanceof Blob
    ? screenshotBuffer
    : new Blob([screenshotBuffer as BlobPart], { type: 'image/png' })

  formData.append('screenshot', blob, 'screenshot.png')

  const response = await fetch(API_ENDPOINTS.DESKTOP_SCREENSHOT(desktopId), {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(error.error || `Screenshot upload failed: ${response.statusText}`)
  }

  return response.json()
}

// Upload video to backend
export async function uploadVideo(
  desktopId: string,
  videoBlob: Blob,
  duration: number
): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('video', videoBlob, 'recording.webm')
  formData.append('duration', duration.toString())

  const response = await fetch(API_ENDPOINTS.DESKTOP_VIDEO(desktopId), {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(error.error || `Video upload failed: ${response.statusText}`)
  }

  return response.json()
}