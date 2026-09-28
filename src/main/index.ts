import { app, BrowserWindow, ipcMain } from 'electron'
import { ok, fail } from '../types/ipc'
import { createMainWindow } from './window'
import { createApplicationMenu } from './menu'
import { registerAIHandlers } from './ipc/ai'
import { registerFileHandlers } from './ipc/files'
import { registerSessionHandlers } from './ipc/session'
import { registerSettingsHandlers } from './ipc/settings'
import {
  checkForUpdates,
  initAutoUpdater,
  installDownloadedUpdate,
  isInstallingUpdate,
} from './autoUpdater'
import { copyDiagnostics, logger } from './services/logger'

let mainWindow: BrowserWindow | null = null
let fileToOpenOnReady: string | null = null
let quitApproved = false
let requestedQuitReason: 'quit' | 'update' = 'quit'

function requestSafeQuit(reason: 'quit' | 'update'): void {
  requestedQuitReason = reason
  if (!mainWindow || mainWindow.isDestroyed()) {
    if (reason === 'update') installDownloadedUpdate()
    else app.quit()
    return
  }
  mainWindow.webContents.send('app:quit-requested', { reason })
}

function wireWindow(window: BrowserWindow): void {
  window.on('close', (event) => {
    if (quitApproved || isInstallingUpdate()) return
    event.preventDefault()
    requestSafeQuit('quit')
  })
  window.webContents.on('did-finish-load', () => {
    if (!fileToOpenOnReady) return
    window.webContents.send('app:open-file', fileToOpenOnReady)
    fileToOpenOnReady = null
  })
}

function createAndWireWindow(): BrowserWindow {
  const window = createMainWindow()
  wireWindow(window)
  createApplicationMenu(window, checkForUpdates)
  return window
}

function registerAppHandlers(): void {
  ipcMain.handle('app:get-version', () => ok(app.getVersion()))
  ipcMain.handle('app:check-for-updates', async () => {
    try {
      await checkForUpdates(true)
      return ok(undefined)
    } catch (error) {
      return fail(error, 'UPDATE_CHECK_FAILED')
    }
  })
  ipcMain.handle('app:copy-diagnostics', async () => {
    try {
      await copyDiagnostics()
      return ok(undefined)
    } catch (error) {
      return fail(error, 'DIAGNOSTICS_COPY_FAILED')
    }
  })
  ipcMain.on('app:ready-to-quit', (_event, reason: 'quit' | 'update') => {
    if (reason !== requestedQuitReason) return
    quitApproved = true
    if (reason === 'update') installDownloadedUpdate()
    else app.quit()
  })
}

function registerIpcHandlers(): void {
  registerFileHandlers()
  registerSettingsHandlers()
  registerSessionHandlers()
  registerAIHandlers()
  registerAppHandlers()
}

app.on('open-file', (event, path) => {
  event.preventDefault()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app:open-file', path)
    mainWindow.focus()
  } else {
    fileToOpenOnReady = path
  }
})

function initialize(): void {
  if (!app.requestSingleInstanceLock()) {
    app.quit()
    return
  }

  app.on('second-instance', (_event, commandLine) => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    const path = commandLine.find((argument) => /\.(md|markdown|txt)$/i.test(argument))
    if (path) mainWindow.webContents.send('app:open-file', path)
  })

  void app.whenReady().then(() => {
    app.setName('Marxist')
    registerIpcHandlers()
    mainWindow = createAndWireWindow()
    if (app.isPackaged) initAutoUpdater(mainWindow, () => requestSafeQuit('update'))

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) mainWindow = createAndWireWindow()
    })
  })

  app.on('before-quit', (event) => {
    if (quitApproved || isInstallingUpdate() || !mainWindow || mainWindow.isDestroyed()) return
    event.preventDefault()
    requestSafeQuit('quit')
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && !quitApproved) requestSafeQuit('quit')
  })

  process.on('uncaughtException', (error) => logger.error('process.uncaught-exception', error))
  process.on('unhandledRejection', (error) => logger.error('process.unhandled-rejection', error))
}

initialize()
