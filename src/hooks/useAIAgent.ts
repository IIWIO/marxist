import { useCallback, useEffect, useRef } from 'react'
import { useAIStore } from '@/stores/aiStore'
import { useEditorStore } from '@/stores/editorStore'
import { useSettingsStore } from '@/stores/settingsStore'

interface UseAIAgentReturn {
  sendPrompt: (prompt: string) => Promise<void>
  cancelRequest: () => Promise<void>
  acceptEdit: () => void
  revertEdit: () => void
  isProcessing: boolean
  hasApiKey: boolean
  isApiKeyVerified: boolean
}

export function useAIAgent(): UseAIAgentReturn {
  const activeTabId = useEditorStore((s) => s.activeTabId)
  const getActiveTab = useEditorStore((s) => s.getActiveTab)
  const setTabAIEditing = useEditorStore((s) => s.setTabAIEditing)
  const setTabShowDiff = useEditorStore((s) => s.setTabShowDiff)
  const updateTabContent = useEditorStore((s) => s.updateTabContent)

  const addMessage = useAIStore((s) => s.addMessage)
  const updateLastMessage = useAIStore((s) => s.updateLastMessage)
  const setLoading = useAIStore((s) => s.setLoading)
  const setStreaming = useAIStore((s) => s.setStreaming)
  const setError = useAIStore((s) => s.setError)
  const getHistory = useAIStore((s) => s.getHistory)
  const isLoading = useAIStore((s) => s.isLoading)

  const apiKey = useSettingsStore((s) => s.openRouterApiKey)
  const selectedModel = useSettingsStore((s) => s.selectedModel)
  const systemPrompt = useSettingsStore((s) => s.systemPrompt)
  const isApiKeyVerified = useSettingsStore((s) => s.isApiKeyVerified)

  const preEditContentRef = useRef<string>('')
  const isEditingRef = useRef(false)
  const streamedContentRef = useRef('')

  useEffect(() => {
    if (!activeTabId) return

    const unsubChunk = window.electron.onAIEvent('ai:stream-chunk', (data: unknown) => {
      const { fullContent } = data as { fullContent: string }
      streamedContentRef.current = fullContent

      if (isEditingRef.current) {
        // For edits, update the document content directly
        updateTabContent(activeTabId, fullContent)
      } else {
        // For chat, update the chat message
        updateLastMessage(activeTabId, fullContent)
      }
    })

    const unsubComplete = window.electron.onAIEvent('ai:stream-complete', () => {
      if (isEditingRef.current) {
        setTabShowDiff(activeTabId, true)
      }
      setLoading(false)
      setStreaming(false)
    })

    const unsubError = window.electron.onAIEvent('ai:stream-error', (data: unknown) => {
      const { error } = data as { error: string }
      if (error !== 'aborted') {
        setError(error)
        if (isEditingRef.current && preEditContentRef.current) {
          updateTabContent(activeTabId, preEditContentRef.current)
        }
      }
      if (isEditingRef.current) {
        setTabAIEditing(activeTabId, false)
      }
      isEditingRef.current = false
      setLoading(false)
      setStreaming(false)
    })

    // Also listen for edit events
    const unsubEditChunk = window.electron.onAIEvent('ai:edit-chunk', (data: unknown) => {
      const { fullContent } = data as { fullContent: string }
      streamedContentRef.current = fullContent
      updateTabContent(activeTabId, fullContent)
    })

    const unsubEditComplete = window.electron.onAIEvent('ai:edit-complete', () => {
      setTabShowDiff(activeTabId, true)
      setLoading(false)
      setStreaming(false)
    })

    const unsubEditError = window.electron.onAIEvent('ai:edit-error', (data: unknown) => {
      const { error } = data as { error: string }
      if (error !== 'aborted') {
        setError(error)
      }
      if (preEditContentRef.current) {
        updateTabContent(activeTabId, preEditContentRef.current)
      }
      setTabAIEditing(activeTabId, false)
      isEditingRef.current = false
      setLoading(false)
      setStreaming(false)
    })

    return () => {
      unsubChunk()
      unsubComplete()
      unsubError()
      unsubEditChunk()
      unsubEditComplete()
      unsubEditError()
    }
  }, [activeTabId, updateTabContent, updateLastMessage, setTabShowDiff, setTabAIEditing, setLoading, setStreaming, setError])

  const sendPrompt = useCallback(
    async (prompt: string) => {
      if (!activeTabId || !apiKey || !prompt.trim()) return

      const tab = getActiveTab()
      if (!tab) return

      const documentContent = tab.content
      const history = getHistory(activeTabId)

      // Detect if this is likely an edit request
      const editKeywords = [
        'change', 'replace', 'update', 'modify', 'edit', 'fix', 'correct',
        'add', 'insert', 'remove', 'delete', 'convert', 'transform',
        'make', 'turn', 'rewrite', 'reformat', 'restructure'
      ]
      const lowerPrompt = prompt.toLowerCase()
      const isLikelyEdit = editKeywords.some(keyword => lowerPrompt.includes(keyword))

      setLoading(true)
      setStreaming(true)
      setError(null)

      if (isLikelyEdit) {
        // Handle as an edit request
        isEditingRef.current = true
        preEditContentRef.current = documentContent
        streamedContentRef.current = ''

        setTabAIEditing(activeTabId, true, documentContent)

        addMessage(activeTabId, {
          role: 'user',
          content: prompt,
          isEdit: true,
        })

        try {
          const result = await window.electron.ai.edit({
            instruction: prompt,
            documentContent,
            model: selectedModel,
            systemPrompt,
          })

          if (result.error && result.error !== 'aborted') {
            throw new Error(result.error)
          }
        } catch (error) {
          const errorMessage = (error as Error).message
          if (errorMessage !== 'aborted') {
            setError(errorMessage)
            if (preEditContentRef.current) {
              updateTabContent(activeTabId, preEditContentRef.current)
            }
            setTabAIEditing(activeTabId, false)
          }
          isEditingRef.current = false
          setLoading(false)
          setStreaming(false)
        }
      } else {
        // Handle as a chat/question request
        isEditingRef.current = false
        streamedContentRef.current = ''

        addMessage(activeTabId, { role: 'user', content: prompt })
        addMessage(activeTabId, { role: 'assistant', content: '' })

        try {
          const apiHistory = history.map((msg) => ({
            role: msg.role,
            content: msg.content,
          }))

          const result = await window.electron.ai.chat({
            message: prompt,
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
          updateLastMessage(activeTabId, `Error: ${errorMessage}`)
        }
      }
    },
    [activeTabId, apiKey, selectedModel, systemPrompt, getActiveTab, getHistory, addMessage, updateLastMessage, updateTabContent, setTabAIEditing, setLoading, setStreaming, setError]
  )

  const cancelRequest = useCallback(async () => {
    await window.electron.ai.cancel()

    if (isEditingRef.current && preEditContentRef.current && activeTabId) {
      updateTabContent(activeTabId, preEditContentRef.current)
      setTabAIEditing(activeTabId, false)
      setTabShowDiff(activeTabId, false)

      addMessage(activeTabId, {
        role: 'assistant',
        content: 'Edit cancelled. Document restored.',
        isEdit: true,
      })
    }

    isEditingRef.current = false
    preEditContentRef.current = ''
    setLoading(false)
    setStreaming(false)
  }, [activeTabId, updateTabContent, setTabAIEditing, setTabShowDiff, addMessage, setLoading, setStreaming])

  const acceptEdit = useCallback(() => {
    if (!activeTabId) return

    addMessage(activeTabId, {
      role: 'assistant',
      content: 'Changes applied.',
      isEdit: true,
    })

    setTabAIEditing(activeTabId, false)
    setTabShowDiff(activeTabId, false)
    isEditingRef.current = false
    preEditContentRef.current = ''
  }, [activeTabId, addMessage, setTabAIEditing, setTabShowDiff])

  const revertEdit = useCallback(() => {
    if (!activeTabId) return

    if (preEditContentRef.current) {
      updateTabContent(activeTabId, preEditContentRef.current)
    }

    addMessage(activeTabId, {
      role: 'assistant',
      content: 'Changes reverted.',
      isEdit: true,
    })

    setTabAIEditing(activeTabId, false)
    setTabShowDiff(activeTabId, false)
    isEditingRef.current = false
    preEditContentRef.current = ''
  }, [activeTabId, addMessage, updateTabContent, setTabAIEditing, setTabShowDiff])

  return {
    sendPrompt,
    cancelRequest,
    acceptEdit,
    revertEdit,
    isProcessing: isLoading,
    hasApiKey: Boolean(apiKey),
    isApiKeyVerified,
  }
}
