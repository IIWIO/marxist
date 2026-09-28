import { BrowserWindow, screen, shell } from 'electron'
import Store from 'electron-store'
import { join } from 'path'
import { logger } from './services/logger'

interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized: boolean
}

const DEFAULT_STATE: WindowState = { width: 1200, height: 800, isMaximized: false }
let windowStore: Store<{ windowState: WindowState }> | null = null

function getStore(): Store<{ windowState: WindowState }> {
  windowStore ||= new Store({ name: 'window-state', defaults: { windowState: DEFAULT_STATE } })
  return windowStore
}

function restoredState(): WindowState {
  const saved = getStore().get('windowState')
  const visible = screen.getAllDisplays().some(({ bounds }) =>
    saved.x !== undefined &&
    saved.y !== undefined &&
    saved.x >= bounds.x &&
    saved.x < bounds.x + bounds.width &&
    saved.y >= bounds.y &&
    saved.y < bounds.y + bounds.height
  )
  return visible ? saved : DEFAULT_STATE
}

export function createMainWindow(): BrowserWindow {
  const state = restoredState()
  const window = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 800,
    minHeight: 500,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 14 },
    backgroundColor: '#1E1E1E',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  window.on('close', () => {
    try {
      const bounds = window.getBounds()
      getStore().set('windowState', {
        ...bounds,
        isMaximized: window.isMaximized(),
      })
    } catch (error) {
      logger.error('window.state.save', error)
    }
  })
  if (state.isMaximized) window.maximize()
  window.once('ready-to-show', () => window.show())
  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const protocol = new URL(url).protocol
      if (protocol === 'https:' || protocol === 'http:') void shell.openExternal(url)
    } catch {
      logger.warn('window.open.invalid-url', { url })
    }
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, url) => {
    if (url === window.webContents.getURL()) return
    event.preventDefault()
    try {
      const protocol = new URL(url).protocol
      if (protocol === 'https:' || protocol === 'http:') void shell.openExternal(url)
    } catch {
      logger.warn('window.navigate.invalid-url', { url })
    }
  })
  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(__dirname, '../renderer/index.html'))
  return window
}
