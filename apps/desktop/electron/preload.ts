import { contextBridge, ipcRenderer } from 'electron'

// --------- Expose secure API to the Renderer process ---------
// Using contextBridge.exposeInMainWorld() for secure API exposure
// Only exposing specific functions, not raw ipcRenderer methods
contextBridge.exposeInMainWorld('electronAPI', {
  captureScreenshot: () => {
    return ipcRenderer.invoke('capture-screenshot')
  },
  startRecording: () => {
    return ipcRenderer.invoke('start-recording')
  },
  stopRecording: () => {
    return ipcRenderer.invoke('stop-recording')
  },
})
