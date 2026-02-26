import Icon from '@/components/common/Icon'
import { useSettingsStore } from '@/stores/settingsStore'

export default function SettingsHeader() {
  const closeModal = useSettingsStore((s) => s.closeModal)

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <h2
        id="settings-title"
        className="text-lg font-medium text-text-primary-light dark:text-text-primary-dark"
      >
        Settings
      </h2>
      <button
        onClick={closeModal}
        className="
          p-1.5 rounded-lg
          text-text-secondary-light dark:text-text-secondary-dark
          hover:text-text-primary-light dark:hover:text-text-primary-dark
          hover:bg-gray-100 dark:hover:bg-gray-700
          transition-colors
        "
        aria-label="Close settings"
      >
        <Icon name="close" size={20} />
      </button>
    </div>
  )
}
