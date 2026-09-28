import MarkdownEditor from './MarkdownEditor'
import EditorCornerIcons from './EditorCornerIcons'
import DiffBanner from './DiffBanner'
import { useEditorStore } from '@/stores/editorStore'
import type { EditorRef } from '@/types/editor'

interface EditorPanelProps {
  content: string
  onChange: (content: string) => void
  isDark: boolean
  fontSize?: number
  lineNumbers?: boolean
  wordWrap?: boolean
  readOnly?: boolean
  editorRef?: React.MutableRefObject<EditorRef | null>
  spellCheck?: boolean
  showCornerIcons?: boolean
  showAIIcon?: boolean
}

export default function EditorPanel({
  content,
  onChange,
  isDark,
  fontSize = 14,
  lineNumbers = false,
  wordWrap = true,
  readOnly = false,
  editorRef,
  spellCheck = true,
  showCornerIcons = true,
  showAIIcon = true,
}: EditorPanelProps) {
  const activeTab = useEditorStore((s) => s.getActiveTab())
  const isAIEditing = activeTab?.isAIEditing || false
  const showDiff = activeTab?.showDiff || false
  const isReadOnly = readOnly || isAIEditing || showDiff

  if (!activeTab) return null

  return (
    <div className="relative h-full w-full bg-editor-light dark:bg-editor-dark flex flex-col">
      <DiffBanner />

      <div className="flex-1 relative overflow-hidden">
        {showCornerIcons && (
          <EditorCornerIcons content={content} showBurger={true} showCopy={true} showAI={showAIIcon} />
        )}

        <MarkdownEditor
          content={content}
          onChange={onChange}
          isDark={isDark}
          fontSize={fontSize}
          lineNumbers={lineNumbers}
          wordWrap={wordWrap}
          readOnly={isReadOnly}
          editorRef={editorRef}
          tabId={activeTab.tabId}
          editorState={activeTab.editorState}
          cursorPosition={activeTab.cursorPosition}
          scrollPosition={activeTab.scrollPosition}
          onEditorStateChange={useEditorStore.getState().updateTabEditorState}
          spellCheck={spellCheck}
          diffResult={activeTab.diffResult}
        />
      </div>
    </div>
  )
}
