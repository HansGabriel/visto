import { app, BrowserWindow, Tray, Menu, ipcMain, desktopCapturer, screen, nativeImage } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null = null
let tray: Tray | null = null

function createWindow() {
  win = new BrowserWindow({
    width: 600,
    height: 400,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    frame: true, // Changed to true so you can see the window controls
    show: true,  // Changed to true so window appears automatically
    skipTaskbar: false, // Changed to false so it appears in taskbar/dock
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true, // Mandatory
      sandbox: true, // Strongly recommended
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  // Show window when ready
  win.once('ready-to-show', () => {
    win?.show()
  })

  // Hide window when closed instead of quitting
  win.on('close', (event) => {
    if (process.platform !== 'darwin') {
      event.preventDefault()
      win?.hide()
    }
  })
}

function createTray() {
  // Create tray with empty icon - Electron will use default system icon
  try {
    const emptyIcon = nativeImage.createEmpty()
    tray = new Tray(emptyIcon)
  } catch (error: unknown) {
    console.error('Failed to create tray:', error)
    return
  }
  
  if (!tray) return

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Window',
      click: () => {
        if (win) {
          win.show()
        } else {
          createWindow()
        }
      },
    },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setToolTip('Desktop AI Assistant')
  tray.setContextMenu(contextMenu)

  // Show window when tray icon is clicked
  tray.on('click', () => {
    if (win) {
      if (win.isVisible()) {
        win.hide()
      } else {
        win.show()
      }
    } else {
      createWindow()
    }
  })
}

// IPC Handlers using ipcMain.handle() pattern
ipcMain.handle('capture-screenshot', async () => {
  try {
    const primaryDisplay = screen.getPrimaryDisplay()
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: primaryDisplay.size,
    })
    
    if (sources.length === 0) {
      throw new Error('No screen sources available')
    }
    
    // Get PNG buffer - Electron serializes Buffer through IPC as ArrayBuffer
    // We convert to Uint8Array to match renderer type expectations
    const buffer = sources[0].thumbnail.toPNG()
    // Buffer extends Uint8Array, but for explicit typing we create a new Uint8Array
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Screenshot capture error:', error)
    throw new Error(`Failed to capture screenshot: ${errorMessage}`)
  }
})

ipcMain.handle('start-recording', async () => {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'] })
    if (sources.length === 0) {
      throw new Error('No screen sources available')
    }
    return { streamId: sources[0].id }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Start recording error:', error)
    throw new Error(`Failed to start recording: ${errorMessage}`)
  }
})

ipcMain.handle('stop-recording', async () => {
  // This will be handled in the renderer process with MediaRecorder
  // Main process just needs to acknowledge
  return { success: true }
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit - keep running in tray
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createTray()
  createWindow()
})
