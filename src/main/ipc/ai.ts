import { BrowserWindow, ipcMain } from 'electron'
import type { ChatParams, EditParams } from '../../types/ipc'
import { fail, ok } from '../../types/ipc'
import { getApiKey } from '../services/settingsService'
import {
  chat,
  edit,
  listModels,
  OpenRouterError,
  verifyApiKey,
} from '../services/openRouterService'
import { logger } from '../services/logger'

const activeStreams = new Map<string, AbortController>()

function errorDetails(error: unknown): { message: string; code?: string } {
  if (error instanceof OpenRouterError) return { message: error.message, code: error.code }
  if (error instanceof Error && error.name === 'AbortError') return { message: 'aborted', code: 'ABORTED' }
  return { message: error instanceof Error ? error.message : String(error) }
}

export function registerAIHandlers(): void {
  ipcMain.handle('ai:verify-key', async (_event, apiKey: string) => {
    try {
      await verifyApiKey(apiKey)
      return ok(undefined)
    } catch (error) {
      const details = errorDetails(error)
      return fail(details.message, details.code)
    }
  })

  ipcMain.handle('ai:list-models', async () => {
    const apiKey = getApiKey()
    if (!apiKey) return fail('No API key configured', 'NO_API_KEY')
    try {
      return ok(await listModels(apiKey))
    } catch (error) {
      const details = errorDetails(error)
      return fail(details.message, details.code)
    }
  })

  ipcMain.handle('ai:chat', async (event, params: ChatParams) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const apiKey = getApiKey()
    if (!window) return fail('Window not found', 'WINDOW_NOT_FOUND')
    if (!apiKey) return fail('No API key configured', 'NO_API_KEY')
    const controller = new AbortController()
    activeStreams.set(params.streamId, controller)
    try {
      const content = await chat(apiKey, params, controller.signal, (chunk, fullContent) => {
        window.webContents.send('ai:stream-chunk', { streamId: params.streamId, content: chunk, fullContent })
      })
      window.webContents.send('ai:stream-complete', { streamId: params.streamId, content })
      return ok({ content })
    } catch (error) {
      const details = errorDetails(error)
      if (details.code !== 'ABORTED') logger.error('ai.chat', error, { streamId: params.streamId })
      window.webContents.send('ai:stream-error', { streamId: params.streamId, error: details.message })
      return fail(details.message, details.code)
    } finally {
      activeStreams.delete(params.streamId)
    }
  })

  ipcMain.handle('ai:edit', async (event, params: EditParams) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const apiKey = getApiKey()
    if (!window) return fail('Window not found', 'WINDOW_NOT_FOUND')
    if (!apiKey) return fail('No API key configured', 'NO_API_KEY')
    const controller = new AbortController()
    activeStreams.set(params.streamId, controller)
    try {
      const content = await edit(apiKey, params, controller.signal)
      window.webContents.send('ai:edit-complete', { streamId: params.streamId, content })
      return ok({ content })
    } catch (error) {
      const details = errorDetails(error)
      if (details.code !== 'ABORTED') logger.error('ai.edit', error, { streamId: params.streamId })
      window.webContents.send('ai:edit-error', { streamId: params.streamId, error: details.message })
      return fail(details.message, details.code)
    } finally {
      activeStreams.delete(params.streamId)
    }
  })

  ipcMain.handle('ai:cancel', (_event, streamId: string) => {
    activeStreams.get(streamId)?.abort()
    activeStreams.delete(streamId)
    return ok(undefined)
  })
}
