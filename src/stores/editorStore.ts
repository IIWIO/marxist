import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { EditorState } from '@codemirror/state'
import type { TabState } from '@/types/files'
import type { DiffResult } from '@/utils/diff'

interface EditorStoreState {
  tabs: Map<string, TabState>
  activeTabId: string | null
  wordCount: number
  letterCount: number
  untitledCounter: number

  createTab: (filePath?: string | null, content?: string, customFileName?: string) => string
  restoreTab: (tab: {
    filePath: string | null
    fileName: string
    content: string
    isDirty: boolean
    cursorPosition: number
    scrollPosition: number
  }) => string
  closeTab: (tabId: string) => void
  closeAllTabs: () => void
  setActiveTab: (tabId: string) => void
  updateTabContent: (tabId: string, content: string) => void
  updateTabEditorState: (tabId: string, state: EditorState | null, scroll?: number, cursor?: number) => void
  markTabSaved: (tabId: string, filePath?: string, fileName?: string) => void
  getActiveTab: () => TabState | null
  getTabByPath: (filePath: string) => TabState | null
  setTabAIEditing: (tabId: string, isEditing: boolean, preEditSnapshot?: string | null) => void
  setTabShowDiff: (tabId: string, showDiff: boolean) => void
  setTabDiff: (tabId: string, diff: DiffResult | null) => void
  setUntitledCounter: (counter: number) => void
  refreshCounts: (content: string) => void
}

const MAX_TABS = 20

function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function getFileNameFromPath(filePath: string): string {
  return filePath.split('/').pop() || filePath
}

function calculateCounts(content: string): { wordCount: number; letterCount: number } {
  let wordCount = 0
  let letterCount = 0
  let inWord = false
  for (const character of content) {
    const whitespace = /\s/.test(character)
    if (!whitespace) {
      letterCount += 1
      if (!inWord) wordCount += 1
    }
    inWord = !whitespace
  }
  return { wordCount, letterCount }
}

export const useEditorStore = create<EditorStoreState>()(
  subscribeWithSelector((set, get) => ({
    tabs: new Map(),
    activeTabId: null,
    wordCount: 0,
    letterCount: 0,
    untitledCounter: 0,

    createTab: (filePath = null, content = '', customFileName?: string) => {
      let { tabs, untitledCounter } = get()

      if (tabs.size >= MAX_TABS) {
        let oldestNonDirtyTabId: string | null = null
        for (const [id, tab] of tabs) {
          if (!tab.isDirty) {
            oldestNonDirtyTabId = id
            break
          }
        }

        if (oldestNonDirtyTabId) {
          get().closeTab(oldestNonDirtyTabId)
          tabs = get().tabs
        } else {
          console.warn('Cannot create new tab: 20 tabs limit reached, all have unsaved changes')
          return ''
        }
      }

      const tabId = generateTabId()
      let fileName: string

      if (customFileName) {
        fileName = customFileName
      } else if (filePath) {
        fileName = getFileNameFromPath(filePath)
      } else {
        untitledCounter = get().untitledCounter
        const newCounter = untitledCounter + 1
        fileName = newCounter === 1 ? 'Untitled' : `Untitled ${newCounter}`
        set({ untitledCounter: newCounter })
      }

      const newTab: TabState = {
        tabId,
        filePath,
        fileName,
        content,
        savedContent: content,
        isDirty: false,
        editorState: null,
        scrollPosition: 0,
        cursorPosition: 0,
        preEditSnapshot: null,
        isAIEditing: false,
        showDiff: false,
        diffResult: null,
      }

      const newTabs = new Map(tabs)
      newTabs.set(tabId, newTab)

      set({
        tabs: newTabs,
        activeTabId: tabId,
        ...calculateCounts(content),
      })

      return tabId
    },

    restoreTab: (tabData) => {
      const { tabs } = get()

      if (tabs.size >= MAX_TABS) {
        console.warn('Cannot restore tab: 20 tabs limit reached')
        return ''
      }

      const tabId = generateTabId()

      const newTab: TabState = {
        tabId,
        filePath: tabData.filePath,
        fileName: tabData.fileName,
        content: tabData.content,
        savedContent: tabData.isDirty ? '' : tabData.content,
        isDirty: tabData.isDirty,
        editorState: null,
        scrollPosition: tabData.scrollPosition,
        cursorPosition: tabData.cursorPosition,
        preEditSnapshot: null,
        isAIEditing: false,
        showDiff: false,
        diffResult: null,
      }

      const newTabs = new Map(tabs)
      newTabs.set(tabId, newTab)

      set({
        tabs: newTabs,
        activeTabId: tabId,
        ...calculateCounts(tabData.content),
      })

      return tabId
    },

    closeTab: (tabId) => {
      const { tabs, activeTabId } = get()

      if (!tabs.has(tabId)) return

      const newTabs = new Map(tabs)
      newTabs.delete(tabId)

      let newActiveTabId = activeTabId
      if (activeTabId === tabId) {
        const remainingIds = Array.from(newTabs.keys())
        newActiveTabId = remainingIds.length > 0 ? remainingIds[remainingIds.length - 1] : null
      }

      const newActiveTab = newActiveTabId ? newTabs.get(newActiveTabId) : null

      set({
        tabs: newTabs,
        activeTabId: newActiveTabId,
        ...(newActiveTab ? calculateCounts(newActiveTab.content) : { wordCount: 0, letterCount: 0 }),
      })
    },

    closeAllTabs: () => {
      set({
        tabs: new Map(),
        activeTabId: null,
        wordCount: 0,
        letterCount: 0,
        untitledCounter: 0,
      })
    },

    setActiveTab: (tabId) => {
      const { tabs } = get()
      const tab = tabs.get(tabId)

      if (!tab) return

      set({
        activeTabId: tabId,
        ...calculateCounts(tab.content),
      })
    },

    updateTabContent: (tabId, content) => {
      const { tabs } = get()
      const tab = tabs.get(tabId)

      if (!tab) return

      const newTab: TabState = {
        ...tab,
        content,
        isDirty: content !== tab.savedContent,
      }

      const newTabs = new Map(tabs)
      newTabs.set(tabId, newTab)

      set({ tabs: newTabs })
    },

    updateTabEditorState: (tabId, state, scroll, cursor) => {
      const { tabs } = get()
      const tab = tabs.get(tabId)

      if (!tab) return

      const newTab: TabState = {
        ...tab,
        editorState: state,
        scrollPosition: scroll ?? tab.scrollPosition,
        cursorPosition: cursor ?? tab.cursorPosition,
      }

      const newTabs = new Map(tabs)
      newTabs.set(tabId, newTab)

      set({ tabs: newTabs })
    },

    markTabSaved: (tabId, filePath, fileName) => {
      const { tabs } = get()
      const tab = tabs.get(tabId)

      if (!tab) return

      const newTab: TabState = {
        ...tab,
        filePath: filePath ?? tab.filePath,
        fileName: fileName ?? tab.fileName,
        savedContent: tab.content,
        isDirty: false,
      }

      const newTabs = new Map(tabs)
      newTabs.set(tabId, newTab)

      set({ tabs: newTabs })
    },

    getActiveTab: () => {
      const { tabs, activeTabId } = get()
      return activeTabId ? tabs.get(activeTabId) || null : null
    },

    getTabByPath: (filePath) => {
      const { tabs } = get()
      for (const tab of tabs.values()) {
        if (tab.filePath === filePath) {
          return tab
        }
      }
      return null
    },

    setTabAIEditing: (tabId, isEditing, preEditSnapshot) => {
      const { tabs } = get()
      const tab = tabs.get(tabId)

      if (!tab) return

      const newTab: TabState = {
        ...tab,
        isAIEditing: isEditing,
        preEditSnapshot: preEditSnapshot === undefined ? tab.preEditSnapshot : preEditSnapshot,
      }

      const newTabs = new Map(tabs)
      newTabs.set(tabId, newTab)

      set({ tabs: newTabs })
    },

    setTabShowDiff: (tabId, showDiff) => {
      const { tabs } = get()
      const tab = tabs.get(tabId)

      if (!tab) return

      const newTab: TabState = {
        ...tab,
        showDiff,
      }

      const newTabs = new Map(tabs)
      newTabs.set(tabId, newTab)

      set({ tabs: newTabs })
    },

    setTabDiff: (tabId, diffResult) => {
      const { tabs } = get()
      const tab = tabs.get(tabId)
      if (!tab) return
      const newTabs = new Map(tabs)
      newTabs.set(tabId, { ...tab, diffResult })
      set({ tabs: newTabs })
    },

    setUntitledCounter: (counter) => {
      set({ untitledCounter: counter })
    },

    refreshCounts: (content) => set(calculateCounts(content)),
  }))
)

export const selectActiveTab = (state: EditorStoreState) =>
  state.activeTabId ? state.tabs.get(state.activeTabId) : null
export const selectTabs = (state: EditorStoreState) => state.tabs
export const selectActiveTabId = (state: EditorStoreState) => state.activeTabId
export const selectWordCount = (state: EditorStoreState) => state.wordCount
export const selectLetterCount = (state: EditorStoreState) => state.letterCount
