import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSettingsStore } from '@/stores/settingsStore'

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      theme: 'system',
      editorFontSize: 14,
      previewFontSize: 16,
      openRouterApiKey: '',
      selectedModel: 'anthropic/claude-sonnet-4-20250514',
      systemPrompt: '',
      isApiKeyVerified: false,
      availableModels: [],
      lineNumbers: false,
      wordWrap: true,
      spellCheck: true,
      isLoading: true,
      isModalOpen: false,
      activeTab: 'appearance',
    })

    vi.stubGlobal('window', {
      electron: {
        settings: {
          get: vi.fn().mockResolvedValue({
            theme: 'dark',
            editorFontSize: 16,
            previewFontSize: 18,
            lineNumbers: true,
            wordWrap: false,
            spellCheck: false,
            openRouterApiKey: '',
            selectedModel: '',
            systemPrompt: '',
          }),
          set: vi.fn().mockResolvedValue({}),
          reset: vi.fn().mockResolvedValue({
            theme: 'system',
            editorFontSize: 14,
            previewFontSize: 16,
            lineNumbers: false,
            wordWrap: true,
            spellCheck: true,
            openRouterApiKey: '',
            selectedModel: '',
            systemPrompt: '',
          }),
        },
      },
    })
  })

  describe('openModal', () => {
    it('sets isModalOpen to true', () => {
      useSettingsStore.getState().openModal()
      expect(useSettingsStore.getState().isModalOpen).toBe(true)
    })
  })

  describe('closeModal', () => {
    it('sets isModalOpen to false', () => {
      useSettingsStore.setState({ isModalOpen: true, activeTab: 'ai' })
      useSettingsStore.getState().closeModal()

      expect(useSettingsStore.getState().isModalOpen).toBe(false)
      expect(useSettingsStore.getState().activeTab).toBe('appearance')
    })
  })

  describe('setActiveTab', () => {
    it('changes the active tab', () => {
      useSettingsStore.getState().setActiveTab('editor')
      expect(useSettingsStore.getState().activeTab).toBe('editor')

      useSettingsStore.getState().setActiveTab('ai')
      expect(useSettingsStore.getState().activeTab).toBe('ai')
    })
  })

  describe('loadSettings', () => {
    it('loads settings from electron store', async () => {
      await useSettingsStore.getState().loadSettings()

      expect(useSettingsStore.getState().theme).toBe('dark')
      expect(useSettingsStore.getState().editorFontSize).toBe(16)
      expect(useSettingsStore.getState().previewFontSize).toBe(18)
      expect(useSettingsStore.getState().lineNumbers).toBe(true)
      expect(useSettingsStore.getState().wordWrap).toBe(false)
      expect(useSettingsStore.getState().isLoading).toBe(false)
    })

    it('sets isLoading to false on error', async () => {
      vi.mocked(window.electron.settings.get).mockRejectedValue(new Error('Load failed'))

      await useSettingsStore.getState().loadSettings()

      expect(useSettingsStore.getState().isLoading).toBe(false)
    })
  })

  describe('updateSetting', () => {
    it('updates local state', async () => {
      await useSettingsStore.getState().updateSetting('theme', 'dark')
      expect(useSettingsStore.getState().theme).toBe('dark')
    })

    it('persists persistable settings', async () => {
      await useSettingsStore.getState().updateSetting('editorFontSize', 18)

      expect(window.electron.settings.set).toHaveBeenCalledWith('editorFontSize', 18)
    })
  })

  describe('setApiKeyVerified', () => {
    it('sets verified status and models', () => {
      const models = [{ id: 'test-model', name: 'Test Model', contextLength: 4096 }]
      useSettingsStore.getState().setApiKeyVerified(true, models)

      expect(useSettingsStore.getState().isApiKeyVerified).toBe(true)
      expect(useSettingsStore.getState().availableModels).toEqual(models)
    })

    it('clears models when set to false', () => {
      useSettingsStore.setState({
        isApiKeyVerified: true,
        availableModels: [{ id: 'test', name: 'Test', contextLength: 4096 }],
      })

      useSettingsStore.getState().setApiKeyVerified(false)

      expect(useSettingsStore.getState().isApiKeyVerified).toBe(false)
      expect(useSettingsStore.getState().availableModels).toEqual([])
    })
  })

  describe('resetToDefaults', () => {
    it('resets all settings to defaults', async () => {
      useSettingsStore.setState({
        theme: 'dark',
        editorFontSize: 20,
        isApiKeyVerified: true,
      })

      await useSettingsStore.getState().resetToDefaults()

      expect(useSettingsStore.getState().theme).toBe('system')
      expect(useSettingsStore.getState().editorFontSize).toBe(14)
      expect(useSettingsStore.getState().isApiKeyVerified).toBe(false)
    })
  })
})
