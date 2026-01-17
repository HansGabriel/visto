import { useState, useCallback, useRef } from 'react';
import { pairWithDesktop } from '../services/api';
import { useSession } from '../context/SessionContext';
import type { PairResponse } from '../types/api';

export function usePairing() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setSession } = useSession();
  const pairingInProgress = useRef(false);

  const pair = useCallback(async (pairingCode: string): Promise<PairResponse | null> => {
    if (!pairingCode || pairingCode.length !== 6) {
      setError('Please enter a 6-character pairing code');
      return null;
    }

    // Prevent multiple simultaneous pairing attempts
    if (pairingInProgress.current) {
      return null;
    }

    pairingInProgress.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const response = await pairWithDesktop(pairingCode.toUpperCase());
      
      // Save session to context and storage
      await setSession(response.sessionId, response.desktopId);
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pair with desktop';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
      pairingInProgress.current = false;
    }
  }, [setSession]);

  return {
    pair,
    isLoading,
    error,
  };
}
