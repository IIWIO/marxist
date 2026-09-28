import { contextBridge, ipcRenderer } from 'electron'
import type {
  AIEventMap,
  AppEventMap,
  ChatParams,
  EditParams,
  ElectronAPI,
  MenuEventMap,
  PublicSettingKey,
  PublicSettings,
} from '../types/ipc'

export type { ElectronAPI, PublicSettings } from '../types/ipc'

const menuChannels = new Set<keyof MenuEventMap>([
  'menu:new-file',
  'menu:open-file',
  'menu:save',
  'menu:save-as',
  'menu:find',
  'menu:settings',
  'menu:view-markdown',
  'menu:view-split',
  'menu:view-render',
  'menu:toggle-sidebar',
  'menu:toggle-ai',
  'menu:toggle-theme',
])

const appChannels = new Set<keyof AppEventMap>(['app:quit-requested', 'app:open-file'])
const aiChannels = new Set<keyof AIEventMap>([
  'ai:stream-chunk',
  'ai:stream-complete',
  'ai:stream-error',
  'ai:edit-complete',
  'ai:edit-error',
])

function subscribe<T extends object, K extends keyof T>(
  allowed: Set<keyof T>,
  channel: K,
  callback: (data: T[K]) => void
): () => void {
  if (!allowed.has(channel)) return () => undefined
  const handler = (_event: Electron.IpcRendererEvent, data: T[K]) => callback(data)
  ipcRenderer.on(channel as string, handler)
  return () => ipcRenderer.removeListener(channel as string, handler)
}

const electronAPI: ElectronAPI = {
  file: {
    open: () => ipcRenderer.invoke('file:open'),
    save: (path, content) => ipcRenderer.invoke('file:save', path, content),
    saveAs: (content) => ipcRenderer.invoke('file:save-as', content),
    getRecent: () => ipcRenderer.invoke('file:get-recent'),
    drop: (path) => ipcRenderer.invoke('file:drop', path),
    openExternal: (url) => ipcRenderer.invoke('file:open-external', url),
    showError: (title, message, detail) => ipcRenderer.invoke('file:show-error', title, message, detail),
    confirmClose: (fileName) => ipcRenderer.invoke('file:confirm-close', fileName),
  },
  drafts: {
    saveSnapshot: (data) => ipcRenderer.invoke('recovery:save', data),
    restore: () => ipcRenderer.invoke('drafts:restore'),
    clear: (tabId) => ipcRenderer.invoke('drafts:clear', tabId),
    clearAll: () => ipcRenderer.invoke('drafts:clear-all'),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: <K extends PublicSettingKey>(key: K, value: PublicSettings[K]) => ipcRenderer.invoke('settings:set', key, value),
    setApiKey: (key) => ipcRenderer.invoke('settings:set-api-key', key),
    reset: () => ipcRenderer.invoke('settings:reset'),
  },
  ai: {
    chat: (params: ChatParams) => ipcRenderer.invoke('ai:chat', params),
    edit: (params: EditParams) => ipcRenderer.invoke('ai:edit', params),
    cancel: (streamId) => ipcRenderer.invoke('ai:cancel', streamId),
    verifyKey: (key) => ipcRenderer.invoke('ai:verify-key', key),
    listModels: () => ipcRenderer.invoke('ai:list-models'),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    getWelcomeFile: () => ipcRenderer.invoke('app:get-welcome-file'),
    saveBeforeQuit: (data) => ipcRenderer.invoke('app:save-before-quit', data),
    confirmQuitFailure: (error) => ipcRenderer.invoke('app:confirm-quit-failure', error),
    readyToQuit: (reason) => ipcRenderer.send('app:ready-to-quit', reason),
    checkForUpdates: () => ipcRenderer.invoke('app:check-for-updates'),
    copyDiagnostics: () => ipcRenderer.invoke('app:copy-diagnostics'),
  },
  onMenuEvent: (channel, callback) => subscribe(menuChannels, channel, callback),
  onAppEvent: (channel, callback) => subscribe(appChannels, channel, callback),
  onAIEvent: (channel, callback) => subscribe(aiChannels, channel, callback),
}

contextBridge.exposeInMainWorld('electron', electronAPI)
