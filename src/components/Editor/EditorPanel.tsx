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
  showCornerIcons?: boolean
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
  showCornerIcons = true,
}: EditorPanelProps) {
  const activeTab = useEditorStore((s) => s.getActiveTab())
  const isAIEditing = activeTab?.isAIEditing || false
  const showDiff = activeTab?.showDiff || false

  const hasBanner = isAIEditing || showDiff
  const isReadOnly = readOnly || isAIEditing || showDiff

  return (
    <div className="relative h-full w-full bg-editor-light dark:bg-editor-dark flex flex-col">
      <DiffBanner />

      <div className={`flex-1 relative overflow-hidden ${hasBanner ? '' : ''}`}>
        {showCornerIcons && (
          <EditorCornerIcons content={content} showBurger={true} showCopy={true} showAI={true} />
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
        />
      </div>
    </div>
  )
}
