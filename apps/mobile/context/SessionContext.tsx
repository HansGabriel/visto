import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { saveSession, getSession, clearSession, type SessionData } from '../utils/storage';

interface SessionContextValue {
  sessionId: string | null;
  desktopId: string | null;
  isConnected: boolean;
  setSession: (sessionId: string, desktopId: string) => Promise<void>;
  clearSession: () => Promise<void>;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [desktopId, setDesktopId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session on mount
  useEffect(() => {
    async function loadSession() {
      try {
        const session = await getSession();
        if (session) {
          setSessionId(session.sessionId);
          setDesktopId(session.desktopId);
        }
      } catch (error) {
        console.error('Failed to load session:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadSession();
  }, []);

  const setSession = useCallback(async (newSessionId: string, newDesktopId: string) => {
    try {
      await saveSession(newSessionId, newDesktopId);
      setSessionId(newSessionId);
      setDesktopId(newDesktopId);
    } catch (error) {
      console.error('Failed to set session:', error);
      throw error;
    }
  }, []);

  const handleClearSession = useCallback(async () => {
    try {
      await clearSession();
      setSessionId(null);
      setDesktopId(null);
    } catch (error) {
      console.error('Failed to clear session:', error);
      throw error;
    }
  }, []);

  const value: SessionContextValue = {
    sessionId,
    desktopId,
    isConnected: !!sessionId && !!desktopId,
    setSession,
    clearSession: handleClearSession,
    isLoading,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
