import { useCallback, useEffect } from 'react'
import { useAIStore } from '@/stores/aiStore'
import { useEditorStore } from '@/stores/editorStore'
import { useSettingsStore } from '@/stores/settingsStore'

interface StreamChunkData {
  streamId: string
  content: string
  fullContent: string
}

export function useAIChat() {
  const addMessage = useAIStore((s) => s.addMessage)
  const updateLastMessage = useAIStore((s) => s.updateLastMessage)
  const setLoading = useAIStore((s) => s.setLoading)
  const setStreaming = useAIStore((s) => s.setStreaming)
  const setError = useAIStore((s) => s.setError)
  const getHistory = useAIStore((s) => s.getHistory)
  const clearHistory = useAIStore((s) => s.clearHistory)

  const activeTabId = useEditorStore((s) => s.activeTabId)
  const getActiveTab = useEditorStore((s) => s.getActiveTab)

  const apiKey = useSettingsStore((s) => s.openRouterApiKey)
  const selectedModel = useSettingsStore((s) => s.selectedModel)
  const systemPrompt = useSettingsStore((s) => s.systemPrompt)
  const isApiKeyVerified = useSettingsStore((s) => s.isApiKeyVerified)

  useEffect(() => {
    const unsubChunk = window.electron.onAIEvent(
      'ai:stream-chunk',
      (data: unknown) => {
        const chunkData = data as StreamChunkData
        if (activeTabId) {
          updateLastMessage(activeTabId, chunkData.fullContent)
        }
      }
    )

    const unsubComplete = window.electron.onAIEvent('ai:stream-complete', () => {
      setLoading(false)
      setStreaming(false)
    })

    return () => {
      unsubChunk()
      unsubComplete()
    }
  }, [activeTabId, updateLastMessage, setLoading, setStreaming])

  const sendMessage = useCallback(
    async (message: string) => {
      if (!activeTabId || !apiKey || !message.trim()) return

      const activeTab = getActiveTab()
      const documentContent = activeTab?.content || ''
      const history = getHistory(activeTabId)

      addMessage(activeTabId, { role: 'user', content: message })
      addMessage(activeTabId, { role: 'assistant', content: '' })

      setLoading(true)
      setStreaming(true)
      setError(null)

      try {
        const apiHistory = history.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))

        const result = await window.electron.ai.chat({
          message,
          documentContent,
          history: apiHistory,
          systemPrompt,
          model: selectedModel,
        })

        if (result.error && result.error !== 'aborted') {
          setError(result.error)
          updateLastMessage(activeTabId, `Error: ${result.error}`)
        }
      } catch (error) {
        const errorMessage = (error as Error).message
        setError(errorMessage)
        if (activeTabId) {
          updateLastMessage(activeTabId, `Error: ${errorMessage}`)
        }
      }
    },
    [
      activeTabId,
      apiKey,
      selectedModel,
      systemPrompt,
      getActiveTab,
      getHistory,
      addMessage,
      updateLastMessage,
      setLoading,
      setStreaming,
      setError,
    ]
  )

  const resetConversation = useCallback(() => {
    if (activeTabId) {
      clearHistory(activeTabId)
    }
  }, [activeTabId, clearHistory])

  const cancelStream = useCallback(async () => {
    await window.electron.ai.cancel()
    setLoading(false)
    setStreaming(false)
  }, [setLoading, setStreaming])

  const retryLastMessage = useCallback(async () => {
    if (!activeTabId) return

    const history = getHistory(activeTabId)
    if (history.length < 2) return

    const lastUserMessageIndex = history.length - 2
    const lastUserMessage = history[lastUserMessageIndex]

    if (lastUserMessage?.role !== 'user') return

    const { chatHistories } = useAIStore.getState()
    const newHistory = history.slice(0, -2)
    const newHistories = new Map(chatHistories)
    newHistories.set(activeTabId, newHistory)
    useAIStore.setState({ chatHistories: newHistories, error: null })

    await sendMessage(lastUserMessage.content)
  }, [activeTabId, getHistory, sendMessage])

  return {
    sendMessage,
    resetConversation,
    cancelStream,
    retryLastMessage,
    hasApiKey: Boolean(apiKey),
    isApiKeyVerified,
  }
}
