import { useSettingsStore } from '@/stores/settingsStore'
import ToggleSwitch from '../components/ToggleSwitch'

export default function EditorSection() {
  const lineNumbers = useSettingsStore((s) => s.lineNumbers)
  const wordWrap = useSettingsStore((s) => s.wordWrap)
  const spellCheck = useSettingsStore((s) => s.spellCheck)
  const updateSetting = useSettingsStore((s) => s.updateSetting)

  return (
    <div className="space-y-4">
      <ToggleSwitch
        label="Line Numbers"
        description="Show line numbers in the editor"
        checked={lineNumbers}
        onChange={(value) => updateSetting('lineNumbers', value)}
      />

      <ToggleSwitch
        label="Word Wrap"
        description="Wrap long lines to fit the editor width"
        checked={wordWrap}
        onChange={(value) => updateSetting('wordWrap', value)}
      />

      <ToggleSwitch
        label="Spell Check"
        description="Highlight spelling errors in the editor"
        checked={spellCheck}
        onChange={(value) => updateSetting('spellCheck', value)}
      />
    </div>
  )
}
