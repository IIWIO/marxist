import { useEffect, useRef } from 'react'
import ChatMessage from './ChatMessage'
import TypingIndicator from './TypingIndicator'
import type { ChatMessage as ChatMessageType } from '@/stores/aiStore'

interface ChatMessagesProps {
  messages: ChatMessageType[]
  isLoading: boolean
  error: string | null
  onRetry?: () => void
}

export default function ChatMessages({
  messages,
  isLoading,
  error,
  onRetry,
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark text-center">
            Ask me anything about your document,
            <br />
            or request edits like "fix my table"
          </p>
        </div>
      ) : (
        messages.map((message) => <ChatMessage key={message.id} message={message} />)
      )}

      {isLoading && <TypingIndicator />}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  )
}
