import { useSettingsStore } from '@/stores/settingsStore'

type TabId = 'appearance' | 'ai' | 'editor' | 'about'

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'ai', label: 'AI' },
  { id: 'editor', label: 'Editor' },
  { id: 'about', label: 'About' },
]

export default function SettingsTabs() {
  const activeTab = useSettingsStore((s) => s.activeTab)
  const setActiveTab = useSettingsStore((s) => s.setActiveTab)

  return (
    <div className="flex px-6 border-b border-gray-200 dark:border-gray-700">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`
            px-4 py-3 text-sm font-medium transition-colors relative
            ${
              activeTab === tab.id
                ? 'text-accent dark:text-accent-dark'
                : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark'
            }
          `}
        >
          {tab.label}
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent dark:bg-accent-dark" />
          )}
        </button>
      ))}
    </div>
  )
}
