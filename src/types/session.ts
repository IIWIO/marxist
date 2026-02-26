export interface DraftMetadata {
  tabId: string
  filePath: string | null
  fileName: string
  isDirty: boolean
  cursorPosition: number
  scrollPosition: number
  createdAt: string
}

export interface SessionState {
  openTabIds: string[]
  activeTabId: string | null
  untitledCounter: number
  activeView: 'markdown' | 'split' | 'render'
  splitRatio: number
  sidebarOpen: boolean
  aiPanelOpen: boolean
  savedAt: string
  appVersion: string
}

export interface DraftFile {
  content: string
  metadata: DraftMetadata
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
  session: SessionState | null
  error?: string
}
