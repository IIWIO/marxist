import { useCallback } from 'react'
import { useViewStore, selectActiveView, selectAiPanelOpen, selectSidebarOpen, selectIsNarrowWindow } from '@/stores/viewStore'
import { useEditorStore, selectActiveTab } from '@/stores/editorStore'
import { EditorPanel } from '@/components/Editor'
import PreviewPanel from '@/components/Preview/PreviewPanel'
import SplitView from '@/components/SplitView/SplitView'
import { FileSidebar } from '@/components/Sidebar'
import type { EditorRef } from '@/types/editor'

interface MainContentProps {
  isDark: boolean
  fontSize?: number
  previewFontSize?: number
  lineNumbers?: boolean
  wordWrap?: boolean
  spellCheck?: boolean
  editorRef?: React.MutableRefObject<EditorRef | null>
}

export default function MainContent({
  isDark,
  fontSize = 14,
  previewFontSize = 16,
  lineNumbers = false,
  wordWrap = true,
  spellCheck = true,
  editorRef,
}: MainContentProps) {
  const activeView = useViewStore(selectActiveView)
  const aiPanelOpen = useViewStore(selectAiPanelOpen)
  const sidebarOpen = useViewStore(selectSidebarOpen)
  const isNarrowWindow = useViewStore(selectIsNarrowWindow)
  const activeTab = useEditorStore(selectActiveTab)
  const updateTabContent = useEditorStore((state) => state.updateTabContent)

  const content = activeTab?.content || ''

  const activeTabId = activeTab?.tabId
  const handleContentChange = useCallback((newContent: string) => {
    if (activeTabId) updateTabContent(activeTabId, newContent)
  }, [activeTabId, updateTabContent])

  const sidebarOffset = !isNarrowWindow && sidebarOpen && activeView !== 'render' ? 240 : 0
  const aiOffset = !isNarrowWindow && aiPanelOpen ? 360 : 0

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
            spellCheck={spellCheck}
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
                spellCheck={spellCheck}
                editorRef={editorRef}
                showAIIcon={false}
              />
            }
            rightPanel={
              <PreviewPanel
                content={content}
                isDark={isDark}
                fontSize={previewFontSize}
              />
            }
          />
        )

      case 'render':
        return (
          <PreviewPanel
            content={content}
            isDark={isDark}
            fontSize={previewFontSize}
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
        className="h-full overflow-hidden transition-[margin-left,margin-right] duration-200 ease-out"
        style={{
          marginLeft: `${sidebarOffset}px`,
          marginRight: `${aiOffset}px`,
        }}
      >
        {renderContent()}
      </div>
    </div>
  )
}
