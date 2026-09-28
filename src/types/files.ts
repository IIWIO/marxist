import type { EditorState } from '@codemirror/state'
import type { DiffResult } from '@/utils/diff'

export interface TabState {
  tabId: string
  filePath: string | null
  fileName: string
  content: string
  savedContent: string
  isDirty: boolean
  editorState: EditorState | null
  scrollPosition: number
  cursorPosition: number
  preEditSnapshot: string | null
  isAIEditing: boolean
  showDiff: boolean
  diffResult: DiffResult | null
}

export interface RecentFile {
  path: string
  name: string
  lastOpened: string
}

export interface OpenFileResult {
  path: string | null
  name: string
  content: string
  error?: string
}

export interface SaveFileResult {
  success: boolean
  path?: string
  name?: string
  error?: string
}
