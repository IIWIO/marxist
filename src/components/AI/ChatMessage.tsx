import { useMarkdownParser } from '@/hooks/useMarkdownParser'
import type { ChatMessage as ChatMessageType } from '@/stores/aiStore'

interface ChatMessageProps {
  message: ChatMessageType
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  const { html } = useMarkdownParser(isUser ? '' : message.content, { debounceMs: 200 })

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[85%] rounded-2xl px-4 py-2.5
          ${
            isUser
              ? 'bg-accent dark:bg-accent-dark text-white rounded-br-md'
              : 'bg-gray-100 dark:bg-gray-800 text-text-primary-light dark:text-text-primary-dark rounded-bl-md'
          }
          ${message.isError ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : ''}
        `}
      >
        {isUser ? (
          <p className="text-xs whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div
            className="text-xs prose prose-sm dark:prose-invert max-w-none
              prose-p:my-1 prose-headings:my-2 prose-pre:my-2 prose-ul:my-1 prose-ol:my-1
              prose-code:text-xs prose-code:px-1 prose-code:py-0.5 prose-code:rounded
              prose-code:bg-gray-200 prose-code:dark:bg-gray-700"
            dangerouslySetInnerHTML={{ __html: html || message.content }}
          />
        )}
      </div>
    </div>
  )
}
