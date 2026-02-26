import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export type ViewMode = 'markdown' | 'split' | 'render'

interface ViewState {
  activeView: ViewMode
  previousView: ViewMode | null
  splitRatio: number
  sidebarOpen: boolean
  aiPanelOpen: boolean
  windowWidth: number
  isNarrowWindow: boolean

  setActiveView: (view: ViewMode) => void
  setSplitRatio: (ratio: number) => void
  resetSplitRatio: () => void
  toggleSidebar: () => void
  toggleAiPanel: () => void
  setWindowWidth: (width: number) => void
}

const MIN_SPLIT_RATIO = 0.2
const MAX_SPLIT_RATIO = 0.8
const DEFAULT_SPLIT_RATIO = 0.5
const NARROW_WINDOW_THRESHOLD = 600

export const useViewStore = create<ViewState>()(
  subscribeWithSelector((set, get) => ({
    activeView: 'split',
    previousView: null,
    splitRatio: DEFAULT_SPLIT_RATIO,
    sidebarOpen: false,
    aiPanelOpen: false,
    windowWidth: typeof window !== 'undefined' ? window.innerWidth : 1200,
    isNarrowWindow: false,

    setActiveView: (view) => {
      const { isNarrowWindow, activeView } = get()

      if (view === 'split' && isNarrowWindow) {
        return
      }

      set({ activeView: view, previousView: activeView })
    },

    setSplitRatio: (ratio) => {
      const clampedRatio = Math.max(MIN_SPLIT_RATIO, Math.min(MAX_SPLIT_RATIO, ratio))
      set({ splitRatio: clampedRatio })
    },

    resetSplitRatio: () => {
      set({ splitRatio: DEFAULT_SPLIT_RATIO })
    },

    toggleSidebar: () => {
      set((state) => ({ sidebarOpen: !state.sidebarOpen }))
    },

    toggleAiPanel: () => {
      set((state) => ({ aiPanelOpen: !state.aiPanelOpen }))
    },

    setWindowWidth: (width) => {
      const isNarrow = width < NARROW_WINDOW_THRESHOLD
      const { activeView, previousView, isNarrowWindow } = get()

      set({ windowWidth: width, isNarrowWindow: isNarrow })

      if (isNarrow && !isNarrowWindow && activeView === 'split') {
        set({ activeView: 'markdown', previousView: 'split' })
      }

      if (!isNarrow && isNarrowWindow && previousView === 'split') {
        set({ activeView: 'split', previousView: null })
      }
    },
  }))
)

export const selectActiveView = (state: ViewState) => state.activeView
export const selectSplitRatio = (state: ViewState) => state.splitRatio
export const selectSidebarOpen = (state: ViewState) => state.sidebarOpen
export const selectAiPanelOpen = (state: ViewState) => state.aiPanelOpen
export const selectIsNarrowWindow = (state: ViewState) => state.isNarrowWindow
