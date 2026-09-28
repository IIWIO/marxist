import { useEffect } from 'react'
import { useEditorStore } from '@/stores/editorStore'

export function useDocumentCounts(content: string): void {
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      useEditorStore.getState().refreshCounts(content)
    }, 150)
    return () => window.clearTimeout(timeout)
  }, [content])
}
