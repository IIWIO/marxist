import { createContext, useContext, ReactNode, useMemo, useEffect } from 'react'
import { useScrollSync } from '@/hooks/useScrollSync'

interface ScrollSyncContextValue {
  registerEditorScroller: (element: HTMLElement | null) => void
  registerPreviewScroller: (element: HTMLElement | null) => void
}

const ScrollSyncContext = createContext<ScrollSyncContextValue | null>(null)

export function ScrollSyncProvider({ children }: { children: ReactNode }) {
  const { registerEditorScroller, registerPreviewScroller, cleanup } = useScrollSync()

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const value = useMemo(
    () => ({ registerEditorScroller, registerPreviewScroller }),
    [registerEditorScroller, registerPreviewScroller]
  )

  return (
    <ScrollSyncContext.Provider value={value}>
      {children}
    </ScrollSyncContext.Provider>
  )
}

export function useScrollSyncContext() {
  return useContext(ScrollSyncContext)
}
