// API Configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
// Reduced polling interval to 1 second for faster screenshot response
export const POLLING_INTERVAL = parseInt(import.meta.env.VITE_POLLING_INTERVAL || '1000', 10)

// API Endpoints
export const API_ENDPOINTS = {
  DESKTOP_REGISTER: `${API_URL}/api/desktop/register`,
  DESKTOP_SESSION: (desktopId: string) =>
    `${API_URL}/api/desktop/${desktopId}/session`,
  DESKTOP_PENDING_REQUESTS: (desktopId: string) =>
    `${API_URL}/api/desktop/${desktopId}/pending-requests`,
  DESKTOP_SCREENSHOT: (desktopId: string) =>
    `${API_URL}/api/desktop/${desktopId}/screenshot`,
  DESKTOP_VIDEO: (desktopId: string) =>
    `${API_URL}/api/desktop/${desktopId}/video`,
} as const