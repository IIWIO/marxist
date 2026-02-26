import Icon from '@/components/common/Icon'
import Tooltip from '@/components/common/Tooltip'
import { useViewStore } from '@/stores/viewStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAIChat } from '@/hooks/useAIChat'

export default function AIPanelHeader() {
  const toggleAiPanel = useViewStore((s) => s.toggleAiPanel)
  const selectedModel = useSettingsStore((s) => s.selectedModel)
  const { resetConversation } = useAIChat()

  const modelDisplayName = selectedModel.split('/').pop() || selectedModel

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <Icon name="smart_toy" size={20} className="text-accent dark:text-accent-dark" />
        <span className="font-medium text-sm text-text-primary-light dark:text-text-primary-dark">
          Carl
        </span>
        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
          · {modelDisplayName}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Tooltip content="Reset conversation">
          <button
            onClick={resetConversation}
            className="
              p-1.5 rounded-lg
              text-text-secondary-light dark:text-text-secondary-dark
              hover:text-text-primary-light dark:hover:text-text-primary-dark
              hover:bg-gray-100 dark:hover:bg-gray-700
              transition-colors
            "
            aria-label="Reset conversation"
          >
            <Icon name="refresh" size={18} />
          </button>
        </Tooltip>

        <button
          onClick={toggleAiPanel}
          className="
            p-1.5 rounded-lg
            text-text-secondary-light dark:text-text-secondary-dark
            hover:text-text-primary-light dark:hover:text-text-primary-dark
            hover:bg-gray-100 dark:hover:bg-gray-700
            transition-colors
          "
          aria-label="Close AI panel"
        >
          <Icon name="close" size={18} />
        </button>
      </div>
    </div>
  )
}
