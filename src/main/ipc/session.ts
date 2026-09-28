import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { join } from 'path'
import { readFile } from 'fs/promises'
import type { DraftSnapshot } from '../../types/ipc'
import type { SessionState } from '../../types/session'
import { fail, ok } from '../../types/ipc'
import {
  clearAllDrafts,
  clearDraft,
  restoreSession,
  saveRecoverySnapshot,
} from '../services/sessionService'
import { markLaunched } from '../services/settingsService'
import { logger } from '../services/logger'

export function registerSessionHandlers(): void {
  ipcMain.handle('recovery:save', async (_event, data: {
    drafts: DraftSnapshot[]
    session: Omit<SessionState, 'savedAt' | 'appVersion'>
  }) => {
    try {
      await saveRecoverySnapshot(data.drafts, data.session)
      return ok(undefined)
    } catch (error) {
      logger.error('recovery.save', error)
      return fail(error, 'RECOVERY_SAVE_FAILED')
    }
  })
  ipcMain.handle('drafts:clear', async (_event, tabId: string) => {
    try {
      await clearDraft(tabId)
      return ok(undefined)
    } catch (error) {
      return fail(error, 'DRAFT_CLEAR_FAILED')
    }
  })
  ipcMain.handle('drafts:clear-all', async () => {
    try {
      await clearAllDrafts()
      return ok(undefined)
    } catch (error) {
      return fail(error, 'DRAFT_CLEAR_FAILED')
    }
  })
  ipcMain.handle('drafts:restore', async () => {
    const result = await restoreSession()
    return result.success ? ok(result) : fail(result.error || 'Restore failed', 'RESTORE_FAILED')
  })
  ipcMain.handle('app:save-before-quit', async (_event, data: {
    drafts: DraftSnapshot[]
    session: Omit<SessionState, 'savedAt' | 'appVersion'>
  }) => {
    try {
      await saveRecoverySnapshot(data.drafts, data.session)
      return ok(undefined)
    } catch (error) {
      logger.error('app.save-before-quit', error)
      return fail(error, 'RECOVERY_SAVE_FAILED')
    }
  })
  ipcMain.handle('app:confirm-quit-failure', async (_event, error: string) => {
    const result = await dialog.showMessageBox(BrowserWindow.getFocusedWindow()!, {
      type: 'error',
      title: 'Could Not Save Recovery Data',
      message: 'Marxist could not safely save your open documents.',
      detail: error,
      buttons: ['Retry', 'Cancel Quit', 'Quit Without Saving'],
      defaultId: 0,
      cancelId: 1,
    })
    return (['retry', 'cancel', 'discard'] as const)[result.response] || 'cancel'
  })
  ipcMain.handle('app:get-welcome-file', async () => {
    if (!markLaunched()) return ok({ isFirstRun: false, content: null })
    try {
      const path = app.isPackaged
        ? join(process.resourcesPath, 'markist_welcome.md')
        : join(__dirname, '../../assets/markist_welcome.md')
      return ok({
        isFirstRun: true,
        content: await readFile(path, 'utf8'),
        name: 'Welcome to Marxist.md',
      })
    } catch (error) {
      return fail(error, 'WELCOME_FILE_FAILED')
    }
  })
}
