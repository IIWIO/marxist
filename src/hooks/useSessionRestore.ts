import { useEffect, useState } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { useViewStore } from '@/stores/viewStore'

interface SessionRestoreState {
  isRestoring: boolean
  isRestored: boolean
  error: string | null
}

export function useSessionRestore(): SessionRestoreState {
  const [state, setState] = useState<SessionRestoreState>({
    isRestoring: true,
    isRestored: false,
    error: null,
  })

  const createTab = useEditorStore((s) => s.createTab)
  const restoreTab = useEditorStore((s) => s.restoreTab)
  const setActiveTab = useEditorStore((s) => s.setActiveTab)
  const setUntitledCounter = useEditorStore((s) => s.setUntitledCounter)

  const setActiveView = useViewStore((s) => s.setActiveView)
  const setSplitRatio = useViewStore((s) => s.setSplitRatio)
  const setSidebarOpen = useViewStore((s) => s.setSidebarOpen)
  const setAiPanelOpen = useViewStore((s) => s.setAiPanelOpen)

  useEffect(() => {
    async function restore() {
      try {
        const response = await window.electron.drafts.restore()
        if (!response.ok) throw new Error(response.error)
        const result = response.value

        if (result.tabs.length === 0) {
          const welcomeResponse = await window.electron.app.getWelcomeFile()
          const welcomeResult = welcomeResponse.ok ? welcomeResponse.value : null
          if (welcomeResult?.isFirstRun && welcomeResult.content) {
            createTab(null, welcomeResult.content, welcomeResult.name || 'Welcome.md')
          } else {
            createTab(null, '')
          }
          setActiveView('split')
          setState({ isRestoring: false, isRestored: true, error: null })
          return
        }

        if (result.session?.untitledCounter) {
          setUntitledCounter(result.session.untitledCounter)
        }

        const tabIdMap = new Map<string, string>()

        for (const tab of result.tabs) {
          const newTabId = restoreTab({
            filePath: tab.filePath,
            fileName: tab.fileName,
            content: tab.content,
            isDirty: tab.isDirty,
            cursorPosition: tab.cursorPosition,
            scrollPosition: tab.scrollPosition,
          })

          tabIdMap.set(tab.tabId, newTabId)
        }

        if (result.session) {
          const activeTabId = result.session.activeTabId
          if (activeTabId && tabIdMap.has(activeTabId)) {
            setActiveTab(tabIdMap.get(activeTabId)!)
          }

          setActiveView(result.session.activeView || 'split')

          if (result.session.splitRatio) {
            setSplitRatio(result.session.splitRatio)
          }
          setSidebarOpen(result.session.sidebarOpen)
          setAiPanelOpen(result.session.aiPanelOpen)
        }

        setState({ isRestoring: false, isRestored: true, error: null })
      } catch (error) {
        console.error('Session restore failed:', error)

        createTab(null, '')
        setActiveView('split')

        setState({
          isRestoring: false,
          isRestored: true,
          error: (error as Error).message,
        })
      }
    }

    restore()
  }, [
    createTab,
    restoreTab,
    setActiveTab,
    setUntitledCounter,
    setActiveView,
    setSplitRatio,
    setSidebarOpen,
    setAiPanelOpen,
  ])

  return state
}
