import { useRef, useEffect } from 'react'
import { useCodeMirror } from '@/hooks/useCodeMirror'
import { useScrollSyncContext } from '@/contexts/ScrollSyncContext'
import type { EditorRef } from '@/types/editor'

interface MarkdownEditorProps {
  content: string
  onChange: (content: string) => void
  isDark: boolean
  fontSize?: number
  lineNumbers?: boolean
  wordWrap?: boolean
  readOnly?: boolean
  editorRef?: React.MutableRefObject<EditorRef | null>
}

export default function MarkdownEditor({
  content,
  onChange,
  isDark,
  fontSize = 14,
  lineNumbers = false,
  wordWrap = true,
  readOnly = false,
  editorRef,
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
  })

  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor
    }
  }, [editor, editorRef])

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
