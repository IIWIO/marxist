import { useCallback, useRef } from 'react'

type ScrollSource = 'editor' | 'preview' | null

export function useScrollSync() {
  const activeSourceRef = useRef<ScrollSource>(null)
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)
  const editorScrollerRef = useRef<HTMLElement | null>(null)
  const previewScrollerRef = useRef<HTMLElement | null>(null)

  const getScrollPercentage = (element: HTMLElement): number => {
    const maxScroll = element.scrollHeight - element.clientHeight
    if (maxScroll <= 0) return 0
    return element.scrollTop / maxScroll
  }

  const setScrollPercentage = (element: HTMLElement, percentage: number) => {
    const maxScroll = element.scrollHeight - element.clientHeight
    if (maxScroll <= 0) return
    element.scrollTop = Math.round(percentage * maxScroll)
  }

  const syncScroll = useCallback((source: ScrollSource) => {
    if (!editorScrollerRef.current || !previewScrollerRef.current) return

    const sourceElement = source === 'editor' ? editorScrollerRef.current : previewScrollerRef.current
    const targetElement = source === 'editor' ? previewScrollerRef.current : editorScrollerRef.current

    const percentage = getScrollPercentage(sourceElement)
    setScrollPercentage(targetElement, percentage)
  }, [])

  const handleEditorScroll = useCallback(() => {
    if (activeSourceRef.current === 'preview') return

    activeSourceRef.current = 'editor'

    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current)
    }

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = requestAnimationFrame(() => {
      syncScroll('editor')
    })

    lockTimeoutRef.current = setTimeout(() => {
      activeSourceRef.current = null
    }, 150)
  }, [syncScroll])

  const handlePreviewScroll = useCallback(() => {
    if (activeSourceRef.current === 'editor') return

    activeSourceRef.current = 'preview'

    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current)
    }

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = requestAnimationFrame(() => {
      syncScroll('preview')
    })

    lockTimeoutRef.current = setTimeout(() => {
      activeSourceRef.current = null
    }, 150)
  }, [syncScroll])

  const registerEditorScroller = useCallback((element: HTMLElement | null) => {
    if (editorScrollerRef.current) {
      editorScrollerRef.current.removeEventListener('scroll', handleEditorScroll)
    }
    editorScrollerRef.current = element
    if (element) {
      element.addEventListener('scroll', handleEditorScroll, { passive: true })
    }
  }, [handleEditorScroll])

  const registerPreviewScroller = useCallback((element: HTMLElement | null) => {
    if (previewScrollerRef.current) {
      previewScrollerRef.current.removeEventListener('scroll', handlePreviewScroll)
    }
    previewScrollerRef.current = element
    if (element) {
      element.addEventListener('scroll', handlePreviewScroll, { passive: true })
    }
  }, [handlePreviewScroll])

  const cleanup = useCallback(() => {
    if (editorScrollerRef.current) {
      editorScrollerRef.current.removeEventListener('scroll', handleEditorScroll)
    }
    if (previewScrollerRef.current) {
      previewScrollerRef.current.removeEventListener('scroll', handlePreviewScroll)
    }
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current)
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }
  }, [handleEditorScroll, handlePreviewScroll])

  return {
    registerEditorScroller,
    registerPreviewScroller,
    cleanup,
  }
}
