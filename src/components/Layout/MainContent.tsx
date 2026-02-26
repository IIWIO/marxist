import { useRef, useEffect } from 'react'
import { useViewStore, selectActiveView, selectAiPanelOpen, selectSidebarOpen } from '@/stores/viewStore'
import { useEditorStore, selectActiveTab } from '@/stores/editorStore'
import { EditorPanel } from '@/components/Editor'
import PreviewPanel from '@/components/Preview/PreviewPanel'
import SplitView from '@/components/SplitView/SplitView'
import { FileSidebar } from '@/components/Sidebar'
import type { EditorRef } from '@/types/editor'

interface MainContentProps {
  isDark: boolean
  fontSize?: number
  lineNumbers?: boolean
  wordWrap?: boolean
  editorRef?: React.MutableRefObject<EditorRef | null>
}

export default function MainContent({
  isDark,
  fontSize = 14,
  lineNumbers = false,
  wordWrap = true,
  editorRef,
}: MainContentProps) {
  const activeView = useViewStore(selectActiveView)
  const aiPanelOpen = useViewStore(selectAiPanelOpen)
  const sidebarOpen = useViewStore(selectSidebarOpen)
  const activeTab = useEditorStore(selectActiveTab)
  const updateTabContent = useEditorStore((state) => state.updateTabContent)
  const updateTabEditorState = useEditorStore((state) => state.updateTabEditorState)

  const content = activeTab?.content || ''

  const handleContentChange = (newContent: string) => {
    if (activeTab) {
      updateTabContent(activeTab.tabId, newContent)
    }
  }

  const previousTabIdRef = useRef<string | null>(null)

  useEffect(() => {
    const currentTabId = activeTab?.tabId || null

    if (previousTabIdRef.current && previousTabIdRef.current !== currentTabId && editorRef?.current) {
      const snapshot = editorRef.current.getSnapshot()
      updateTabEditorState(
        previousTabIdRef.current,
        null,
        snapshot.scrollTop,
        snapshot.selection.anchor
      )
    }

    previousTabIdRef.current = currentTabId
  }, [activeTab?.tabId, editorRef, updateTabEditorState])

  const sidebarOffset = sidebarOpen && activeView !== 'render' ? 240 : 0

  const renderContent = () => {
    if (!activeTab) {
      return (
        <div className="h-full flex items-center justify-center text-text-secondary-light dark:text-text-secondary-dark">
          No file open. Press ⌘N to create a new file.
        </div>
      )
    }

    switch (activeView) {
      case 'markdown':
        return (
          <EditorPanel
            content={content}
            onChange={handleContentChange}
            isDark={isDark}
            fontSize={fontSize}
            lineNumbers={lineNumbers}
            wordWrap={wordWrap}
            editorRef={editorRef}
          />
        )

      case 'split':
        return (
          <SplitView
            leftPanel={
              <EditorPanel
                content={content}
                onChange={handleContentChange}
                isDark={isDark}
                fontSize={fontSize}
                lineNumbers={lineNumbers}
                wordWrap={wordWrap}
                editorRef={editorRef}
              />
            }
            rightPanel={
              <PreviewPanel
                content={content}
                isDark={isDark}
              />
            }
          />
        )

      case 'render':
        return (
          <PreviewPanel
            content={content}
            isDark={isDark}
            fullWidth
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="h-full relative">
      <FileSidebar />

      <div
        className="h-full transition-[margin-left] duration-200 ease-out"
        style={{
          marginLeft: `${sidebarOffset}px`,
          paddingRight: aiPanelOpen ? '360px' : 0,
        }}
      >
        {renderContent()}
      </div>
    </div>
  )
}
