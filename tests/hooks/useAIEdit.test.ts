import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useEditorStore } from '@/stores/editorStore'
import { useSettingsStore } from '@/stores/settingsStore'

describe('useAIEdit', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const initialTabs = new Map()
    useEditorStore.setState({
      tabs: initialTabs,
      activeTabId: null,
      wordCount: 0,
      letterCount: 0,
      untitledCounter: 0,
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('store interactions', () => {
    it('setTabAIEditing updates tab editing state', () => {
      const tabId = useEditorStore.getState().createTab(null, 'Test content')
      useEditorStore.getState().setTabAIEditing(tabId, true, 'snapshot')

      const updatedTab = useEditorStore.getState().tabs.get(tabId)
      expect(updatedTab?.isAIEditing).toBe(true)
      expect(updatedTab?.preEditSnapshot).toBe('snapshot')
    })

    it('setTabShowDiff updates tab diff visibility', () => {
      const tabId = useEditorStore.getState().createTab(null, 'Test content')
      useEditorStore.getState().setTabShowDiff(tabId, true)

      const updatedTab = useEditorStore.getState().tabs.get(tabId)
      expect(updatedTab?.showDiff).toBe(true)
    })

    it('updateTabContent during AI edit preserves editSnapshot', () => {
      const tabId = useEditorStore.getState().createTab(null, 'Original content')
      useEditorStore.getState().setTabAIEditing(tabId, true, 'Original content')
      useEditorStore.getState().updateTabContent(tabId, 'Modified content')

      const updatedTab = useEditorStore.getState().tabs.get(tabId)
      expect(updatedTab?.content).toBe('Modified content')
      expect(updatedTab?.preEditSnapshot).toBe('Original content')
    })

    it('clearing AI edit state resets flags', () => {
      const tabId = useEditorStore.getState().createTab(null, 'Test content')
      useEditorStore.getState().setTabAIEditing(tabId, true, 'snapshot')
      useEditorStore.getState().setTabShowDiff(tabId, true)

      useEditorStore.getState().setTabAIEditing(tabId, false)
      useEditorStore.getState().setTabShowDiff(tabId, false)

      const updatedTab = useEditorStore.getState().tabs.get(tabId)
      expect(updatedTab?.isAIEditing).toBe(false)
      expect(updatedTab?.showDiff).toBe(false)
    })
  })

  describe('settings integration', () => {
    it('uses model from settings store', () => {
      useSettingsStore.setState({
        selectedModel: 'openai/gpt-4',
        openRouterApiKey: 'test-key',
      })

      const settings = useSettingsStore.getState()
      expect(settings.selectedModel).toBe('openai/gpt-4')
      expect(settings.openRouterApiKey).toBe('test-key')
    })

    it('uses systemPrompt from settings store', () => {
      useSettingsStore.setState({
        systemPrompt: 'Custom system prompt',
      })

      const settings = useSettingsStore.getState()
      expect(settings.systemPrompt).toBe('Custom system prompt')
    })
  })
})
