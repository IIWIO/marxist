import { useState, useCallback, useRef, KeyboardEvent } from 'react'
import Icon from '@/components/common/Icon'
import Tooltip from '@/components/common/Tooltip'
import { useAIChat } from '@/hooks/useAIChat'
import { useAIEdit } from '@/hooks/useAIEdit'
import { useAIStore } from '@/stores/aiStore'

interface ChatInputProps {
  disabled?: boolean
}

export default function ChatInput({ disabled }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { sendMessage, cancelStream } = useAIChat()
  const { startEdit, isEditing } = useAIEdit()
  const isLoading = useAIStore((s) => s.isLoading)
  const isStreaming = useAIStore((s) => s.isStreaming)

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    }
  }, [])

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading || disabled || isEditing) return

    if (isEditMode) {
      startEdit(input.trim())
    } else {
      sendMessage(input.trim())
    }
    setInput('')

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [input, isLoading, disabled, isEditing, isEditMode, sendMessage, startEdit])

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
    cancelStream()
  }, [cancelStream])

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
              : isEditMode
                ? 'Describe what to change in the document...'
                : 'Ask about your document...'
          }
          disabled={disabled || isLoading || isEditing}
          rows={1}
          className={`
            w-full px-4 py-3 pr-24
            rounded-xl border
            bg-gray-50 dark:bg-gray-800
            text-sm text-text-primary-light dark:text-text-primary-dark
            placeholder-gray-400
            resize-none
            focus:outline-none focus:ring-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              isEditMode
                ? 'border-amber-400 dark:border-amber-600 focus:ring-amber-500/20 focus:border-amber-500'
                : 'border-gray-200 dark:border-gray-600 focus:ring-accent/20 dark:focus:ring-accent-dark/20 focus:border-accent dark:focus:border-accent-dark'
            }
          `}
        />

        <div className="absolute right-3 bottom-3 flex items-center gap-1">
          <Tooltip content={isEditMode ? 'Edit mode (modifies document)' : 'Chat mode (conversation only)'}>
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              disabled={isLoading || isEditing}
              className={`
                p-1.5 rounded-lg transition-colors
                ${
                  isEditMode
                    ? 'text-amber-500 bg-amber-100 dark:bg-amber-900/30'
                    : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark'
                }
                hover:bg-gray-100 dark:hover:bg-gray-700
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              aria-label={isEditMode ? 'Switch to chat mode' : 'Switch to edit mode'}
            >
              <Icon name={isEditMode ? 'edit_document' : 'chat'} size={18} />
            </button>
          </Tooltip>

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
            aria-label={isStreaming ? 'Cancel' : 'Send message'}
          >
            <Icon name={isStreaming ? 'stop_circle' : 'send'} size={20} />
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs text-text-secondary-light dark:text-text-secondary-dark">
        {isEditMode ? (
          <span className="text-amber-600 dark:text-amber-400">Edit mode: AI will modify your document</span>
        ) : (
          'Press Enter to send, Shift+Enter for new line'
        )}
      </p>
    </div>
  )
}
