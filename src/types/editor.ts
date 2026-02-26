import type { EditorView } from '@codemirror/view'

export interface EditorConfig {
  fontSize: number
  lineNumbers: boolean
  wordWrap: boolean
  theme: 'light' | 'dark'
}

export interface EditorSnapshot {
  content: string
  selection: { anchor: number; head: number }
  scrollTop: number
  scrollLeft: number
}

export interface EditorRef {
  view: EditorView | null
  getContent: () => string
  setContent: (content: string) => void
  getSnapshot: () => EditorSnapshot
  restoreSnapshot: (snapshot: EditorSnapshot) => void
  focus: () => void
  setReadOnly: (readOnly: boolean) => void
}

export type FormattingAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'inlineCode'
  | 'codeBlock'
  | 'link'
  | 'image'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'bulletList'
  | 'numberList'
  | 'checklist'
  | 'blockquote'
  | 'horizontalRule'
  | 'table'
  | 'indent'
  | 'outdent'
