import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { basename } from 'path'
import { readFile, writeFile } from 'fs/promises'
import { fail, ok } from '../../types/ipc'
import { getPublicSettings } from '../services/settingsService'
import { logger } from '../services/logger'

export function registerFileHandlers(): void {
  ipcMain.handle('file:open', async () => {
    const window = BrowserWindow.getFocusedWindow()
    const options: Electron.OpenDialogOptions = {
      properties: ['openFile'],
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown'] },
        { name: 'Text', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    }
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return ok({ path: null, name: '', content: '' })
    const path = result.filePaths[0]
    try {
      return ok({ path, name: basename(path), content: await readFile(path, 'utf8') })
    } catch (error) {
      logger.error('file.open', error, { path })
      return fail(error, 'FILE_OPEN_FAILED')
    }
  })

  ipcMain.handle('file:save', async (_event, path: string, content: string) => {
    try {
      await writeFile(path, content, 'utf8')
      return ok(undefined)
    } catch (error) {
      logger.error('file.save', error, { path })
      return fail(error, 'FILE_SAVE_FAILED')
    }
  })

  ipcMain.handle('file:save-as', async (_event, content: string) => {
    const window = BrowserWindow.getFocusedWindow()
    const options: Electron.SaveDialogOptions = {
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'Text', extensions: ['txt'] },
      ],
      properties: ['createDirectory', 'showOverwriteConfirmation'],
    }
    const result = window
      ? await dialog.showSaveDialog(window, options)
      : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return ok({ path: null })
    try {
      await writeFile(result.filePath, content, 'utf8')
      return ok({ path: result.filePath, name: basename(result.filePath) })
    } catch (error) {
      logger.error('file.save-as', error, { path: result.filePath })
      return fail(error, 'FILE_SAVE_FAILED')
    }
  })

  ipcMain.handle('file:get-recent', () => ok(getPublicSettings().recentFiles))

  ipcMain.handle('file:drop', async (_event, path: string) => {
    try {
      return ok({ path, name: basename(path), content: await readFile(path, 'utf8') })
    } catch (error) {
      logger.error('file.drop', error, { path })
      return fail(error, 'FILE_OPEN_FAILED')
    }
  })

  ipcMain.handle('file:open-external', async (_event, url: string) => {
    try {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol)) return fail('Invalid URL protocol', 'INVALID_URL')
      await shell.openExternal(url)
      return ok(undefined)
    } catch (error) {
      return fail(error, 'OPEN_EXTERNAL_FAILED')
    }
  })

  ipcMain.handle('file:show-error', async (_event, title: string, message: string, detail?: string) => {
    await dialog.showMessageBox({ type: 'error', title, message, detail })
  })

  ipcMain.handle('file:confirm-close', async (_event, fileName: string) => {
    const result = await dialog.showMessageBox({
      type: 'warning',
      title: 'Unsaved Changes',
      message: `Save changes to “${fileName}” before closing?`,
      buttons: ['Save', 'Cancel', 'Discard'],
      defaultId: 0,
      cancelId: 1,
    })
    return (['save', 'cancel', 'discard'] as const)[result.response] || 'cancel'
  })
}
