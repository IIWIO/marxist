import { useState, useCallback, useRef, KeyboardEvent } from 'react'
import Icon from '@/components/common/Icon'
import { useAIAgent } from '@/hooks/useAIAgent'
import { useAIStore } from '@/stores/aiStore'
import { useEditorStore } from '@/stores/editorStore'

interface ChatInputProps {
  disabled?: boolean
}

export default function ChatInput({ disabled }: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { sendPrompt, cancelRequest } = useAIAgent()
  const isLoading = useAIStore((s) => s.isLoading)
  const isStreaming = useAIStore((s) => s.isStreaming)
  const activeTab = useEditorStore((s) => s.getActiveTab())
  const isEditing = activeTab?.isAIEditing || false

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    }
  }, [])

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading || disabled || isEditing) return

    sendPrompt(input.trim())
    setInput('')

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [input, isLoading, disabled, isEditing, sendPrompt])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleCancel = useCallback(() => {
    cancelRequest()
  }, [cancelRequest])

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            adjustHeight()
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? 'Verify API key in Settings'
              : 'Ask or edit...'
          }
          disabled={disabled || isLoading || isEditing}
          rows={1}
          className="
            w-full px-4 py-3 pr-14
            rounded-xl border
            bg-blue-50 dark:bg-gray-800
            border-blue-200 dark:border-gray-600
            text-sm text-text-primary-light dark:text-text-primary-dark
            placeholder-gray-400
            resize-none
            focus:outline-none focus:ring-2
            focus:ring-accent/20 dark:focus:ring-accent-dark/20
            focus:border-accent dark:focus:border-accent-dark
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        />

        <div className="absolute right-3 bottom-3 flex items-center">
          <button
            onClick={isStreaming ? handleCancel : handleSend}
            disabled={disabled || isEditing || (!input.trim() && !isStreaming)}
            className={`
              p-1.5 rounded-lg
              transition-colors
              ${
                isStreaming
                  ? 'text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30'
                  : input.trim() && !disabled && !isEditing
                    ? 'text-accent dark:text-accent-dark hover:bg-accent/10 dark:hover:bg-accent-dark/10'
                    : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              }
            `}
            aria-label={isStreaming ? 'Cancel' : 'Send'}
          >
            <Icon name={isStreaming ? 'stop_circle' : 'send'} size={20} />
          </button>
        </div>
      </div>

    </div>
  )
}
