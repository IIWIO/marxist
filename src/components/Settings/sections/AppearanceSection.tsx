import { useSettingsStore } from '@/stores/settingsStore'
import ThemeToggle from '../components/ThemeToggle'
import FontSizeSlider from '../components/FontSizeSlider'

export default function AppearanceSection() {
  const theme = useSettingsStore((s) => s.theme)
  const editorFontSize = useSettingsStore((s) => s.editorFontSize)
  const previewFontSize = useSettingsStore((s) => s.previewFontSize)
  const updateSetting = useSettingsStore((s) => s.updateSetting)

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">
          Theme
        </label>
        <ThemeToggle value={theme} onChange={(value) => updateSetting('theme', value)} />
        <p className="mt-1.5 text-xs text-text-secondary-light dark:text-text-secondary-dark">
          System follows your macOS appearance preference
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">
          Editor Font Size
        </label>
        <FontSizeSlider
          value={editorFontSize}
          min={10}
          max={24}
          onChange={(value) => updateSetting('editorFontSize', value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">
          Preview Font Size
        </label>
        <FontSizeSlider
          value={previewFontSize}
          min={12}
          max={28}
          onChange={(value) => updateSetting('previewFontSize', value)}
        />
      </div>
    </div>
  )
}
