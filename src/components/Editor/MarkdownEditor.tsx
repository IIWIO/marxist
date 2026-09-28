import { useRef, useEffect } from 'react'
import type { EditorState } from '@codemirror/state'
import { useCodeMirror } from '@/hooks/useCodeMirror'
import { useScrollSyncContext } from '@/contexts/scrollSync'
import type { EditorRef } from '@/types/editor'
import type { DiffResult } from '@/utils/diff'

interface MarkdownEditorProps {
  content: string
  onChange: (content: string) => void
  isDark: boolean
  fontSize?: number
  lineNumbers?: boolean
  wordWrap?: boolean
  readOnly?: boolean
  editorRef?: React.MutableRefObject<EditorRef | null>
  tabId?: string
  editorState?: EditorState | null
  cursorPosition?: number
  scrollPosition?: number
  onEditorStateChange?: (tabId: string, state: EditorState | null, scroll: number, cursor: number) => void
  spellCheck?: boolean
  diffResult?: DiffResult | null
}

const ignoreEditorStateChange = () => undefined

export default function MarkdownEditor({
  content,
  onChange,
  isDark,
  fontSize = 14,
  lineNumbers = false,
  wordWrap = true,
  readOnly = false,
  editorRef,
  tabId = 'standalone-editor',
  editorState = null,
  cursorPosition = 0,
  scrollPosition = 0,
  onEditorStateChange = ignoreEditorStateChange,
  spellCheck = true,
  diffResult = null,
}: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollSync = useScrollSyncContext()

  const editor = useCodeMirror(containerRef, {
    initialContent: content,
    onChange,
    isDark,
    fontSize,
    showLineNumbers: lineNumbers,
    wordWrap,
    readOnly,
    spellCheck,
    diffResult,
  })
  const previousTabIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor
    }
  }, [editor, editorRef])

  useEffect(() => {
    const previousTabId = previousTabIdRef.current
    if (previousTabId && previousTabId !== tabId) {
      const snapshot = editor.getSnapshot()
      onEditorStateChange(
        previousTabId,
        editor.getState(),
        snapshot.scrollTop,
        snapshot.selection.anchor
      )
    }
    if (previousTabId !== tabId) {
      editor.restoreState(editorState, content, cursorPosition, scrollPosition)
      previousTabIdRef.current = tabId
    }
  }, [tabId, editorState, content, cursorPosition, scrollPosition, editor, onEditorStateChange])

  useEffect(
    () => () => {
      const currentTabId = previousTabIdRef.current
      if (!currentTabId) return
      const snapshot = editor.getSnapshot()
      onEditorStateChange(
        currentTabId,
        editor.getState(),
        snapshot.scrollTop,
        snapshot.selection.anchor
      )
    },
    [editor, onEditorStateChange]
  )

  useEffect(() => {
    const currentContent = editor.getContent()
    if (content !== currentContent) {
      editor.setContent(content)
    }
  }, [content, editor])

  useEffect(() => {
    if (!scrollSync || !containerRef.current) return

    const scroller = containerRef.current.querySelector('.cm-scroller') as HTMLElement | null
    if (scroller) {
      scrollSync.registerEditorScroller(scroller)
    }

    return () => {
      scrollSync.registerEditorScroller(null)
    }
  }, [scrollSync, editor])

  // Auto-hide scrollbar on scroll
  useEffect(() => {
    if (!containerRef.current) return

    const scroller = containerRef.current.querySelector('.cm-scroller') as HTMLElement | null
    if (!scroller) return

    let timeout: ReturnType<typeof setTimeout> | null = null

    const handleScroll = () => {
      scroller.classList.add('is-scrolling')
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => {
        scroller.classList.remove('is-scrolling')
      }, 1000)
    }

    scroller.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      scroller.removeEventListener('scroll', handleScroll)
      if (timeout) clearTimeout(timeout)
    }
  }, [editor])

  return (
    <div 
      ref={containerRef} 
      className="h-full w-full overflow-hidden" 
      data-testid="markdown-editor" 
    />
  )
}
