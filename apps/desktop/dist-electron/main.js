import { ipcMain, screen, desktopCapturer, app, BrowserWindow, nativeImage, Tray, Menu } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win = null;
let tray = null;
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 375,
    // Mobile minimum width
    minHeight: 667,
    // Mobile minimum height
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    frame: true,
    show: true,
    skipTaskbar: false,
    backgroundColor: "#000000",
    // Match dark theme
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      contextIsolation: true,
      // Mandatory
      sandbox: true,
      // Strongly recommended - CSP handles localhost connections
      webSecurity: true
      // Keep web security enabled
    }
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
  win.once("ready-to-show", () => {
    win == null ? void 0 : win.show();
    if (process.env.NODE_ENV === "development" || VITE_DEV_SERVER_URL) {
      win == null ? void 0 : win.webContents.openDevTools();
    }
  });
  win.on("close", (event) => {
    if (process.platform !== "darwin") {
      event.preventDefault();
      win == null ? void 0 : win.hide();
    }
  });
}
function createTray() {
  try {
    const emptyIcon = nativeImage.createEmpty();
    tray = new Tray(emptyIcon);
  } catch (error) {
    console.error("Failed to create tray:", error);
    return;
  }
  if (!tray) return;
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show Window",
      click: () => {
        if (win) {
          win.show();
        } else {
          createWindow();
        }
      }
    },
    {
      label: "Quit",
      click: () => {
        app.quit();
      }
    }
  ]);
  tray.setToolTip("Desktop AI Assistant");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    if (win) {
      if (win.isVisible()) {
        win.hide();
      } else {
        win.show();
      }
    } else {
      createWindow();
    }
  });
}
ipcMain.handle("capture-screenshot", async () => {
  try {
    console.log("📸 [Main] Starting screenshot capture...");
    const primaryDisplay = screen.getPrimaryDisplay();
    console.log("📸 [Main] Primary display size:", primaryDisplay.size);
    console.log("📸 [Main] Requesting screen sources...");
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: primaryDisplay.size
    });
    console.log("📸 [Main] Screen sources found:", sources.length);
    if (sources.length === 0) {
      const errorMsg = "No screen sources available. Please grant screen recording permissions in System Settings > Privacy & Security > Screen Recording, then restart the app.";
      console.error("📸 [Main]", errorMsg);
      throw new Error(errorMsg);
    }
    console.log("📸 [Main] Converting screenshot to PNG buffer...");
    const buffer = sources[0].thumbnail.toPNG();
    console.log("📸 [Main] Screenshot buffer size:", buffer.length, "bytes");
    const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    console.log("📸 [Main] Screenshot capture successful, returning to renderer");
    return uint8Array;
  } catch (error) {
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message || "Unknown error occurred";
      console.error("📸 [Main] Screenshot capture error:", errorMessage);
      if (error.stack) {
        console.error("📸 [Main] Error stack:", error.stack);
      }
    } else {
      errorMessage = String(error);
      console.error("📸 [Main] Screenshot capture error (non-Error):", error);
    }
    if (errorMessage.includes("Failed to get sources") || errorMessage.includes("get sources")) {
      throw new Error("Screen recording permission denied. Please grant screen recording permissions in System Settings > Privacy & Security > Screen Recording, then restart the app.");
    }
    throw new Error(`Failed to capture screenshot: ${errorMessage}`);
  }
});
ipcMain.handle("start-recording", async () => {
  try {
    const sources = await desktopCapturer.getSources({ types: ["screen"] });
    if (sources.length === 0) {
      throw new Error("No screen sources available");
    }
    return { streamId: sources[0].id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Start recording error:", error);
    throw new Error(`Failed to start recording: ${errorMessage}`);
  }
});
ipcMain.handle("stop-recording", async () => {
  return { success: true };
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") ;
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  createTray();
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
