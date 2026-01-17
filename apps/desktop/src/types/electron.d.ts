declare global {
  interface Window {
    electronAPI: {
      // Electron IPC serializes Buffer as ArrayBuffer, which we handle as Uint8Array
      captureScreenshot: () => Promise<Uint8Array>
      startRecording: () => Promise<{ streamId: string }>
      stopRecording: () => Promise<{ success: boolean }>
    }
  }
}

export {}