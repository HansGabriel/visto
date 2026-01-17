"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  captureScreenshot: () => {
    return electron.ipcRenderer.invoke("capture-screenshot");
  },
  startRecording: () => {
    return electron.ipcRenderer.invoke("start-recording");
  },
  stopRecording: () => {
    return electron.ipcRenderer.invoke("stop-recording");
  }
});
