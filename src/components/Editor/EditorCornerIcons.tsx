import Icon from '@/components/common/Icon'
import Tooltip from '@/components/common/Tooltip'
import { useViewStore } from '@/stores/viewStore'
import { useClipboard } from '@/hooks/useClipboard'

interface EditorCornerIconsProps {
  content: string
  showBurger?: boolean
  showCopy?: boolean
  showAI?: boolean
}

export default function EditorCornerIcons({
  content,
  showBurger = true,
  showCopy = true,
  showAI = true,
}: EditorCornerIconsProps) {
  const toggleSidebar = useViewStore((state) => state.toggleSidebar)
  const toggleAiPanel = useViewStore((state) => state.toggleAiPanel)
  const { copy, copied } = useClipboard()

  const handleCopy = async () => {
    await copy(content)
  }

  return (
    <>
      {showBurger && (
        <div className="absolute top-3 left-3 z-10">
          <Tooltip content="Toggle sidebar (⌘\)">
            <button
              onClick={toggleSidebar}
              aria-label="Toggle file sidebar"
              className="
                flex items-center justify-center w-8 h-8
                transition-colors duration-150
              "
            >
              <Icon name="menu" size={20} />
            </button>
          </Tooltip>
        </div>
      )}

      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {showCopy && (
          <Tooltip content={copied ? 'Copied!' : 'Copy Markdown (⌘⇧C)'}>
            <button
              onClick={handleCopy}
              aria-label="Copy raw Markdown"
              className="flex items-center justify-center w-8 h-8 transition-colors duration-150"
            >
              <Icon name={copied ? 'check' : 'content_copy'} size={20} />
            </button>
          </Tooltip>
        )}

        {showAI && (
          <Tooltip content="Toggle AI panel (⌘⇧A)">
            <button
              onClick={toggleAiPanel}
              aria-label="Toggle AI assistant"
              className="
                flex items-center justify-center w-8 h-8
                transition-colors duration-150
              "
            >
              <Icon name="robot" size={20} />
            </button>
          </Tooltip>
        )}
      </div>
    </>
  )
}
