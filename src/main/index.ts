import { app, BrowserWindow, shell, screen, Menu, ipcMain, dialog } from 'electron'
import { join, basename } from 'path'
import { readFile, writeFile } from 'fs/promises'
import Store from 'electron-store'
import {
  saveDraft,
  saveAllDrafts,
  clearDraft,
  clearAllDrafts,
  saveSessionState,
  restoreSession,
  getAppVersion,
} from './services/sessionService'
import { initAutoUpdater, checkForUpdates, isInstallingUpdate } from './autoUpdater'
import type { SessionState } from '../types/session'

interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized: boolean
}

interface Settings {
  theme: 'system' | 'light' | 'dark'
  editorFontSize: number
  previewFontSize: number
  lineNumbers: boolean
  wordWrap: boolean
  spellCheck: boolean
  openRouterApiKey: string
  selectedModel: string
  systemPrompt: string
  recentFiles: Array<{ path: string; name: string; lastOpened: string }>
  hasLaunchedBefore: boolean
  isApiKeyVerified: boolean
}

const defaultSettings: Settings = {
  theme: 'system',
  editorFontSize: 14,
  previewFontSize: 16,
  lineNumbers: false,
  wordWrap: true,
  spellCheck: true,
  openRouterApiKey: '',
  selectedModel: 'anthropic/claude-sonnet-4-20250514',
  systemPrompt:
    'You are a helpful writing assistant. Help the user improve their Markdown documents. When asked to edit, return the complete modified document.',
  recentFiles: [],
  hasLaunchedBefore: false,
  isApiKeyVerified: false,
}

let windowStore: Store<{ windowState: WindowState }> | null = null
let settingsStore: Store<{ settings: Settings }> | null = null

function getWindowStore(): Store<{ windowState: WindowState }> {
  if (!windowStore) {
    windowStore = new Store<{ windowState: WindowState }>({
      name: 'window-state',
      clearInvalidConfig: true,
    })
  }
  return windowStore
}

function getSettingsStore(): Store<{ settings: Settings }> {
  if (!settingsStore) {
    settingsStore = new Store<{ settings: Settings }>({
      name: 'settings',
      defaults: { settings: defaultSettings },
      clearInvalidConfig: true,
    })
  }
  return settingsStore
}

const DEFAULT_WIDTH = 1200
const DEFAULT_HEIGHT = 800
const MIN_WIDTH = 800
const MIN_HEIGHT = 500

function getWindowState(): WindowState {
  const defaultState: WindowState = {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    isMaximized: false,
  }

  try {
    const saved = getWindowStore().get('windowState')
    if (!saved) return defaultState

    const displays = screen.getAllDisplays()
    const isValidPosition = displays.some((display) => {
      const { x, y, width, height } = display.bounds
      return (
        saved.x !== undefined &&
        saved.y !== undefined &&
        saved.x >= x &&
        saved.x < x + width &&
        saved.y >= y &&
        saved.y < y + height
      )
    })

    return isValidPosition ? saved : defaultState
  } catch {
    return defaultState
  }
}

function saveWindowState(window: BrowserWindow): void {
  try {
    const bounds = window.getBounds()
    getWindowStore().set('windowState', {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: window.isMaximized(),
    })
  } catch {
    // Ignore save errors
  }
}

function createWindow(): BrowserWindow {
  const state = getWindowState()

  const mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 14 },
    backgroundColor: '#1E1E1E',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('close', () => {
    saveWindowState(mainWindow)
  })

  if (state.isMaximized) {
    mainWindow.maximize()
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

function createMenu(mainWindow: BrowserWindow): void {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              {
                label: 'Check for Updates...',
                click: () => checkForUpdates(true),
              },
              { type: 'separator' as const },
              {
                label: 'Settings...',
                accelerator: 'Cmd+,',
                click: () => mainWindow.webContents.send('menu:settings'),
              },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),

    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu:new-file'),
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu:open-file'),
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu:save'),
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow.webContents.send('menu:save-as'),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },

    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find...',
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow.webContents.send('menu:find'),
        },
      ],
    },

    {
      label: 'View',
      submenu: [
        {
          label: 'Markdown',
          accelerator: 'CmdOrCtrl+1',
          click: () => mainWindow.webContents.send('menu:view-markdown'),
        },
        {
          label: 'Split',
          accelerator: 'CmdOrCtrl+2',
          click: () => mainWindow.webContents.send('menu:view-split'),
        },
        {
          label: 'Render',
          accelerator: 'CmdOrCtrl+3',
          click: () => mainWindow.webContents.send('menu:view-render'),
        },
        { type: 'separator' },
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+\\',
          click: () => mainWindow.webContents.send('menu:toggle-sidebar'),
        },
        {
          label: 'Toggle AI Panel',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => mainWindow.webContents.send('menu:toggle-ai'),
        },
        { type: 'separator' },
        {
          label: 'Toggle Theme',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => mainWindow.webContents.send('menu:toggle-theme'),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },

    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates...',
          click: () => checkForUpdates(true),
        },
        { type: 'separator' },
        {
          label: 'About Marxist',
          click: () => mainWindow.webContents.send('menu:about'),
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function registerIpcHandlers(): void {
  ipcMain.handle('file:open', async () => {
    const window = BrowserWindow.getFocusedWindow()

    const result = await dialog.showOpenDialog(window!, {
      properties: ['openFile'],
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown'] },
        { name: 'Text', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { path: null, name: '', content: '' }
    }

    const filePath = result.filePaths[0]
    try {
      const content = await readFile(filePath, 'utf-8')
      const name = basename(filePath)
      return { path: filePath, name, content }
    } catch (error) {
      return { path: null, name: '', content: '', error: (error as Error).message }
    }
  })

  ipcMain.handle('file:save', async (_, path: string, content: string) => {
    try {
      await writeFile(path, content, 'utf-8')
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('file:save-as', async (_, content: string) => {
    const window = BrowserWindow.getFocusedWindow()

    const result = await dialog.showSaveDialog(window!, {
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'Text', extensions: ['txt'] },
      ],
      properties: ['createDirectory', 'showOverwriteConfirmation'],
    })

    if (result.canceled || !result.filePath) {
      return { path: null }
    }

    try {
      await writeFile(result.filePath, content, 'utf-8')
      return { path: result.filePath, name: basename(result.filePath) }
    } catch (error) {
      return { path: null, error: (error as Error).message }
    }
  })

  ipcMain.handle('file:get-recent', async () => [])

  ipcMain.handle('file:drop', async (_, filePath: string) => {
    try {
      const content = await readFile(filePath, 'utf-8')
      const name = basename(filePath)
      return { path: filePath, name, content }
    } catch (error) {
      return { path: null, name: '', content: '', error: (error as Error).message }
    }
  })

  ipcMain.handle('file:open-external', async (_, url: string) => {
    try {
      const parsedUrl = new URL(url)
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return { success: false, error: 'Invalid URL protocol' }
      }
      await shell.openExternal(url)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('app:get-welcome-file', async () => {
    try {
      const store = getSettingsStore()
      const settings = store.get('settings')
      
      if (settings.hasLaunchedBefore) {
        return { isFirstRun: false, content: null }
      }
      
      store.set('settings', { ...settings, hasLaunchedBefore: true })
      
      const welcomeFilePath = app.isPackaged
        ? join(process.resourcesPath, 'markist_welcome.md')
        : join(__dirname, '../../assets/markist_welcome.md')
      
      const content = await readFile(welcomeFilePath, 'utf-8')
      return { isFirstRun: true, content, name: 'Welcome to Marxist.md' }
    } catch (error) {
      console.error('Failed to load welcome file:', error)
      return { isFirstRun: false, content: null, error: (error as Error).message }
    }
  })

  ipcMain.handle('drafts:save', async (_, tabId: string, content: string, metadata: unknown) => {
    try {
      saveDraft(tabId, content, metadata as Parameters<typeof saveDraft>[2])
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('drafts:save-all', async (_, drafts: unknown[]) => {
    try {
      saveAllDrafts(drafts as Parameters<typeof saveAllDrafts>[0])
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('drafts:clear', async (_, tabId: string) => {
    try {
      clearDraft(tabId)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('drafts:clear-all', async () => {
    try {
      clearAllDrafts()
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('drafts:restore', async () => {
    return restoreSession()
  })

  ipcMain.handle('session:save', async (_, state: Omit<SessionState, 'savedAt' | 'appVersion'>) => {
    try {
      saveSessionState({
        ...state,
        savedAt: new Date().toISOString(),
        appVersion: getAppVersion(),
      })
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Settings handlers
  ipcMain.handle('settings:get', () => {
    try {
      return getSettingsStore().get('settings')
    } catch {
      return defaultSettings
    }
  })

  ipcMain.handle('settings:set', (_, key: keyof Settings, value: unknown) => {
    try {
      const settings = getSettingsStore().get('settings')
      getSettingsStore().set('settings', { ...settings, [key]: value })
      return getSettingsStore().get('settings')
    } catch {
      return defaultSettings
    }
  })

  ipcMain.handle('settings:reset', () => {
    try {
      getSettingsStore().set('settings', defaultSettings)
      return defaultSettings
    } catch {
      return defaultSettings
    }
  })

  const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1'

  ipcMain.handle('ai:verify-key', async (_, apiKey: string) => {
    try {
      const response = await fetch(`${OPENROUTER_API_URL}/auth/key`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://marxist.app',
          'X-Title': 'Marxist',
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          return { valid: false, error: 'Invalid API key' }
        }
        const error = await response.json().catch(() => ({}))
        return {
          valid: false,
          error: error.message || `HTTP ${response.status}`,
        }
      }

      return { valid: true }
    } catch (error) {
      return {
        valid: false,
        error: (error as Error).message,
      }
    }
  })

  ipcMain.handle('ai:list-models', async () => {
    const settings = getSettingsStore().get('settings')
    const apiKey = settings.openRouterApiKey

    if (!apiKey) {
      return { error: 'No API key configured' }
    }

    try {
      const response = await fetch(`${OPENROUTER_API_URL}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://marxist.app',
          'X-Title': 'Marxist',
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        return { error: error.message || `HTTP ${response.status}` }
      }

      const data = (await response.json()) as { data?: Array<{ id: string; name?: string; context_length?: number }> }

      const models = (data.data || []).map((model) => ({
        id: model.id,
        name: model.name || model.id,
        contextLength: model.context_length || 4096,
      }))

      models.sort((a, b) => a.name.localeCompare(b.name))

      return { models }
    } catch (error) {
      return { error: (error as Error).message }
    }
  })

  const activeStreams = new Map<string, AbortController>()

  ipcMain.handle(
    'ai:chat',
    async (
      event,
      params: {
        message: string
        documentContent: string
        history: Array<{ role: string; content: string }>
        systemPrompt: string
        model: string
        streamId?: string
      }
    ) => {
      const settings = getSettingsStore().get('settings')
      const apiKey = settings.openRouterApiKey

      if (!apiKey) {
        return { error: 'No API key configured' }
      }

      const streamId = params.streamId || `stream-${Date.now()}`
      const controller = new AbortController()
      activeStreams.set(streamId, controller)

      try {
        const messages = [
          { role: 'system', content: params.systemPrompt },
          { role: 'system', content: `Current document:\n\n${params.documentContent}` },
          ...params.history,
          { role: 'user', content: params.message },
        ]

        const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://marxist.app',
            'X-Title': 'Marxist',
          },
          body: JSON.stringify({
            model: params.model || 'anthropic/claude-sonnet-4-20250514',
            messages,
            stream: true,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const error = (await response.json().catch(() => ({}))) as { message?: string }
          return { error: error.message || `HTTP ${response.status}` }
        }

        const window = BrowserWindow.fromWebContents(event.sender)
        if (!window) {
          return { error: 'Window not found' }
        }

        const reader = response.body?.getReader()
        if (!reader) {
          return { error: 'No response body' }
        }

        const decoder = new TextDecoder()
        let fullContent = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue

                try {
                  const parsed = JSON.parse(data) as {
                    choices?: Array<{ delta?: { content?: string } }>
                  }
                  const content = parsed.choices?.[0]?.delta?.content || ''

                  if (content) {
                    fullContent += content
                    window.webContents.send('ai:stream-chunk', {
                      streamId,
                      content,
                      fullContent,
                    })
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }
        } finally {
          reader.releaseLock()
        }

        activeStreams.delete(streamId)

        window.webContents.send('ai:stream-complete', { streamId, content: fullContent })

        return { success: true, content: fullContent }
      } catch (error) {
        activeStreams.delete(streamId)

        if ((error as Error).name === 'AbortError') {
          return { error: 'aborted' }
        }

        return { error: (error as Error).message }
      }
    }
  )

  ipcMain.handle(
    'ai:edit',
    async (
      event,
      params: {
        instruction: string
        documentContent: string
        model: string
        systemPrompt: string
        streamId?: string
      }
    ) => {
      const settings = getSettingsStore().get('settings')
      const apiKey = settings.openRouterApiKey

      if (!apiKey) {
        return { error: 'No API key configured' }
      }

      const streamId = params.streamId || `edit-${Date.now()}`
      const controller = new AbortController()
      activeStreams.set(streamId, controller)

      try {
        const editSystemPrompt = `You are editing a Markdown document. Return ONLY a JSON array of search/replace operations.

RULES:
1. Return a JSON array of objects with "find" and "replace" keys
2. The "find" value must be an EXACT match of text in the document (including whitespace)
3. The "replace" value is what to replace it with
4. Only include changes that are necessary for the user's request
5. Return ONLY the JSON array - no markdown code fences, no explanations
6. If no changes are needed, return an empty array: []

EXAMPLE FORMAT:
[{"find": "old text here", "replace": "new text here"}, {"find": "another old", "replace": "another new"}]

CURRENT DOCUMENT:
${params.documentContent}

USER REQUEST: ${params.instruction}

Return ONLY the JSON array of replacements:`

        const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://marxist.app',
            'X-Title': 'Marxist',
          },
          body: JSON.stringify({
            model: params.model || 'anthropic/claude-sonnet-4-20250514',
            messages: [{ role: 'user', content: editSystemPrompt }],
            stream: true,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const error = (await response.json().catch(() => ({}))) as { message?: string }
          return { error: error.message || `HTTP ${response.status}` }
        }

        const window = BrowserWindow.fromWebContents(event.sender)
        if (!window) {
          return { error: 'Window not found' }
        }

        const reader = response.body?.getReader()
        if (!reader) {
          return { error: 'No response body' }
        }

        const decoder = new TextDecoder()
        let fullResponse = ''
        let documentContent = params.documentContent

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue

                try {
                  const parsed = JSON.parse(data) as {
                    choices?: Array<{ delta?: { content?: string } }>
                  }
                  const content = parsed.choices?.[0]?.delta?.content || ''

                  if (content) {
                    fullResponse += content
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }
        } finally {
          reader.releaseLock()
        }

        // Parse the JSON response and apply replacements
        try {
          // Clean up the response - remove any markdown code fences if present
          let jsonStr = fullResponse.trim()
          if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.slice(7)
          } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.slice(3)
          }
          if (jsonStr.endsWith('```')) {
            jsonStr = jsonStr.slice(0, -3)
          }
          jsonStr = jsonStr.trim()

          const replacements = JSON.parse(jsonStr) as Array<{ find: string; replace: string }>

          if (Array.isArray(replacements)) {
            for (const { find, replace } of replacements) {
              if (find && typeof find === 'string' && typeof replace === 'string') {
                documentContent = documentContent.split(find).join(replace)
              }
            }
          }
        } catch (parseError) {
          // If JSON parsing fails, fall back to treating the response as the full document
          // This handles cases where the AI doesn't follow instructions
          if (fullResponse.trim().length > 0) {
            documentContent = fullResponse
          }
        }

        activeStreams.delete(streamId)

        // Send the final modified document
        window.webContents.send('ai:edit-chunk', {
          streamId,
          content: documentContent,
          fullContent: documentContent,
        })

        window.webContents.send('ai:edit-complete', { streamId, content: documentContent })

        return { success: true, content: documentContent }
      } catch (error) {
        activeStreams.delete(streamId)

        const window = BrowserWindow.fromWebContents(event.sender)

        if ((error as Error).name === 'AbortError') {
          window?.webContents.send('ai:edit-error', { streamId, error: 'aborted' })
          return { error: 'aborted' }
        }

        window?.webContents.send('ai:edit-error', {
          streamId,
          error: (error as Error).message,
        })

        return { error: (error as Error).message }
      }
    }
  )

  ipcMain.handle('ai:cancel', async (_, streamId?: string) => {
    if (streamId && activeStreams.has(streamId)) {
      activeStreams.get(streamId)?.abort()
      activeStreams.delete(streamId)
    } else {
      for (const [id, controller] of activeStreams) {
        controller.abort()
        activeStreams.delete(id)
      }
    }
    return { success: true }
  })

  ipcMain.handle('app:get-version', () => {
    return app.getVersion()
  })
}

let mainWindow: BrowserWindow | null = null
let isQuitting = false
let fileToOpenOnReady: string | null = null

// Handle file open from Finder (macOS) - can be called before app is ready
app.on('open-file', (event, filePath) => {
  event.preventDefault()
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    // App is ready, send to renderer
    mainWindow.webContents.send('app:open-file', filePath)
    mainWindow.focus()
  } else {
    // App not ready yet, store for later
    fileToOpenOnReady = filePath
  }
})

function initialize() {
  const gotTheLock = app.requestSingleInstanceLock()
  if (!gotTheLock) {
    app.quit()
    return
  }

  // Handle second instance (e.g., double-clicking another file while app is open)
  app.on('second-instance', (_, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      
      // On Windows/Linux, the file path is passed as a command line argument
      const filePath = commandLine.find(arg => 
        arg.endsWith('.md') || arg.endsWith('.markdown') || arg.endsWith('.txt')
      )
      if (filePath) {
        mainWindow.webContents.send('app:open-file', filePath)
      }
    }
  })

  app.whenReady().then(() => {
    app.setName('Marxist')

    registerIpcHandlers()

    mainWindow = createWindow()

    createMenu(mainWindow)

    // Initialize auto-updater
    if (app.isPackaged) {
      initAutoUpdater(mainWindow)
    }

    // Send file to open if one was passed before app was ready
    mainWindow.webContents.on('did-finish-load', () => {
      if (fileToOpenOnReady && mainWindow) {
        // Small delay to ensure React is mounted
        setTimeout(() => {
          mainWindow?.webContents.send('app:open-file', fileToOpenOnReady)
          fileToOpenOnReady = null
        }, 500)
      }
    })

    // IPC handler for manual update check
    ipcMain.handle('app:check-for-updates', async () => {
      await checkForUpdates(true)
    })

    ipcMain.handle('app:save-before-quit', async (_, data: {
      drafts: Array<{
        tabId: string
        content: string
        filePath: string | null
        fileName: string
        isDirty: boolean
        cursorPosition: number
        scrollPosition: number
      }>
      session: Omit<SessionState, 'savedAt' | 'appVersion'>
    }) => {
      try {
        saveAllDrafts(data.drafts)
        saveSessionState({
          ...data.session,
          savedAt: new Date().toISOString(),
          appVersion: getAppVersion(),
        })
        return { success: true }
      } catch (error) {
        console.error('Failed to save session:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.on('app:ready-to-quit', () => {
      app.exit(0)
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow()
        createMenu(mainWindow)
      }
    })
  })

  app.on('before-quit', (event) => {
    // Skip quit prevention if we're installing an update
    if (isInstallingUpdate()) {
      return
    }
    
    if (!isQuitting && mainWindow && !mainWindow.isDestroyed()) {
      event.preventDefault()
      isQuitting = true
      try {
        mainWindow.webContents.send('app:quit-requested')
      } catch {
        // Window already destroyed, just exit
        app.exit(0)
        return
      }
      setTimeout(() => {
        app.exit(0)
      }, 3000)
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}

initialize()
