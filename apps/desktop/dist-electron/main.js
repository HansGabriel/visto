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
    width: 600,
    height: 400,
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    frame: true,
    // Changed to true so you can see the window controls
    show: true,
    // Changed to true so window appears automatically
    skipTaskbar: false,
    // Changed to false so it appears in taskbar/dock
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      contextIsolation: true,
      // Mandatory
      sandbox: true
      // Strongly recommended
    }
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
  win.once("ready-to-show", () => {
    win == null ? void 0 : win.show();
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
    const primaryDisplay = screen.getPrimaryDisplay();
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: primaryDisplay.size
    });
    if (sources.length === 0) {
      throw new Error("No screen sources available");
    }
    const buffer = sources[0].thumbnail.toPNG();
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Screenshot capture error:", error);
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
