import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  SESSION_ID: 'session_id',
  DESKTOP_ID: 'desktop_id',
} as const;

export interface SessionData {
  sessionId: string;
  desktopId: string;
}

/**
 * Save session data to persistent storage
 */
export async function saveSession(sessionId: string, desktopId: string): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.SESSION_ID, sessionId],
      [STORAGE_KEYS.DESKTOP_ID, desktopId],
    ]);
  } catch (error) {
    console.error('Failed to save session:', error);
    throw new Error('Failed to save session data');
  }
}

/**
 * Retrieve session data from persistent storage
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const values = await AsyncStorage.multiGet([
      STORAGE_KEYS.SESSION_ID,
      STORAGE_KEYS.DESKTOP_ID,
    ]);
    
    const sessionId = values[0][1];
    const desktopId = values[1][1];
    
    if (sessionId && desktopId) {
      return { sessionId, desktopId };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

/**
 * Clear session data from persistent storage
 */
export async function clearSession(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.SESSION_ID,
      STORAGE_KEYS.DESKTOP_ID,
    ]);
  } catch (error) {
    console.error('Failed to clear session:', error);
    throw new Error('Failed to clear session data');
  }
}
