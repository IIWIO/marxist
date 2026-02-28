import { contextBridge, ipcRenderer } from 'electron'

export interface FileResult {
  path: string | null
  name: string
  content: string
  error?: string
}

export interface SaveResult {
  success: boolean
  path?: string
}

export interface Draft {
  tabId: string
  filePath: string | null
  fileName: string
  content: string
  isDirty: boolean
  cursorPosition: number
  scrollPosition: number
}

export interface Settings {
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
}

export interface ChatParams {
  message: string
  documentContent: string
  history: Array<{ role: string; content: string }>
  systemPrompt: string
  model: string
  streamId?: string
}

export interface EditParams {
  instruction: string
  documentContent: string
  model: string
  systemPrompt: string
  streamId?: string
}

export interface RestoreResult {
  success: boolean
  tabs: Array<{
    tabId: string
    filePath: string | null
    fileName: string
    content: string
    isDirty: boolean
    cursorPosition: number
    scrollPosition: number
  }>
  session: {
    openTabIds: string[]
    activeTabId: string | null
    untitledCounter: number
    activeView: 'markdown' | 'split' | 'render'
    splitRatio: number
    sidebarOpen: boolean
    aiPanelOpen: boolean
    savedAt: string
    appVersion: string
  } | null
  error?: string
}

export interface ElectronAPI {
  file: {
    open: () => Promise<FileResult>
    save: (path: string, content: string) => Promise<SaveResult>
    saveAs: (content: string) => Promise<{ path: string | null; name?: string }>
    getRecent: () => Promise<Array<{ path: string; name: string; lastOpened: string }>>
    drop: (path: string) => Promise<FileResult>
    openExternal: (url: string) => Promise<{ success: boolean; error?: string }>
  }
  drafts: {
    save: (tabId: string, content: string, metadata: Omit<Draft, 'tabId' | 'content'>) => Promise<{ success: boolean; error?: string }>
    saveAll: (drafts: Draft[]) => Promise<{ success: boolean; error?: string }>
    restore: () => Promise<RestoreResult>
    clear: (tabId: string) => Promise<{ success: boolean; error?: string }>
    clearAll: () => Promise<{ success: boolean; error?: string }>
  }
  session: {
    save: (state: {
      openTabIds: string[]
      activeTabId: string | null
      untitledCounter: number
      activeView: 'markdown' | 'split' | 'render'
      splitRatio: number
      sidebarOpen: boolean
      aiPanelOpen: boolean
    }) => Promise<{ success: boolean; error?: string }>
  }
  settings: {
    get: () => Promise<Settings>
    set: (key: keyof Settings, value: unknown) => Promise<Settings>
    reset: () => Promise<Settings>
  }
  ai: {
    chat: (params: ChatParams) => Promise<{ success?: boolean; content?: string; error?: string }>
    edit: (params: EditParams) => Promise<{ success?: boolean; content?: string; error?: string }>
    cancel: (streamId?: string) => Promise<{ success: boolean }>
    verifyKey: (key: string) => Promise<{ valid: boolean; error?: string }>
    listModels: () => Promise<{ models?: Array<{ id: string; name: string; contextLength: number }>; error?: string }>
  }
  app: {
    getVersion: () => Promise<string>
    saveBeforeQuit: (data: {
      drafts: Draft[]
      session: {
        openTabIds: string[]
        activeTabId: string | null
        untitledCounter: number
        activeView: 'markdown' | 'split' | 'render'
        splitRatio: number
        sidebarOpen: boolean
        aiPanelOpen: boolean
      }
    }) => Promise<{ success: boolean; error?: string }>
    readyToQuit: () => void
    getWelcomeFile: () => Promise<{ isFirstRun: boolean; content: string | null; name?: string; error?: string }>
  }
  onMenuEvent: (channel: string, callback: () => void) => () => void
  onAppEvent: (channel: string, callback: () => void) => () => void
  onAIEvent: (channel: string, callback: (data: unknown) => void) => () => void
}

const electronAPI: ElectronAPI = {
  file: {
    open: () => ipcRenderer.invoke('file:open'),
    save: (path: string, content: string) => ipcRenderer.invoke('file:save', path, content),
    saveAs: (content: string) => ipcRenderer.invoke('file:save-as', content),
    getRecent: () => ipcRenderer.invoke('file:get-recent'),
    drop: (path: string) => ipcRenderer.invoke('file:drop', path),
    openExternal: (url: string) => ipcRenderer.invoke('file:open-external', url),
  },

  drafts: {
    save: (tabId: string, content: string, metadata: unknown) =>
      ipcRenderer.invoke('drafts:save', tabId, content, metadata),
    saveAll: (drafts: unknown[]) => ipcRenderer.invoke('drafts:save-all', drafts),
    restore: () => ipcRenderer.invoke('drafts:restore'),
    clear: (tabId: string) => ipcRenderer.invoke('drafts:clear', tabId),
    clearAll: () => ipcRenderer.invoke('drafts:clear-all'),
  },

  session: {
    save: (state: unknown) => ipcRenderer.invoke('session:save', state),
  },

  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
    reset: () => ipcRenderer.invoke('settings:reset'),
  },

  ai: {
    chat: (params: unknown) => ipcRenderer.invoke('ai:chat', params),
    edit: (params: unknown) => ipcRenderer.invoke('ai:edit', params),
    cancel: (streamId?: string) => ipcRenderer.invoke('ai:cancel', streamId),
    verifyKey: (key: string) => ipcRenderer.invoke('ai:verify-key', key),
    listModels: () => ipcRenderer.invoke('ai:list-models'),
  },

  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    saveBeforeQuit: (data: unknown) => ipcRenderer.invoke('app:save-before-quit', data),
    readyToQuit: () => ipcRenderer.send('app:ready-to-quit'),
    getWelcomeFile: () => ipcRenderer.invoke('app:get-welcome-file'),
  },

  onMenuEvent: (channel: string, callback: () => void) => {
    const validChannels = [
      'menu:new-file',
      'menu:open-file',
      'menu:save',
      'menu:save-as',
      'menu:find',
      'menu:settings',
      'menu:about',
      'menu:view-markdown',
      'menu:view-split',
      'menu:view-render',
      'menu:toggle-sidebar',
      'menu:toggle-ai',
      'menu:toggle-theme',
    ]
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback)
      return () => ipcRenderer.removeListener(channel, callback)
    }
    return () => {}
  },

  onAppEvent: (channel: string, callback: () => void) => {
    const validChannels = ['app:quit-requested']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback)
      return () => ipcRenderer.removeListener(channel, callback)
    }
    return () => {}
  },

  onAIEvent: (channel: string, callback: (data: unknown) => void) => {
    const validChannels = [
      'ai:stream-chunk',
      'ai:stream-complete',
      'ai:stream-error',
      'ai:edit-chunk',
      'ai:edit-complete',
      'ai:edit-error',
    ]
    if (validChannels.includes(channel)) {
      const handler = (_: unknown, data: unknown) => callback(data)
      ipcRenderer.on(channel, handler)
      return () => ipcRenderer.removeListener(channel, handler)
    }
    return () => {}
  },
}

contextBridge.exposeInMainWorld('electron', electronAPI)
