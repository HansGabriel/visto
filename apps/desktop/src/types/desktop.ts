// Desktop app types

export interface RegisterDesktopResponse {
  desktopId: string
  pairingCode: string
}

export interface PendingRequest {
  requestId: string
  type: 'screenshot' | 'start-recording' | 'stop-recording'
  createdAt: number
}

export interface PendingRequestsResponse {
  requests: PendingRequest[]
}

export interface UploadResponse {
  status: string
  screenshotUrl?: string
  videoUrl?: string
  duration?: number
  analysis?: string
  previewUrl?: string
}

export interface DesktopSession {
  desktopId: string
  pairingCode: string
  mobileConnected: boolean
}