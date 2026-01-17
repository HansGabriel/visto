import { API_ENDPOINTS } from '../utils/constants'
import type {
  RegisterDesktopResponse,
  PendingRequestsResponse,
  UploadResponse,
} from '../types/desktop'

// Register desktop and get pairing code
export async function registerDesktop(): Promise<RegisterDesktopResponse> {
  try {
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
  } catch (err) {
    // Handle network errors
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error(`Failed to connect to server at ${API_ENDPOINTS.DESKTOP_REGISTER}. Make sure the server is running.`)
    }
    // Re-throw if it's already an Error
    if (err instanceof Error) {
      throw err
    }
    throw new Error(`Unknown error: ${String(err)}`)
  }
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
  screenshotBuffer: Uint8Array | Blob,
  query?: string
): Promise<UploadResponse> {
  const formData = new FormData()
  
  // Convert Uint8Array to Blob if needed
  const blob = screenshotBuffer instanceof Blob
    ? screenshotBuffer
    : new Blob([screenshotBuffer as BlobPart], { type: 'image/png' })

  // IMPORTANT: Add query BEFORE the file so server can read it with request.file()
  if (query?.trim()) {
    formData.append('query', query.trim())
  }
  
  // Add file AFTER query field
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
  duration: number,
  query?: string,
  mimeType?: string
): Promise<UploadResponse> {
  const formData = new FormData()
  // IMPORTANT: Add fields BEFORE the file so server can read them with request.file()
  formData.append('duration', duration.toString())
  if (query?.trim()) {
    formData.append('query', query.trim())
  }
  if (mimeType) {
    formData.append('mimeType', mimeType)
  }
  // Add file AFTER fields - use correct extension based on MIME type
  const extension = mimeType?.includes('webm') ? 'webm' : 'mp4'
  formData.append('video', videoBlob, `recording.${extension}`)

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
