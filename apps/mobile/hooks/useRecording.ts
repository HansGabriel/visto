import { useState, useCallback } from 'react';
import { startRecording, stopRecording } from '../services/api';

export function useRecording(sessionId: string | null) {
  const [isRecording, setIsRecording] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    if (!sessionId) {
      setError('No session ID available');
      return;
    }

    setError(null);
    setIsRecording(true);

    try {
      await startRecording(sessionId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      setIsRecording(false);
      throw err;
    }
  }, [sessionId]);

  const stop = useCallback(async () => {
    if (!sessionId) {
      setError('No session ID available');
      return;
    }

    if (!isRecording) {
      return;
    }

    setError(null);
    setIsStopping(true);

    try {
      await stopRecording(sessionId);
      setIsRecording(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop recording';
      setError(errorMessage);
      throw err;
    } finally {
      setIsStopping(false);
    }
  }, [sessionId, isRecording]);

  return {
    startRecording: start,
    stopRecording: stop,
    isRecording,
    isStopping,
    error,
  };
}
