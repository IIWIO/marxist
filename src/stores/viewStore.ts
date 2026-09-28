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
  setSidebarOpen: (open: boolean) => void
  setAiPanelOpen: (open: boolean) => void
  setWindowWidth: (width: number) => void
}

const MIN_SPLIT_RATIO = 0.2
const MAX_SPLIT_RATIO = 0.8
const DEFAULT_SPLIT_RATIO = 0.5
const SIDEBAR_WIDTH = 240
const AI_PANEL_WIDTH = 360
const MIN_SPLIT_CONTENT_WIDTH = 560

function isNarrowLayout(width: number, sidebarOpen: boolean, aiPanelOpen: boolean): boolean {
  return width - (sidebarOpen ? SIDEBAR_WIDTH : 0) - (aiPanelOpen ? AI_PANEL_WIDTH : 0) < MIN_SPLIT_CONTENT_WIDTH
}

function applyResponsiveView(
  state: Pick<ViewState, 'activeView' | 'previousView' | 'isNarrowWindow'>,
  isNarrowWindow: boolean
): Partial<ViewState> {
  if (isNarrowWindow && !state.isNarrowWindow && state.activeView === 'split') {
    return { activeView: 'markdown', previousView: 'split' }
  }
  if (!isNarrowWindow && state.isNarrowWindow && state.previousView === 'split') {
    return { activeView: 'split', previousView: null }
  }
  return {}
}

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
      const state = get()
      get().setSidebarOpen(!state.sidebarOpen)
    },

    toggleAiPanel: () => {
      const state = get()
      get().setAiPanelOpen(!state.aiPanelOpen)
    },

    setSidebarOpen: (sidebarOpen) => {
      const state = get()
      const isNarrowWindow = isNarrowLayout(state.windowWidth, sidebarOpen, state.aiPanelOpen)
      set({ sidebarOpen, isNarrowWindow, ...applyResponsiveView(state, isNarrowWindow) })
    },

    setAiPanelOpen: (aiPanelOpen) => {
      const state = get()
      const isNarrowWindow = isNarrowLayout(state.windowWidth, state.sidebarOpen, aiPanelOpen)
      set({ aiPanelOpen, isNarrowWindow, ...applyResponsiveView(state, isNarrowWindow) })
    },

    setWindowWidth: (width) => {
      const { activeView, previousView, isNarrowWindow, sidebarOpen, aiPanelOpen } = get()
      const isNarrow = isNarrowLayout(width, sidebarOpen, aiPanelOpen)

      set({
        windowWidth: width,
        isNarrowWindow: isNarrow,
        ...applyResponsiveView({ activeView, previousView, isNarrowWindow }, isNarrow),
      })
    },
  }))
)

export const selectActiveView = (state: ViewState) => state.activeView
export const selectSplitRatio = (state: ViewState) => state.splitRatio
export const selectSidebarOpen = (state: ViewState) => state.sidebarOpen
export const selectAiPanelOpen = (state: ViewState) => state.aiPanelOpen
export const selectIsNarrowWindow = (state: ViewState) => state.isNarrowWindow
