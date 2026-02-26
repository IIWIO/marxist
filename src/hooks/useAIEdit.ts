import { useCallback, useEffect, useRef } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { useAIStore } from '@/stores/aiStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { computeDiff, type DiffResult } from '@/utils/diff'

interface UseAIEditReturn {
  startEdit: (instruction: string) => Promise<void>
  acceptEdit: () => void
  revertEdit: () => void
  cancelEdit: () => void
  isEditing: boolean
  showDiff: boolean
  diffResult: DiffResult | null
}

export function useAIEdit(): UseAIEditReturn {
  const activeTabId = useEditorStore((s) => s.activeTabId)
  const getActiveTab = useEditorStore((s) => s.getActiveTab)
  const setTabAIEditing = useEditorStore((s) => s.setTabAIEditing)
  const setTabShowDiff = useEditorStore((s) => s.setTabShowDiff)
  const updateTabContent = useEditorStore((s) => s.updateTabContent)

  const addMessage = useAIStore((s) => s.addMessage)
  const setLoading = useAIStore((s) => s.setLoading)
  const setStreaming = useAIStore((s) => s.setStreaming)
  const setError = useAIStore((s) => s.setError)

  const selectedModel = useSettingsStore((s) => s.selectedModel)
  const systemPrompt = useSettingsStore((s) => s.systemPrompt)
  const apiKey = useSettingsStore((s) => s.openRouterApiKey)

  const diffResultRef = useRef<DiffResult | null>(null)
  const preEditContentRef = useRef<string>('')

  const activeTab = getActiveTab()
  const isEditing = activeTab?.isAIEditing || false
  const showDiff = activeTab?.showDiff || false

  useEffect(() => {
    if (!activeTabId) return

    const unsubChunk = window.electron.onAIEvent('ai:edit-chunk', (data: unknown) => {
      const { fullContent } = data as { fullContent: string }
      updateTabContent(activeTabId, fullContent)
    })

    const unsubComplete = window.electron.onAIEvent('ai:edit-complete', (data: unknown) => {
      const { content } = data as { content: string }
      const originalContent = preEditContentRef.current

      diffResultRef.current = computeDiff(originalContent, content)

      setTabShowDiff(activeTabId, true)
      setLoading(false)
      setStreaming(false)
    })

    const unsubError = window.electron.onAIEvent('ai:edit-error', (data: unknown) => {
      const { error } = data as { error: string }
      if (error !== 'aborted') {
        setError(error)
      }
      if (preEditContentRef.current) {
        updateTabContent(activeTabId, preEditContentRef.current)
      }
      setTabAIEditing(activeTabId, false)
      setLoading(false)
      setStreaming(false)
    })

    return () => {
      unsubChunk()
      unsubComplete()
      unsubError()
    }
  }, [activeTabId, updateTabContent, setTabShowDiff, setTabAIEditing, setLoading, setStreaming, setError])

  const startEdit = useCallback(
    async (instruction: string) => {
      if (!activeTabId || !apiKey) return

      const tab = getActiveTab()
      if (!tab) return

      preEditContentRef.current = tab.content

      setTabAIEditing(activeTabId, true, tab.content)

      addMessage(activeTabId, {
        role: 'user',
        content: instruction,
        isEdit: true,
      })

      setLoading(true)
      setStreaming(true)
      setError(null)

      try {
        const result = await window.electron.ai.edit({
          instruction,
          documentContent: tab.content,
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
        setLoading(false)
        setStreaming(false)
      }
    },
    [activeTabId, apiKey, selectedModel, systemPrompt, getActiveTab, setTabAIEditing, addMessage, setLoading, setStreaming, setError, updateTabContent]
  )

  const acceptEdit = useCallback(() => {
    if (!activeTabId) return

    const tab = getActiveTab()
    if (tab) {
      addMessage(activeTabId, {
        role: 'assistant',
        content: `Changes applied. Modified ${diffResultRef.current?.addedCount || 0} lines, removed ${diffResultRef.current?.removedCount || 0} lines.`,
        isEdit: true,
      })
    }

    setTabAIEditing(activeTabId, false)
    setTabShowDiff(activeTabId, false)
    diffResultRef.current = null
    preEditContentRef.current = ''
  }, [activeTabId, getActiveTab, addMessage, setTabAIEditing, setTabShowDiff])

  const revertEdit = useCallback(() => {
    if (!activeTabId) return

    addMessage(activeTabId, {
      role: 'assistant',
      content: 'Changes reverted.',
      isEdit: true,
    })

    if (preEditContentRef.current) {
      updateTabContent(activeTabId, preEditContentRef.current)
    }

    setTabAIEditing(activeTabId, false)
    setTabShowDiff(activeTabId, false)
    diffResultRef.current = null
    preEditContentRef.current = ''
  }, [activeTabId, addMessage, updateTabContent, setTabAIEditing, setTabShowDiff])

  const cancelEdit = useCallback(async () => {
    if (!activeTabId) return

    await window.electron.ai.cancel()

    if (preEditContentRef.current) {
      updateTabContent(activeTabId, preEditContentRef.current)
    }

    setTabAIEditing(activeTabId, false)
    setTabShowDiff(activeTabId, false)
    diffResultRef.current = null
    setLoading(false)
    setStreaming(false)

    addMessage(activeTabId, {
      role: 'assistant',
      content: 'Edit cancelled. Document restored to original state.',
      isEdit: true,
    })
    preEditContentRef.current = ''
  }, [activeTabId, updateTabContent, setTabAIEditing, setTabShowDiff, setLoading, setStreaming, addMessage])

  return {
    startEdit,
    acceptEdit,
    revertEdit,
    cancelEdit,
    isEditing,
    showDiff,
    diffResult: diffResultRef.current,
  }
}
