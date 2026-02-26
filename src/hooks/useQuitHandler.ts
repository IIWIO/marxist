import { useEffect } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { useViewStore } from '@/stores/viewStore'

export function useQuitHandler(): void {
  useEffect(() => {
    const handleQuitRequest = async () => {
      const editorState = useEditorStore.getState()
      const viewState = useViewStore.getState()

      const drafts = Array.from(editorState.tabs.values()).map((tab) => ({
        tabId: tab.tabId,
        content: tab.content,
        filePath: tab.filePath,
        fileName: tab.fileName,
        isDirty: tab.isDirty,
        cursorPosition: tab.cursorPosition,
        scrollPosition: tab.scrollPosition,
      }))

      const session = {
        openTabIds: Array.from(editorState.tabs.keys()),
        activeTabId: editorState.activeTabId,
        untitledCounter: editorState.untitledCounter,
        activeView: viewState.activeView,
        splitRatio: viewState.splitRatio,
        sidebarOpen: viewState.sidebarOpen,
        aiPanelOpen: viewState.aiPanelOpen,
      }

      try {
        await window.electron.app.saveBeforeQuit({ drafts, session })
      } catch (error) {
        console.error('Failed to save before quit:', error)
      }

      window.electron.app.readyToQuit()
    }

    const unsubscribe = window.electron.onAppEvent('app:quit-requested', handleQuitRequest)

    return () => {
      unsubscribe()
    }
  }, [])
}
