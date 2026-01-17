import { useState, useEffect } from 'react'
import { registerDesktop, getSessionByDesktopId } from '../services/api'
import { POLLING_INTERVAL } from '../utils/constants'
import type { RegisterDesktopResponse } from '../types/desktop'

const STORAGE_KEY_DESKTOP_ID = 'desktop_id'
const STORAGE_KEY_PAIRING_CODE = 'pairing_code'
const STORAGE_KEY_SESSION_ID = 'session_id'

export function useDesktopRegistration() {
  const [desktopId, setDesktopId] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [mobileConnected, setMobileConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if we already have a desktopId and pairingCode stored
    const storedDesktopId = localStorage.getItem(STORAGE_KEY_DESKTOP_ID)
    const storedPairingCode = localStorage.getItem(STORAGE_KEY_PAIRING_CODE)
    const storedSessionId = localStorage.getItem(STORAGE_KEY_SESSION_ID)

    if (storedDesktopId && storedPairingCode) {
      // Use existing registration
      setDesktopId(storedDesktopId)
      setPairingCode(storedPairingCode)
      
      // If we have desktopId but no sessionId, try to fetch it
      if (storedDesktopId && !storedSessionId) {
        getSessionByDesktopId(storedDesktopId)
          .then((session) => {
            setSessionId(session.sessionId)
            localStorage.setItem(STORAGE_KEY_SESSION_ID, session.sessionId)
          })
          .catch((err) => {
            console.warn('Failed to retrieve sessionId:', err)
            // Continue without sessionId - chat won't work but app won't crash
          })
      } else {
        setSessionId(storedSessionId)
      }
      
      setIsLoading(false)
    } else {
      // Register new desktop
      registerDesktop()
        .then((response: RegisterDesktopResponse) => {
          setDesktopId(response.desktopId)
          setPairingCode(response.pairingCode)
          
          // Store in localStorage for persistence
          localStorage.setItem(STORAGE_KEY_DESKTOP_ID, response.desktopId)
          localStorage.setItem(STORAGE_KEY_PAIRING_CODE, response.pairingCode)
          
          // If sessionId not in response, try to fetch it
          if (response.sessionId) {
            setSessionId(response.sessionId)
            localStorage.setItem(STORAGE_KEY_SESSION_ID, response.sessionId)
          } else {
            // Fallback: fetch sessionId by desktopId
            getSessionByDesktopId(response.desktopId)
              .then((session) => {
                setSessionId(session.sessionId)
                localStorage.setItem(STORAGE_KEY_SESSION_ID, session.sessionId)
              })
              .catch((err) => {
                console.warn('Failed to retrieve sessionId:', err)
                // Continue without sessionId
              })
          }
          
          setIsLoading(false)
        })
        .catch((err: Error) => {
          setError(err.message)
          setIsLoading(false)
          console.error('Failed to register desktop:', err)
        })
    }
  }, [])

  // Function to regenerate pairing code (future: call backend to generate new code)
  const regeneratePairingCode = async () => {
    try {
      setIsLoading(true)
      const response = await registerDesktop()
      setDesktopId(response.desktopId)
      setPairingCode(response.pairingCode)
      
      localStorage.setItem(STORAGE_KEY_DESKTOP_ID, response.desktopId)
      localStorage.setItem(STORAGE_KEY_PAIRING_CODE, response.pairingCode)
      
      // If sessionId not in response, try to fetch it
      if (response.sessionId) {
        setSessionId(response.sessionId)
        localStorage.setItem(STORAGE_KEY_SESSION_ID, response.sessionId)
      } else {
        // Fallback: fetch sessionId by desktopId
        getSessionByDesktopId(response.desktopId)
          .then((session) => {
            setSessionId(session.sessionId)
            localStorage.setItem(STORAGE_KEY_SESSION_ID, session.sessionId)
          })
          .catch((err) => {
            console.warn('Failed to retrieve sessionId:', err)
            // Continue without sessionId
          })
      }
      
      setIsLoading(false)
      setError(null)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to regenerate pairing code'
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  // Poll for mobile connection status
  useEffect(() => {
    if (!desktopId || mobileConnected) {
      return
    }

    const pollConnectionStatus = async () => {
      try {
        const session = await getSessionByDesktopId(desktopId)
        if (session.mobileConnected && !mobileConnected) {
          setMobileConnected(true)
          if (session.sessionId && sessionId !== session.sessionId) {
            setSessionId(session.sessionId)
            localStorage.setItem(STORAGE_KEY_SESSION_ID, session.sessionId)
          }
        }
      } catch (err) {
        // Silently fail - don't spam errors for polling
        console.warn('Failed to poll connection status:', err)
      }
    }

    // Initial check
    void pollConnectionStatus()

    // Set up polling interval
    const interval = setInterval(() => {
      if (!mobileConnected) {
        void pollConnectionStatus()
      }
    }, POLLING_INTERVAL)

    return () => clearInterval(interval)
  }, [desktopId, mobileConnected, sessionId])

  return {
    desktopId,
    pairingCode,
    sessionId,
    mobileConnected,
    isLoading,
    error,
    regeneratePairingCode,
  }
}