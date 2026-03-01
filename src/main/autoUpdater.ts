import { autoUpdater, UpdateInfo } from 'electron-updater'
import { app, dialog, BrowserWindow } from 'electron'

autoUpdater.logger = console
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = false

let mainWindow: BrowserWindow | null = null
let updateDownloaded = false
let downloadedUpdateInfo: UpdateInfo | null = null
let isUpdating = false

export function isInstallingUpdate(): boolean {
  return isUpdating
}

export function initAutoUpdater(window: BrowserWindow): void {
  mainWindow = window

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...')
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    console.log('Update available:', info.version)
    showUpdateDialog(info)
  })

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    console.log('Update not available. Current version is up to date:', info.version)
  })

  autoUpdater.on('error', (err) => {
    console.error('Error in auto-updater:', err)
  })

  autoUpdater.on('download-progress', (progressObj) => {
    const message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`
    console.log(message)
    
    if (mainWindow) {
      mainWindow.webContents.send('update:download-progress', {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total,
      })
    }
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    console.log('Update downloaded:', info.version)
    updateDownloaded = true
    downloadedUpdateInfo = info
    showRestartDialog(info)
  })

  // Check for updates after a short delay on startup
  setTimeout(() => {
    checkForUpdates(false)
  }, 5000)
}

export function isUpdateDownloaded(): boolean {
  return updateDownloaded
}

export function installUpdateOnQuit(): void {
  if (updateDownloaded) {
    autoUpdater.quitAndInstall(false, true)
  }
}

async function showUpdateDialog(info: UpdateInfo): Promise<void> {
  const result = await dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: `A new version of Marxist is available!`,
    detail: `Version ${info.version} is ready to download.\n\nWould you like to download it now?`,
    buttons: ['Download Now', 'Later'],
    defaultId: 0,
    cancelId: 1,
  })

  if (result.response === 0) {
    console.log('User chose to download update')
    autoUpdater.downloadUpdate()
  } else {
    console.log('User chose to skip update')
  }
}

async function showRestartDialog(info: UpdateInfo): Promise<void> {
  const result = await dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'Update downloaded!',
    detail: `Version ${info.version} has been downloaded.\n\nClick "Install & Restart" to apply the update now.`,
    buttons: ['Install & Restart', 'Later'],
    defaultId: 0,
    cancelId: 1,
  })

  if (result.response === 0) {
    console.log('User chose to restart and install update')
    isUpdating = true
    
    // Force quit and install - delay slightly to ensure flag is set
    setTimeout(() => {
      autoUpdater.quitAndInstall(false, true)
    }, 100)
  } else {
    console.log('User chose to install update later')
  }
}

export async function checkForUpdates(showNoUpdateDialog: boolean = true): Promise<void> {
  try {
    const result = await autoUpdater.checkForUpdates()
    
    if (showNoUpdateDialog && !result?.updateInfo) {
      await dialog.showMessageBox({
        type: 'info',
        title: 'No Updates',
        message: 'You\'re up to date!',
        detail: `Marxist ${app.getVersion()} is the latest version.`,
        buttons: ['OK'],
      })
    }
  } catch (error) {
    console.error('Failed to check for updates:', error)
    
    if (showNoUpdateDialog) {
      await dialog.showMessageBox({
        type: 'error',
        title: 'Update Check Failed',
        message: 'Could not check for updates',
        detail: 'Please check your internet connection and try again.',
        buttons: ['OK'],
      })
    }
  }
}

export function getAutoUpdater() {
  return autoUpdater
}
