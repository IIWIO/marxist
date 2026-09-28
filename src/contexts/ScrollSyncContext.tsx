import { ReactNode, useMemo, useEffect } from 'react'
import { useScrollSync } from '@/hooks/useScrollSync'
import { ScrollSyncContext } from './scrollSync'

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
