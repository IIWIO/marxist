import { useEffect, useCallback } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'

export function useSettings() {
  const loadSettings = useSettingsStore((s) => s.loadSettings)
  const updateSetting = useSettingsStore((s) => s.updateSetting)
  const openModal = useSettingsStore((s) => s.openModal)
  const closeModal = useSettingsStore((s) => s.closeModal)

  const theme = useSettingsStore((s) => s.theme)
  const editorFontSize = useSettingsStore((s) => s.editorFontSize)
  const previewFontSize = useSettingsStore((s) => s.previewFontSize)
  const lineNumbers = useSettingsStore((s) => s.lineNumbers)
  const wordWrap = useSettingsStore((s) => s.wordWrap)
  const spellCheck = useSettingsStore((s) => s.spellCheck)
  const isLoading = useSettingsStore((s) => s.isLoading)

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const cycleTheme = useCallback(() => {
    const themes: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark']
    const currentIndex = themes.indexOf(theme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    updateSetting('theme', nextTheme)
  }, [theme, updateSetting])

  return {
    theme,
    editorFontSize,
    previewFontSize,
    lineNumbers,
    wordWrap,
    spellCheck,
    isLoading,
    updateSetting,
    openModal,
    closeModal,
    cycleTheme,
  }
}
