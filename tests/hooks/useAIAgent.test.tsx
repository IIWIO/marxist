import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AIAgentProvider, useAIAgent } from '@/hooks/useAIAgent'
import { useAIStore } from '@/stores/aiStore'
import { useEditorStore } from '@/stores/editorStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { mockElectronAPI } from '../setup'

describe('AIAgentProvider', () => {
  const eventHandlers = new Map<string, (data: unknown) => void>()

  beforeEach(() => {
    vi.clearAllMocks()
    eventHandlers.clear()
    mockElectronAPI.onAIEvent.mockImplementation((channel, callback) => {
      eventHandlers.set(channel, callback as (data: unknown) => void)
      return () => eventHandlers.delete(channel)
    })
    mockElectronAPI.ai.edit.mockResolvedValue({ ok: true, value: { content: 'Edited' } })
    mockElectronAPI.ai.chat.mockResolvedValue({ ok: true, value: { content: 'Answer' } })
    useEditorStore.setState({ tabs: new Map(), activeTabId: null })
    useAIStore.setState({ chatHistories: new Map(), isLoading: false, isStreaming: false, error: null })
    useSettingsStore.setState({
      hasApiKey: true,
      isApiKeyVerified: true,
      selectedModel: 'test/model',
      systemPrompt: 'Be helpful',
      availableModels: [{ id: 'test/model', name: 'Test', contextLength: 8_192 }],
    })
  })

  it('routes edit completion to the originating tab after the active tab changes', async () => {
    const first = useEditorStore.getState().createTab(null, 'Original')
    const second = useEditorStore.getState().createTab(null, 'Second')
    useEditorStore.getState().setActiveTab(first)
    const { result } = renderHook(() => useAIAgent(), { wrapper: AIAgentProvider })

    await act(() => result.current.sendPrompt('Rewrite this document'))
    const params = mockElectronAPI.ai.edit.mock.calls[0][0]
    useEditorStore.getState().setActiveTab(second)
    act(() => eventHandlers.get('ai:edit-complete')?.({ streamId: params.streamId, content: 'Edited' }))

    expect(useEditorStore.getState().tabs.get(first)?.content).toBe('Edited')
    expect(useEditorStore.getState().tabs.get(second)?.content).toBe('Second')
    expect(useEditorStore.getState().tabs.get(first)?.showDiff).toBe(true)
  })

  it('reverts from the shared per-tab snapshot', async () => {
    const tabId = useEditorStore.getState().createTab(null, 'Original')
    const { result } = renderHook(() => useAIAgent(), { wrapper: AIAgentProvider })
    await act(() => result.current.sendPrompt('Rewrite this document'))
    const params = mockElectronAPI.ai.edit.mock.calls[0][0]
    act(() => eventHandlers.get('ai:edit-complete')?.({ streamId: params.streamId, content: 'Edited' }))
    act(() => result.current.revertEdit())
    expect(useEditorStore.getState().tabs.get(tabId)?.content).toBe('Original')
  })

  it('settles loading after a returned chat error', async () => {
    useEditorStore.getState().createTab(null, 'Document')
    mockElectronAPI.ai.chat.mockResolvedValue({ ok: false, error: 'network failed' })
    const { result } = renderHook(() => useAIAgent(), { wrapper: AIAgentProvider })
    await act(() => result.current.sendPrompt('What is this?'))
    expect(useAIStore.getState().isLoading).toBe(false)
    expect(useAIStore.getState().error).toBe('network failed')
  })
})
