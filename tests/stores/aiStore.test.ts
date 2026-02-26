import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAIStore } from '@/stores/aiStore'

describe('aiStore', () => {
  beforeEach(() => {
    useAIStore.setState({
      chatHistories: new Map(),
      isLoading: false,
      isStreaming: false,
      currentStreamContent: '',
      error: null,
      abortController: null,
    })
  })

  describe('per-file chat history (AI-06)', () => {
    it('maintains separate history per tab', () => {
      const { addMessage, getHistory } = useAIStore.getState()

      addMessage('tab-1', { role: 'user', content: 'Hello from tab 1' })
      addMessage('tab-2', { role: 'user', content: 'Hello from tab 2' })

      const history1 = getHistory('tab-1')
      const history2 = getHistory('tab-2')

      expect(history1).toHaveLength(1)
      expect(history1[0].content).toBe('Hello from tab 1')
      expect(history2).toHaveLength(1)
      expect(history2[0].content).toBe('Hello from tab 2')
    })

    it('returns empty array for unknown tab', () => {
      const { getHistory } = useAIStore.getState()
      expect(getHistory('unknown')).toEqual([])
    })
  })

  describe('addMessage', () => {
    it('generates unique message IDs', () => {
      const { addMessage, getHistory } = useAIStore.getState()

      addMessage('tab-1', { role: 'user', content: 'Message 1' })
      addMessage('tab-1', { role: 'assistant', content: 'Response 1' })

      const history = getHistory('tab-1')
      expect(history[0].id).not.toBe(history[1].id)
      expect(history[0].id).toMatch(/^msg-/)
      expect(history[1].id).toMatch(/^msg-/)
    })

    it('adds timestamp to messages', () => {
      const { addMessage, getHistory } = useAIStore.getState()

      addMessage('tab-1', { role: 'user', content: 'Test' })

      const history = getHistory('tab-1')
      expect(history[0].timestamp).toBeDefined()
      expect(new Date(history[0].timestamp).getTime()).toBeLessThanOrEqual(Date.now())
    })

    it('clears error when adding message', () => {
      useAIStore.setState({ error: 'Previous error' })

      useAIStore.getState().addMessage('tab-1', { role: 'user', content: 'Test' })

      expect(useAIStore.getState().error).toBeNull()
    })
  })

  describe('clearHistory (AI-07)', () => {
    it('clears only specified tab history', () => {
      const { addMessage, clearHistory, getHistory } = useAIStore.getState()

      addMessage('tab-1', { role: 'user', content: 'Message 1' })
      addMessage('tab-2', { role: 'user', content: 'Message 2' })

      clearHistory('tab-1')

      expect(getHistory('tab-1')).toHaveLength(0)
      expect(getHistory('tab-2')).toHaveLength(1)
    })
  })

  describe('updateLastMessage (AI-10)', () => {
    it('updates content of last message for streaming', () => {
      const { addMessage, updateLastMessage, getHistory } = useAIStore.getState()

      addMessage('tab-1', { role: 'assistant', content: '' })
      updateLastMessage('tab-1', 'Streaming content...')

      const history = getHistory('tab-1')
      expect(history[0].content).toBe('Streaming content...')
    })

    it('does nothing for empty history', () => {
      const { updateLastMessage, getHistory } = useAIStore.getState()

      updateLastMessage('tab-1', 'Test')

      expect(getHistory('tab-1')).toHaveLength(0)
    })
  })

  describe('loading/streaming state', () => {
    it('setLoading updates isLoading', () => {
      useAIStore.getState().setLoading(true)
      expect(useAIStore.getState().isLoading).toBe(true)

      useAIStore.getState().setLoading(false)
      expect(useAIStore.getState().isLoading).toBe(false)
    })

    it('setStreaming updates isStreaming', () => {
      useAIStore.getState().setStreaming(true)
      expect(useAIStore.getState().isStreaming).toBe(true)
    })
  })

  describe('appendStreamContent', () => {
    it('appends to current stream content', () => {
      useAIStore.getState().setStreamContent('Hello')
      useAIStore.getState().appendStreamContent(' World')

      expect(useAIStore.getState().currentStreamContent).toBe('Hello World')
    })
  })

  describe('cancelStream', () => {
    it('resets streaming state', () => {
      const controller = new AbortController()
      useAIStore.setState({
        abortController: controller,
        isStreaming: true,
        isLoading: true,
        currentStreamContent: 'Some content',
      })

      useAIStore.getState().cancelStream()

      expect(useAIStore.getState().isStreaming).toBe(false)
      expect(useAIStore.getState().isLoading).toBe(false)
      expect(useAIStore.getState().currentStreamContent).toBe('')
      expect(useAIStore.getState().abortController).toBeNull()
    })

    it('calls abort on controller', () => {
      const controller = new AbortController()
      const abortSpy = vi.spyOn(controller, 'abort')

      useAIStore.setState({ abortController: controller })
      useAIStore.getState().cancelStream()

      expect(abortSpy).toHaveBeenCalled()
    })
  })
})
