import MarkdownPreview from './MarkdownPreview'
import EditorCornerIcons from '@/components/Editor/EditorCornerIcons'
import { useViewStore, selectActiveView } from '@/stores/viewStore'

interface PreviewPanelProps {
  content: string
  isDark: boolean
  fontSize?: number
  fullWidth?: boolean
}

export default function PreviewPanel({ content, isDark, fontSize = 16, fullWidth = false }: PreviewPanelProps) {
  const activeView = useViewStore(selectActiveView)
  const showAIIcon = activeView === 'render' || activeView === 'split'

  const handleLinkClick = (url: string) => {
    void window.electron.file.openExternal(url)
  }

  return (
    <div className={`relative h-full bg-preview-light dark:bg-preview-dark ${fullWidth ? 'w-full' : ''}`}>
      {showAIIcon && <EditorCornerIcons content={content} showBurger={false} showCopy={false} showAI={true} />}

      <MarkdownPreview content={content} isDark={isDark} fontSize={fontSize} onLinkClick={handleLinkClick} />
    </div>
  )
}
