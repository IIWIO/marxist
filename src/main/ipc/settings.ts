import { ipcMain } from 'electron'
import type { PublicSettingKey, PublicSettings } from '../../types/ipc'
import { fail, ok } from '../../types/ipc'
import {
  getPublicSettings,
  resetSettings,
  setApiKey,
  setSetting,
} from '../services/settingsService'
import { logger } from '../services/logger'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', () => {
    try {
      return ok(getPublicSettings())
    } catch (error) {
      logger.error('settings.get', error)
      return fail(error, 'SETTINGS_READ_FAILED')
    }
  })
  ipcMain.handle(
    'settings:set',
    (_event, key: PublicSettingKey, value: PublicSettings[PublicSettingKey]) => {
      try {
        return ok(setSetting(key, value))
      } catch (error) {
        logger.error('settings.set', error, { key })
        return fail(error, 'SETTINGS_WRITE_FAILED')
      }
    }
  )
  ipcMain.handle('settings:set-api-key', (_event, apiKey: string) => {
    try {
      return ok(setApiKey(apiKey))
    } catch (error) {
      logger.error('settings.key', error)
      return fail(error, 'SECURE_STORAGE_UNAVAILABLE')
    }
  })
  ipcMain.handle('settings:reset', () => {
    try {
      return ok(resetSettings())
    } catch (error) {
      return fail(error, 'SETTINGS_WRITE_FAILED')
    }
  })
}
