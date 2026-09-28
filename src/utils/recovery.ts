import type { DraftSnapshot } from '@/types/ipc'
import type { SessionState } from '@/types/session'
import { useEditorStore } from '@/stores/editorStore'
import { useViewStore } from '@/stores/viewStore'

export function buildRecoveryPayload(): {
  drafts: DraftSnapshot[]
  session: Omit<SessionState, 'savedAt' | 'appVersion'>
} {
  const editor = useEditorStore.getState()
  const view = useViewStore.getState()
  const tabs = Array.from(editor.tabs.values())
  return {
    drafts: tabs
      .filter((tab) => tab.isDirty || !tab.filePath)
      .map((tab) => ({
        tabId: tab.tabId,
        content: tab.content,
        filePath: tab.filePath,
        fileName: tab.fileName,
        isDirty: tab.isDirty,
        cursorPosition: tab.cursorPosition,
        scrollPosition: tab.scrollPosition,
      })),
    session: {
      openTabIds: tabs.map((tab) => tab.tabId),
      activeTabId: editor.activeTabId,
      untitledCounter: editor.untitledCounter,
      activeView: view.activeView,
      splitRatio: view.splitRatio,
      sidebarOpen: view.sidebarOpen,
      aiPanelOpen: view.aiPanelOpen,
      tabs: tabs.map((tab) => ({
        tabId: tab.tabId,
        filePath: tab.filePath,
        fileName: tab.fileName,
        isDirty: tab.isDirty,
        cursorPosition: tab.cursorPosition,
        scrollPosition: tab.scrollPosition,
      })),
    },
  }
}
