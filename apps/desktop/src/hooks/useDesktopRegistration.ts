import { useState, useEffect } from 'react'
import { registerDesktop } from '../services/api'
import type { RegisterDesktopResponse } from '../types/desktop'

const STORAGE_KEY_DESKTOP_ID = 'desktop_id'
const STORAGE_KEY_PAIRING_CODE = 'pairing_code'

export function useDesktopRegistration() {
  const [desktopId, setDesktopId] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if we already have a desktopId and pairingCode stored
    const storedDesktopId = localStorage.getItem(STORAGE_KEY_DESKTOP_ID)
    const storedPairingCode = localStorage.getItem(STORAGE_KEY_PAIRING_CODE)

    if (storedDesktopId && storedPairingCode) {
      // Use existing registration
      setDesktopId(storedDesktopId)
      setPairingCode(storedPairingCode)
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
      
      setIsLoading(false)
      setError(null)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to regenerate pairing code'
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  return {
    desktopId,
    pairingCode,
    isLoading,
    error,
    regeneratePairingCode,
  }
}