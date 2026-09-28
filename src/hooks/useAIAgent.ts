import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { useAIStore } from '@/stores/aiStore'
import { useEditorStore } from '@/stores/editorStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { computeDiff } from '@/utils/diff'

interface ActiveRequest {
  streamId: string
  tabId: string
  mode: 'chat' | 'edit'
  originalContent: string
}

interface AIAgentValue {
  sendPrompt: (prompt: string) => Promise<void>
  cancelRequest: () => Promise<void>
  acceptEdit: () => void
  revertEdit: () => void
  resetConversation: () => void
  retryLastMessage: () => Promise<void>
  isProcessing: boolean
  hasApiKey: boolean
  isApiKeyVerified: boolean
}

const AIAgentContext = createContext<AIAgentValue | null>(null)

function createStreamId(mode: 'chat' | 'edit'): string {
  const id = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${mode}-${id}`
}

function isEditRequest(prompt: string): boolean {
  const keywords = [
    'change', 'replace', 'update', 'modify', 'edit', 'fix', 'correct', 'add', 'insert',
    'remove', 'delete', 'convert', 'transform', 'make', 'turn', 'rewrite', 'reformat',
    'restructure', 'write', 'create', 'generate', 'draft', 'compose', 'build', 'put',
    'append', 'prepend', 'include',
  ]
  const normalized = prompt.toLowerCase()
  return keywords.some((keyword) => normalized.includes(keyword))
}

export function AIAgentProvider({ children }: { children: React.ReactNode }) {
  const requestRef = useRef<ActiveRequest | null>(null)
  const isLoading = useAIStore((state) => state.isLoading)
  const hasApiKey = useSettingsStore((state) => state.hasApiKey)
  const isApiKeyVerified = useSettingsStore((state) => state.isApiKeyVerified)

  const settle = useCallback((streamId: string) => {
    if (requestRef.current?.streamId !== streamId) return false
    requestRef.current = null
    useAIStore.getState().setLoading(false)
    useAIStore.getState().setStreaming(false)
    return true
  }, [])

  const failRequest = useCallback(
    (streamId: string, error: string) => {
      const request = requestRef.current
      if (!request || request.streamId !== streamId) return
      const editor = useEditorStore.getState()
      const ai = useAIStore.getState()
      if (request.mode === 'edit') {
        editor.updateTabContent(request.tabId, request.originalContent)
        editor.setTabAIEditing(request.tabId, false, null)
        editor.setTabShowDiff(request.tabId, false)
        editor.setTabDiff(request.tabId, null)
      } else if (error !== 'aborted') {
        ai.updateLastMessage(request.tabId, `Error: ${error}`)
      }
      if (error !== 'aborted') ai.setError(error)
      settle(streamId)
    },
    [settle]
  )

  useEffect(() => {
    const unsubChunk = window.electron.onAIEvent('ai:stream-chunk', (event) => {
      const request = requestRef.current
      if (request?.streamId === event.streamId && request.mode === 'chat') {
        useAIStore.getState().updateLastMessage(request.tabId, event.fullContent)
      }
    })
    const unsubChatComplete = window.electron.onAIEvent('ai:stream-complete', (event) => {
      settle(event.streamId)
    })
    const unsubChatError = window.electron.onAIEvent('ai:stream-error', (event) => {
      failRequest(event.streamId, event.error)
    })
    const unsubEditComplete = window.electron.onAIEvent('ai:edit-complete', (event) => {
      const request = requestRef.current
      if (!request || request.streamId !== event.streamId || request.mode !== 'edit') return
      const editor = useEditorStore.getState()
      editor.updateTabContent(request.tabId, event.content)
      editor.setTabDiff(request.tabId, computeDiff(request.originalContent, event.content))
      editor.setTabAIEditing(request.tabId, false)
      editor.setTabShowDiff(request.tabId, true)
      settle(event.streamId)
    })
    const unsubEditError = window.electron.onAIEvent('ai:edit-error', (event) => {
      failRequest(event.streamId, event.error)
    })
    return () => {
      unsubChunk()
      unsubChatComplete()
      unsubChatError()
      unsubEditComplete()
      unsubEditError()
    }
  }, [failRequest, settle])

  const sendPrompt = useCallback(async (rawPrompt: string) => {
    const prompt = rawPrompt.trim()
    const editor = useEditorStore.getState()
    const settings = useSettingsStore.getState()
    const ai = useAIStore.getState()
    const tabId = editor.activeTabId
    const tab = tabId ? editor.tabs.get(tabId) : null
    if (!prompt || !tab || !settings.hasApiKey || requestRef.current) return

    const mode = isEditRequest(prompt) ? 'edit' : 'chat'
    const streamId = createStreamId(mode)
    requestRef.current = { streamId, tabId: tab.tabId, mode, originalContent: tab.content }
    ai.setLoading(true)
    ai.setStreaming(true)
    ai.setError(null)
    const model = settings.availableModels.find((item) => item.id === settings.selectedModel)

    try {
      if (mode === 'edit') {
        editor.setTabAIEditing(tab.tabId, true, tab.content)
        editor.setTabDiff(tab.tabId, null)
        ai.addMessage(tab.tabId, { role: 'user', content: prompt, isEdit: true })
        const result = await window.electron.ai.edit({
          instruction: prompt,
          documentContent: tab.content,
          model: settings.selectedModel,
          systemPrompt: settings.systemPrompt,
          contextLength: model?.contextLength,
          streamId,
        })
        if (!result.ok) failRequest(streamId, result.error)
        return
      }

      const history = ai.getHistory(tab.tabId)
      ai.addMessage(tab.tabId, { role: 'user', content: prompt })
      ai.addMessage(tab.tabId, { role: 'assistant', content: '' })
      const result = await window.electron.ai.chat({
        message: prompt,
        documentContent: tab.content,
        history: history.map(({ role, content }) => ({ role, content })),
        systemPrompt: settings.systemPrompt,
        model: settings.selectedModel,
        contextLength: model?.contextLength,
        streamId,
      })
      if (!result.ok) failRequest(streamId, result.error)
    } catch (error) {
      failRequest(streamId, error instanceof Error ? error.message : 'AI request failed')
    }
  }, [failRequest])

  const cancelRequest = useCallback(async () => {
    const request = requestRef.current
    if (!request) return
    try {
      await window.electron.ai.cancel(request.streamId)
    } catch {
      // The local request must still settle even if the main process is unavailable.
    }
    failRequest(request.streamId, 'aborted')
    if (request.mode === 'edit') {
      useAIStore.getState().addMessage(request.tabId, {
        role: 'assistant',
        content: 'Edit cancelled. Document restored.',
        isEdit: true,
      })
    }
  }, [failRequest])

  const acceptEdit = useCallback(() => {
    const editor = useEditorStore.getState()
    const tab = editor.getActiveTab()
    if (!tab?.showDiff) return
    const diff = tab.diffResult
    useAIStore.getState().addMessage(tab.tabId, {
      role: 'assistant',
      content: `Changes applied. Added ${diff?.addedCount || 0} lines and removed ${diff?.removedCount || 0} lines.`,
      isEdit: true,
    })
    editor.setTabShowDiff(tab.tabId, false)
    editor.setTabDiff(tab.tabId, null)
    editor.setTabAIEditing(tab.tabId, false, null)
  }, [])

  const revertEdit = useCallback(() => {
    const editor = useEditorStore.getState()
    const tab = editor.getActiveTab()
    if (!tab?.showDiff || tab.preEditSnapshot === null) return
    editor.updateTabContent(tab.tabId, tab.preEditSnapshot)
    editor.setTabShowDiff(tab.tabId, false)
    editor.setTabDiff(tab.tabId, null)
    editor.setTabAIEditing(tab.tabId, false, null)
    useAIStore.getState().addMessage(tab.tabId, {
      role: 'assistant', content: 'Changes reverted.', isEdit: true,
    })
  }, [])

  const resetConversation = useCallback(() => {
    const tabId = useEditorStore.getState().activeTabId
    if (tabId) useAIStore.getState().clearHistory(tabId)
  }, [])

  const retryLastMessage = useCallback(async () => {
    const tabId = useEditorStore.getState().activeTabId
    if (!tabId) return
    const ai = useAIStore.getState()
    const history = ai.getHistory(tabId)
    const userMessage = [...history].reverse().find((message) => message.role === 'user')
    if (!userMessage) return
    const histories = new Map(ai.chatHistories)
    histories.set(tabId, history.slice(0, Math.max(0, history.lastIndexOf(userMessage))))
    useAIStore.setState({ chatHistories: histories, error: null })
    await sendPrompt(userMessage.content)
  }, [sendPrompt])

  const value = useMemo<AIAgentValue>(() => ({
    sendPrompt,
    cancelRequest,
    acceptEdit,
    revertEdit,
    resetConversation,
    retryLastMessage,
    isProcessing: isLoading,
    hasApiKey,
    isApiKeyVerified,
  }), [
    sendPrompt, cancelRequest, acceptEdit, revertEdit, resetConversation,
    retryLastMessage, isLoading, hasApiKey, isApiKeyVerified,
  ])

  return createElement(AIAgentContext.Provider, { value }, children)
}

export function useAIAgent(): AIAgentValue {
  const value = useContext(AIAgentContext)
  if (!value) throw new Error('useAIAgent must be used within AIAgentProvider')
  return value
}
