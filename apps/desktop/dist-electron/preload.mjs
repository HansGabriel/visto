import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("electronAPI", {
  captureScreenshot: () => {
    return ipcRenderer.invoke("capture-screenshot");
  },
  startRecording: () => {
    return ipcRenderer.invoke("start-recording");
  },
  stopRecording: () => {
    return ipcRenderer.invoke("stop-recording");
  }
});
