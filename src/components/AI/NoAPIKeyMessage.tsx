import Icon from '@/components/common/Icon'
import { useSettingsStore } from '@/stores/settingsStore'

export default function NoAPIKeyMessage() {
  const openModal = useSettingsStore((s) => s.openModal)
  const setActiveTab = useSettingsStore((s) => s.setActiveTab)

  const handleOpenSettings = () => {
    setActiveTab('ai')
    openModal()
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon
          name="key"
          size={32}
          className="text-text-secondary-light dark:text-text-secondary-dark"
        />
      </div>

      <h3 className="text-lg font-medium text-text-primary-light dark:text-text-primary-dark mb-2">
        API Key Required
      </h3>

      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4 max-w-xs">
        To use the AI assistant, you need to configure your OpenRouter API key in Settings.
      </p>

      <button
        onClick={handleOpenSettings}
        className="
          px-4 py-2 rounded-lg
          bg-accent dark:bg-accent-dark text-white
          font-medium text-sm
          hover:opacity-90 transition-opacity
        "
      >
        Open Settings
      </button>
    </div>
  )
}
