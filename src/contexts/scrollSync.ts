import { createContext, useContext } from 'react'

export interface ScrollSyncContextValue {
  registerEditorScroller: (element: HTMLElement | null) => void
  registerPreviewScroller: (element: HTMLElement | null) => void
}

export const ScrollSyncContext = createContext<ScrollSyncContextValue | null>(null)

export function useScrollSyncContext(): ScrollSyncContextValue | null {
  return useContext(ScrollSyncContext)
}
