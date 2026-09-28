import type { RestoreResult, SessionState } from './session'
import type { RecentFile } from './files'

export type IpcResult<T> = { ok: true; value: T } | { ok: false; error: string; code?: string }

export interface DraftSnapshot {
  tabId: string
  filePath: string | null
  fileName: string
  content: string
  isDirty: boolean
  cursorPosition: number
  scrollPosition: number
}

export interface PublicSettings {
  theme: 'system' | 'light' | 'dark'
  editorFontSize: number
  previewFontSize: number
  lineNumbers: boolean
  wordWrap: boolean
  spellCheck: boolean
  selectedModel: string
  systemPrompt: string
  recentFiles: RecentFile[]
  hasApiKey: boolean
  isApiKeyVerified: boolean
}

export type PublicSettingKey = Exclude<keyof PublicSettings, 'hasApiKey'>

export interface ChatParams {
  message: string
  documentContent: string
  history: Array<{ role: 'user' | 'assistant'; content: string }>
  systemPrompt: string
  model: string
  contextLength?: number
  streamId: string
}

export interface EditParams {
  instruction: string
  documentContent: string
  model: string
  systemPrompt: string
  contextLength?: number
  streamId: string
}

export interface AIModel {
  id: string
  name: string
  contextLength: number
}

export interface AIStreamChunk {
  streamId: string
  content: string
  fullContent: string
}

export interface AIStreamComplete {
  streamId: string
  content: string
}

export interface AIStreamError {
  streamId: string
  error: string
}

export interface MenuEventMap {
  'menu:new-file': undefined
  'menu:open-file': undefined
  'menu:save': undefined
  'menu:save-as': undefined
  'menu:find': undefined
  'menu:settings': undefined
  'menu:view-markdown': undefined
  'menu:view-split': undefined
  'menu:view-render': undefined
  'menu:toggle-sidebar': undefined
  'menu:toggle-ai': undefined
  'menu:toggle-theme': undefined
}

export interface AppEventMap {
  'app:quit-requested': { reason: 'quit' | 'update' }
  'app:open-file': string
}

export interface AIEventMap {
  'ai:stream-chunk': AIStreamChunk
  'ai:stream-complete': AIStreamComplete
  'ai:stream-error': AIStreamError
  'ai:edit-complete': AIStreamComplete
  'ai:edit-error': AIStreamError
}

export type QuitFailureAction = 'retry' | 'cancel' | 'discard'

export interface ElectronAPI {
  file: {
    open: () => Promise<IpcResult<{ path: string | null; name: string; content: string }>>
    save: (path: string, content: string) => Promise<IpcResult<void>>
    saveAs: (content: string) => Promise<IpcResult<{ path: string | null; name?: string }>>
    getRecent: () => Promise<IpcResult<RecentFile[]>>
    drop: (path: string) => Promise<IpcResult<{ path: string; name: string; content: string }>>
    openExternal: (url: string) => Promise<IpcResult<void>>
    showError: (title: string, message: string, detail?: string) => Promise<void>
    confirmClose: (fileName: string) => Promise<'save' | 'discard' | 'cancel'>
  }
  drafts: {
    saveSnapshot: (data: {
      drafts: DraftSnapshot[]
      session: Omit<SessionState, 'savedAt' | 'appVersion'>
    }) => Promise<IpcResult<void>>
    restore: () => Promise<IpcResult<RestoreResult>>
    clear: (tabId: string) => Promise<IpcResult<void>>
    clearAll: () => Promise<IpcResult<void>>
  }
  settings: {
    get: () => Promise<IpcResult<PublicSettings>>
    set: <K extends PublicSettingKey>(key: K, value: PublicSettings[K]) => Promise<IpcResult<PublicSettings>>
    setApiKey: (key: string) => Promise<IpcResult<PublicSettings>>
    reset: () => Promise<IpcResult<PublicSettings>>
  }
  ai: {
    chat: (params: ChatParams) => Promise<IpcResult<{ content: string }>>
    edit: (params: EditParams) => Promise<IpcResult<{ content: string }>>
    cancel: (streamId: string) => Promise<IpcResult<void>>
    verifyKey: (key: string) => Promise<IpcResult<void>>
    listModels: () => Promise<IpcResult<AIModel[]>>
  }
  app: {
    getVersion: () => Promise<IpcResult<string>>
    getWelcomeFile: () => Promise<IpcResult<{ isFirstRun: boolean; content: string | null; name?: string }>>
    saveBeforeQuit: (data: {
      drafts: DraftSnapshot[]
      session: Omit<SessionState, 'savedAt' | 'appVersion'>
    }) => Promise<IpcResult<void>>
    confirmQuitFailure: (error: string) => Promise<QuitFailureAction>
    readyToQuit: (reason: 'quit' | 'update') => void
    checkForUpdates: () => Promise<IpcResult<void>>
    copyDiagnostics: () => Promise<IpcResult<void>>
  }
  onMenuEvent: <K extends keyof MenuEventMap>(channel: K, callback: (data: MenuEventMap[K]) => void) => () => void
  onAppEvent: <K extends keyof AppEventMap>(channel: K, callback: (data: AppEventMap[K]) => void) => () => void
  onAIEvent: <K extends keyof AIEventMap>(channel: K, callback: (data: AIEventMap[K]) => void) => () => void
}

export const ok = <T>(value: T): IpcResult<T> => ({ ok: true, value })
export const fail = (error: unknown, code?: string): IpcResult<never> => ({
  ok: false,
  error: error instanceof Error ? error.message : String(error),
  ...(code ? { code } : {}),
})
