import { API_ENDPOINTS } from '../utils/constants';
import type { PairRequest, PairResponse, StartRecordingResponse, StopRecordingResponse } from '../types/api';

/**
 * Pair mobile with desktop using pairing code
 */
export async function pairWithDesktop(pairingCode: string): Promise<PairResponse> {
  const request: PairRequest = { pairingCode };
  
  try {
    const response = await fetch(API_ENDPOINTS.MOBILE_PAIR, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to pair with desktop' }));
      const errorMessage = error.error || `Failed to pair: ${response.statusText}`;
      console.error('Pairing failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        pairingCode: pairingCode.substring(0, 2) + '****', // Log partial code for debugging
        url: API_ENDPOINTS.MOBILE_PAIR,
      });
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Network error during pairing:', {
        url: API_ENDPOINTS.MOBILE_PAIR,
        error: error.message,
      });
      throw new Error(`Failed to connect to server. Make sure the server is running at ${API_ENDPOINTS.MOBILE_PAIR}`);
    }
    throw error;
  }
}

/**
 * Request desktop to start recording
 */
export async function startRecording(sessionId: string): Promise<StartRecordingResponse> {
  const response = await fetch(API_ENDPOINTS.RECORDING_START(sessionId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to start recording' }));
    throw new Error(error.error || `Failed to start recording: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Request desktop to stop recording
 */
export async function stopRecording(sessionId: string): Promise<StopRecordingResponse> {
  const response = await fetch(API_ENDPOINTS.RECORDING_STOP(sessionId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to stop recording' }));
    throw new Error(error.error || `Failed to stop recording: ${response.statusText}`);
  }

  return response.json();
}
