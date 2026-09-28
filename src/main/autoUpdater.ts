import { app, BrowserWindow, dialog } from 'electron'
import { autoUpdater, type UpdateInfo } from 'electron-updater'
import { logger } from './services/logger'

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = false

let mainWindow: BrowserWindow | null = null
let installRequested: (() => void) | null = null
let downloaded = false
let installing = false

export function isInstallingUpdate(): boolean {
  return installing
}

export function initAutoUpdater(window: BrowserWindow, onInstallRequested: () => void): void {
  mainWindow = window
  installRequested = onInstallRequested
  autoUpdater.on('checking-for-update', () => logger.info('update.check'))
  autoUpdater.on('update-available', (info) => void showUpdateDialog(info))
  autoUpdater.on('update-not-available', (info) =>
    logger.info('update.not-available', { version: info.version })
  )
  autoUpdater.on('error', (error) => logger.error('update.error', error))
  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update:download-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    })
  })
  autoUpdater.on('update-downloaded', (info) => {
    downloaded = true
    void showRestartDialog(info)
  })
  setTimeout(() => void checkForUpdates(false), 5_000)
}

async function showUpdateDialog(info: UpdateInfo): Promise<void> {
  const result = await dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: 'A new version of Marxist is available.',
    detail: `Version ${info.version} is ready to download.`,
    buttons: ['Download Now', 'Later'],
    defaultId: 0,
    cancelId: 1,
  })
  if (result.response === 0) await autoUpdater.downloadUpdate()
}

async function showRestartDialog(info: UpdateInfo): Promise<void> {
  const result = await dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'The update is ready to install.',
    detail: `Version ${info.version} will restart Marxist after your recovery data is saved.`,
    buttons: ['Install & Restart', 'Later'],
    defaultId: 0,
    cancelId: 1,
  })
  if (result.response === 0) installRequested?.()
}

export function installDownloadedUpdate(): void {
  if (!downloaded) return
  installing = true
  autoUpdater.quitAndInstall(false, true)
}

export async function checkForUpdates(showNoUpdateDialog = true): Promise<void> {
  try {
    const result = await autoUpdater.checkForUpdates()
    if (showNoUpdateDialog && !result?.updateInfo) {
      await dialog.showMessageBox({
        type: 'info',
        title: 'No Updates',
        message: 'You’re up to date.',
        detail: `Marxist ${app.getVersion()} is the latest version.`,
        buttons: ['OK'],
      })
    }
  } catch (error) {
    logger.error('update.check', error)
    if (showNoUpdateDialog) {
      await dialog.showMessageBox({
        type: 'error',
        title: 'Update Check Failed',
        message: 'Could not check for updates.',
        detail: 'Please check your internet connection and try again.',
        buttons: ['OK'],
      })
    }
  }
}
