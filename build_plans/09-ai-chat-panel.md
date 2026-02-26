# Stage 09: AI Chat Panel

## Overview

Implement the AI chat panel with per-file conversation history, streaming responses from OpenRouter, and the complete chat UI. This stage covers conversational AI; document editing is in Stage 10.

## Requirements Covered

### AI Chat Panel

| ID | Requirement | Priority |
|----|-------------|----------|
| AI-01 | Toggled by robot icon (`robot` Material Symbol) or ⌘⇧A | P0 |
| AI-02 | Width: 360px, slides in from right | P0 |
| AI-03 | Available in **all three views** | P0 |
| AI-04 | In split view: pushes/shrinks both editor and preview equally | P0 |
| AI-05 | Header: robot icon + "AI Assistant" + model name + reset icon + close X | P0 |
| AI-06 | Chat is **per file** — switching files switches conversation | P0 |
| AI-07 | Reset icon clears conversation for current file | P0 |
| AI-08 | Chat messages: user right-aligned, AI left-aligned | P0 |
| AI-09 | AI responses render Markdown inline | P1 |
| AI-10 | Streaming: tokens display progressively | P0 |
| AI-11 | Input: expandable text field, Enter to send, Shift+Enter for newline | P0 |
| AI-12 | Loading state: typing indicator animation | P1 |
| AI-13 | Error state: inline error message with retry | P0 |
| AI-14 | If no API key configured: show message directing to Settings | P0 |

## Dependencies from Stage 08

- settingsStore with API key, model, system prompt
- AI handlers for verify/listModels
- openExternal for Settings link

---

## 1. Project Structure

```
src/
├── components/
│   ├── AI/
│   │   ├── AIPanel.tsx              # NEW: Panel container
│   │   ├── AIPanelHeader.tsx        # NEW: Header with controls
│   │   ├── ChatMessages.tsx         # NEW: Message list
│   │   ├── ChatMessage.tsx          # NEW: Single message bubble
│   │   ├── ChatInput.tsx            # NEW: Text input
│   │   ├── TypingIndicator.tsx      # NEW: Loading animation
│   │   └── NoAPIKeyMessage.tsx      # NEW: Settings prompt
├── stores/
│   └── aiStore.ts                   # NEW: Per-file chat state
└── hooks/
    └── useAIChat.ts                 # NEW: Chat operations hook
```

---

## 2. AI Store

### 2.1 src/stores/aiStore.ts

```typescript
import { create } from 'zustand'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isEdit?: boolean        // True if this was an edit request
  isError?: boolean       // True if this message is an error
}

interface AIStoreState {
  // Per-file chat histories (AI-06)
  chatHistories: Map<string, ChatMessage[]>
  
  // Current state
  isLoading: boolean
  isStreaming: boolean
  currentStreamContent: string
  error: string | null
  
  // Abort controller for cancellation
  abortController: AbortController | null
  
  // Actions
  getHistory: (tabId: string) => ChatMessage[]
  addMessage: (tabId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  updateLastMessage: (tabId: string, content: string) => void
  clearHistory: (tabId: string) => void
  setLoading: (loading: boolean) => void
  setStreaming: (streaming: boolean) => void
  setStreamContent: (content: string) => void
  appendStreamContent: (chunk: string) => void
  setError: (error: string | null) => void
  setAbortController: (controller: AbortController | null) => void
  cancelStream: () => void
}

function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export const useAIStore = create<AIStoreState>()((set, get) => ({
  chatHistories: new Map(),
  isLoading: false,
  isStreaming: false,
  currentStreamContent: '',
  error: null,
  abortController: null,

  getHistory: (tabId) => {
    return get().chatHistories.get(tabId) || []
  },

  addMessage: (tabId, message) => {
    const { chatHistories } = get()
    const history = chatHistories.get(tabId) || []
    
    const newMessage: ChatMessage = {
      ...message,
      id: generateMessageId(),
      timestamp: new Date().toISOString(),
    }

    const newHistories = new Map(chatHistories)
    newHistories.set(tabId, [...history, newMessage])

    set({ chatHistories: newHistories, error: null })
  },

  updateLastMessage: (tabId, content) => {
    const { chatHistories } = get()
    const history = chatHistories.get(tabId) || []
    
    if (history.length === 0) return

    const newHistory = [...history]
    newHistory[newHistory.length - 1] = {
      ...newHistory[newHistory.length - 1],
      content,
    }

    const newHistories = new Map(chatHistories)
    newHistories.set(tabId, newHistory)

    set({ chatHistories: newHistories })
  },

  // AI-07: Clear conversation for current file
  clearHistory: (tabId) => {
    const { chatHistories } = get()
    const newHistories = new Map(chatHistories)
    newHistories.delete(tabId)
    set({ chatHistories: newHistories })
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setStreamContent: (content) => set({ currentStreamContent: content }),
  appendStreamContent: (chunk) => set((state) => ({
    currentStreamContent: state.currentStreamContent + chunk,
  })),
  setError: (error) => set({ error }),

  setAbortController: (controller) => set({ abortController: controller }),

  cancelStream: () => {
    const { abortController } = get()
    if (abortController) {
      abortController.abort()
      set({ 
        abortController: null, 
        isStreaming: false, 
        isLoading: false,
        currentStreamContent: '',
      })
    }
  },
}))

// Selectors
export const selectChatHistory = (tabId: string) => (state: AIStoreState) => 
  state.chatHistories.get(tabId) || []
export const selectIsLoading = (state: AIStoreState) => state.isLoading
export const selectIsStreaming = (state: AIStoreState) => state.isStreaming
export const selectError = (state: AIStoreState) => state.error
```

---

## 3. AI Chat Hook

### 3.1 src/hooks/useAIChat.ts

```typescript
import { useCallback } from 'react'
import { useAIStore } from '@/stores/aiStore'
import { useEditorStore } from '@/stores/editorStore'
import { useSettingsStore } from '@/stores/settingsStore'

export function useAIChat() {
  const addMessage = useAIStore((s) => s.addMessage)
  const updateLastMessage = useAIStore((s) => s.updateLastMessage)
  const setLoading = useAIStore((s) => s.setLoading)
  const setStreaming = useAIStore((s) => s.setStreaming)
  const setStreamContent = useAIStore((s) => s.setStreamContent)
  const appendStreamContent = useAIStore((s) => s.appendStreamContent)
  const setError = useAIStore((s) => s.setError)
  const setAbortController = useAIStore((s) => s.setAbortController)
  const getHistory = useAIStore((s) => s.getHistory)
  const clearHistory = useAIStore((s) => s.clearHistory)
  const cancelStream = useAIStore((s) => s.cancelStream)

  const activeTabId = useEditorStore((s) => s.activeTabId)
  const getActiveTab = useEditorStore((s) => s.getActiveTab)
  
  const apiKey = useSettingsStore((s) => s.openRouterApiKey)
  const selectedModel = useSettingsStore((s) => s.selectedModel)
  const systemPrompt = useSettingsStore((s) => s.systemPrompt)
  const isApiKeyVerified = useSettingsStore((s) => s.isApiKeyVerified)

  // AI-10: Send chat message with streaming
  const sendMessage = useCallback(async (message: string) => {
    if (!activeTabId || !apiKey || !message.trim()) return

    const activeTab = getActiveTab()
    const documentContent = activeTab?.content || ''
    const history = getHistory(activeTabId)

    // Add user message
    addMessage(activeTabId, { role: 'user', content: message })

    // Create placeholder for assistant response
    addMessage(activeTabId, { role: 'assistant', content: '' })

    setLoading(true)
    setStreaming(true)
    setStreamContent('')
    setError(null)

    try {
      // Create abort controller for cancellation
      const controller = new AbortController()
      setAbortController(controller)

      // Format history for API
      const apiHistory = history.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      // Call AI chat via IPC
      const result = await window.electron.ai.chat({
        message,
        documentContent,
        history: apiHistory,
        systemPrompt,
        model: selectedModel,
        signal: controller.signal,
      })

      if (result.error) {
        throw new Error(result.error)
      }

      // The streaming is handled via IPC events
      // Final content update happens when stream completes

    } catch (error) {
      const errorMessage = (error as Error).message
      
      if (errorMessage !== 'aborted') {
        setError(errorMessage)
        // Update last message to show error
        updateLastMessage(activeTabId, `Error: ${errorMessage}`)
      }
    } finally {
      setLoading(false)
      setStreaming(false)
      setAbortController(null)
    }
  }, [activeTabId, apiKey, selectedModel, systemPrompt])

  // AI-07: Reset conversation
  const resetConversation = useCallback(() => {
    if (activeTabId) {
      clearHistory(activeTabId)
    }
  }, [activeTabId, clearHistory])

  return {
    sendMessage,
    resetConversation,
    cancelStream,
    hasApiKey: Boolean(apiKey),
    isApiKeyVerified,
  }
}
```

---

## 4. AI Panel Components

### 4.1 src/components/AI/AIPanel.tsx

```typescript
import { useViewStore, selectAiPanelOpen } from '@/stores/viewStore'
import { useEditorStore, selectActiveTabId } from '@/stores/editorStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAIStore } from '@/stores/aiStore'
import { useAIChat } from '@/hooks/useAIChat'
import AIPanelHeader from './AIPanelHeader'
import ChatMessages from './ChatMessages'
import ChatInput from './ChatInput'
import NoAPIKeyMessage from './NoAPIKeyMessage'

export default function AIPanel() {
  const isOpen = useViewStore(selectAiPanelOpen)
  const activeTabId = useEditorStore(selectActiveTabId)
  const apiKey = useSettingsStore((s) => s.openRouterApiKey)
  const isApiKeyVerified = useSettingsStore((s) => s.isApiKeyVerified)
  
  const history = useAIStore((s) => activeTabId ? s.chatHistories.get(activeTabId) || [] : [])
  const isLoading = useAIStore((s) => s.isLoading)
  const error = useAIStore((s) => s.error)
  
  const { retryLastMessage } = useAIChat()

  // AI-03: Available in all three views (controlled by parent)
  // Note: Animation handled by CSS transform, not conditional rendering
  
  return (
    <div
      className={`
        fixed top-topbar right-0 h-[calc(100vh-44px)] z-20
        bg-white dark:bg-[#1E1E1E]
        border-l border-gray-200 dark:border-gray-700
        flex flex-col
        transform transition-transform
        ${isOpen 
          ? 'translate-x-0 duration-200 ease-out'   // Slide in: 200ms ease-out
          : 'translate-x-full duration-150 ease-in' // Slide out: 150ms ease-in
        }
      `}
      style={{ width: '360px' }} // AI-02: 360px fixed width
      aria-hidden={!isOpen}
    >
      <AIPanelHeader />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* AI-14: No API key message */}
        {!apiKey ? (
          <NoAPIKeyMessage />
        ) : (
          <>
            <ChatMessages
              messages={history}
              isLoading={isLoading}
              error={error}
              onRetry={retryLastMessage}
            />
            <ChatInput disabled={!isApiKeyVerified} />
          </>
        )}
      </div>
    </div>
  )
}
```

### 4.2 src/components/AI/AIPanelHeader.tsx

```typescript
import Icon from '@/components/common/Icon'
import Tooltip from '@/components/common/Tooltip'
import { useViewStore } from '@/stores/viewStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAIChat } from '@/hooks/useAIChat'

export default function AIPanelHeader() {
  const toggleAiPanel = useViewStore((s) => s.toggleAiPanel)
  const selectedModel = useSettingsStore((s) => s.selectedModel)
  const { resetConversation } = useAIChat()

  // Extract short model name for display
  const modelDisplayName = selectedModel.split('/').pop() || selectedModel

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      {/* AI-05: Robot icon + "AI Assistant" */}
      <div className="flex items-center gap-2">
        <Icon name="robot" size={20} className="text-accent dark:text-accent-dark" />
        <span className="font-medium text-sm text-text-primary-light dark:text-text-primary-dark">
          AI Assistant
        </span>
        {/* AI-05: Model name (muted) */}
        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
          · {modelDisplayName}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {/* AI-07: Reset icon */}
        <Tooltip content="Reset conversation">
          <button
            onClick={resetConversation}
            className="
              p-1.5 rounded-lg
              text-text-secondary-light dark:text-text-secondary-dark
              hover:text-text-primary-light dark:hover:text-text-primary-dark
              hover:bg-gray-100 dark:hover:bg-gray-700
              transition-colors
            "
            aria-label="Reset conversation"
          >
            <Icon name="refresh" size={18} />
          </button>
        </Tooltip>

        {/* AI-05: Close X */}
        <button
          onClick={toggleAiPanel}
          className="
            p-1.5 rounded-lg
            text-text-secondary-light dark:text-text-secondary-dark
            hover:text-text-primary-light dark:hover:text-text-primary-dark
            hover:bg-gray-100 dark:hover:bg-gray-700
            transition-colors
          "
          aria-label="Close AI panel"
        >
          <Icon name="close" size={18} />
        </button>
      </div>
    </div>
  )
}
```

### 4.3 src/components/AI/ChatMessages.tsx

```typescript
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

export default function ChatMessages({ messages, isLoading, error, onRetry }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark text-center">
            Ask me anything about your document,<br />
            or request edits like "fix my table"
          </p>
        </div>
      ) : (
        messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))
      )}

      {/* AI-12: Typing indicator */}
      {isLoading && <TypingIndicator />}

      {/* AI-13: Error state with retry */}
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
```

### 4.4 src/components/AI/ChatMessage.tsx

```typescript
import { useMemo } from 'react'
import { useMarkdownParser } from '@/hooks/useMarkdownParser'
import type { ChatMessage as ChatMessageType } from '@/stores/aiStore'

interface ChatMessageProps {
  message: ChatMessageType
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  
  // AI-09: Render Markdown in AI responses
  const { html } = useMarkdownParser(
    isUser ? '' : message.content,
    200 // Fast debounce for streaming
  )

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* AI-08: User right-aligned, AI left-aligned */}
      <div
        className={`
          max-w-[85%] rounded-2xl px-4 py-2.5
          ${isUser
            ? 'bg-accent dark:bg-accent-dark text-white rounded-br-md'
            : 'bg-gray-100 dark:bg-gray-800 text-text-primary-light dark:text-text-primary-dark rounded-bl-md'
          }
          ${message.isError ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : ''}
        `}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          // AI-09: Markdown rendered
          <div
            className="text-sm prose prose-sm dark:prose-invert max-w-none
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
```

### 4.5 src/components/AI/ChatInput.tsx

```typescript
import { useState, useCallback, useRef, KeyboardEvent } from 'react'
import Icon from '@/components/common/Icon'
import { useAIChat } from '@/hooks/useAIChat'
import { useAIStore } from '@/stores/aiStore'

interface ChatInputProps {
  disabled?: boolean
}

export default function ChatInput({ disabled }: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const { sendMessage, cancelStream } = useAIChat()
  const isLoading = useAIStore((s) => s.isLoading)
  const isStreaming = useAIStore((s) => s.isStreaming)

  // AI-11: Auto-expand textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    }
  }, [])

  // AI-11: Enter to send, Shift+Enter for newline
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [input])

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading || disabled) return
    
    sendMessage(input.trim())
    setInput('')
    
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [input, isLoading, disabled, sendMessage])

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
          placeholder={disabled ? 'Verify API key in Settings' : 'Ask about your document...'}
          disabled={disabled || isLoading}
          rows={1}
          className="
            w-full px-4 py-3 pr-12
            rounded-xl border border-gray-200 dark:border-gray-600
            bg-gray-50 dark:bg-gray-800
            text-sm text-text-primary-light dark:text-text-primary-dark
            placeholder-gray-400
            resize-none
            focus:outline-none focus:ring-2 focus:ring-accent/20 dark:focus:ring-accent-dark/20
            focus:border-accent dark:focus:border-accent-dark
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        />
        
        {/* Send / Cancel button */}
        <button
          onClick={isStreaming ? handleCancel : handleSend}
          disabled={disabled || (!input.trim() && !isStreaming)}
          className={`
            absolute right-3 bottom-3
            p-1.5 rounded-lg
            transition-colors
            ${isStreaming
              ? 'text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30'
              : input.trim() && !disabled
              ? 'text-accent dark:text-accent-dark hover:bg-accent/10 dark:hover:bg-accent-dark/10'
              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
            }
          `}
          aria-label={isStreaming ? 'Cancel' : 'Send message'}
        >
          <Icon name={isStreaming ? 'stop_circle' : 'send'} size={20} />
        </button>
      </div>
      
      <p className="mt-2 text-xs text-text-secondary-light dark:text-text-secondary-dark">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  )
}
```

### 4.6 src/components/AI/TypingIndicator.tsx

```typescript
export default function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
```

### 4.7 src/components/AI/NoAPIKeyMessage.tsx

```typescript
import Icon from '@/components/common/Icon'
import { useSettingsStore } from '@/stores/settingsStore'

export default function NoAPIKeyMessage() {
  const openModal = useSettingsStore((s) => s.openModal)
  const setActiveTab = useSettingsStore((s) => s.setActiveTab)

  const handleOpenSettings = () => {
    setActiveTab('ai')
    openModal()
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon name="key" size={32} className="text-text-secondary-light dark:text-text-secondary-dark" />
      </div>
      
      <h3 className="text-lg font-medium text-text-primary-light dark:text-text-primary-dark mb-2">
        API Key Required
      </h3>
      
      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4 max-w-xs">
        To use the AI assistant, you need to configure your OpenRouter API key in Settings.
      </p>

      <button
        onClick={handleOpenSettings}
        className="
          px-4 py-2 rounded-lg
          bg-accent dark:bg-accent-dark text-white
          font-medium text-sm
          hover:opacity-90 transition-opacity
        "
      >
        Open Settings
      </button>
    </div>
  )
}
```

---

## 5. Update AI Handlers (Streaming)

### 5.1 electron/main/ipc/ai-handlers.ts (full implementation)

```typescript
import { ipcMain, BrowserWindow } from 'electron'
import { getSettings } from './settings-handlers'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1'

// Store active streams for cancellation
const activeStreams = new Map<string, AbortController>()

export function registerAiHandlers(): void {
  // Verify API key (from Stage 8)
  ipcMain.handle('ai:verify-key', async (_, apiKey: string) => {
    try {
      const response = await fetch(`${OPENROUTER_API_URL}/key`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://marxist.app',
          'X-Title': 'Marxist',
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          return { valid: false, error: 'Invalid API key' }
        }
        return { valid: false, error: `HTTP ${response.status}` }
      }

      return { valid: true }
    } catch (error) {
      return { valid: false, error: (error as Error).message }
    }
  })

  // List models (from Stage 8)
  ipcMain.handle('ai:list-models', async () => {
    const settings = getSettings()
    const apiKey = settings.openRouterApiKey

    if (!apiKey) {
      return { error: 'No API key configured' }
    }

    try {
      const response = await fetch(`${OPENROUTER_API_URL}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://marxist.app',
          'X-Title': 'Marxist',
        },
      })

      if (!response.ok) {
        return { error: `HTTP ${response.status}` }
      }

      const data = await response.json()
      const models = (data.data || []).map((m: any) => ({
        id: m.id,
        name: m.name || m.id,
        contextLength: m.context_length || 4096,
      }))

      models.sort((a: any, b: any) => a.name.localeCompare(b.name))
      return { models }
    } catch (error) {
      return { error: (error as Error).message }
    }
  })

  // AI-10: Chat with streaming
  ipcMain.handle('ai:chat', async (event, params: {
    message: string
    documentContent: string
    history: Array<{ role: string; content: string }>
    systemPrompt: string
    model: string
    streamId?: string
  }) => {
    const settings = getSettings()
    const apiKey = settings.openRouterApiKey

    if (!apiKey) {
      return { error: 'No API key configured' }
    }

    const streamId = params.streamId || `stream-${Date.now()}`
    const controller = new AbortController()
    activeStreams.set(streamId, controller)

    try {
      const messages = [
        { role: 'system', content: params.systemPrompt },
        { role: 'system', content: `Current document:\n\n${params.documentContent}` },
        ...params.history,
        { role: 'user', content: params.message },
      ]

      const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://marxist.app',
          'X-Title': 'Marxist',
        },
        body: JSON.stringify({
          model: params.model,
          messages,
          stream: true,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        return { error: error.message || `HTTP ${response.status}` }
      }

      // Get the window to send streaming events
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window) {
        return { error: 'Window not found' }
      }

      // Process SSE stream
      const reader = response.body?.getReader()
      if (!reader) {
        return { error: 'No response body' }
      }

      const decoder = new TextDecoder()
      let fullContent = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content || ''
                
                if (content) {
                  fullContent += content
                  // Send chunk to renderer
                  window.webContents.send('ai:stream-chunk', {
                    streamId,
                    content,
                    fullContent,
                  })
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      activeStreams.delete(streamId)

      // Send completion event
      window.webContents.send('ai:stream-complete', { streamId, content: fullContent })

      return { success: true, content: fullContent }
    } catch (error) {
      activeStreams.delete(streamId)
      
      if ((error as Error).name === 'AbortError') {
        return { error: 'aborted' }
      }
      
      return { error: (error as Error).message }
    }
  })

  // Cancel stream
  ipcMain.handle('ai:cancel', async (_, streamId?: string) => {
    if (streamId && activeStreams.has(streamId)) {
      activeStreams.get(streamId)?.abort()
      activeStreams.delete(streamId)
    } else {
      // Cancel all active streams
      for (const [id, controller] of activeStreams) {
        controller.abort()
        activeStreams.delete(id)
      }
    }
    return { success: true }
  })

  // Edit handler - implemented in Stage 10
  ipcMain.handle('ai:edit', async () => {
    return { error: 'AI edit not yet implemented' }
  })
}
```

---

## 6. Update Preload for Streaming

### 6.1 electron/preload/index.ts (additions)

```typescript
const electronAPI: ElectronAPI = {
  // ... existing methods ...
  
  ai: {
    verifyKey: (key) => ipcRenderer.invoke('ai:verify-key', key),
    listModels: () => ipcRenderer.invoke('ai:list-models'),
    chat: (params) => ipcRenderer.invoke('ai:chat', params),
    edit: (params) => ipcRenderer.invoke('ai:edit', params),
    cancel: (streamId) => ipcRenderer.invoke('ai:cancel', streamId),
  },
  
  onAIEvent: (channel: string, callback: (data: unknown) => void) => {
    const validChannels = ['ai:stream-chunk', 'ai:stream-complete', 'ai:stream-error']
    if (validChannels.includes(channel)) {
      const handler = (_: unknown, data: unknown) => callback(data)
      ipcRenderer.on(channel, handler)
      return () => ipcRenderer.removeListener(channel, handler)
    }
    return () => {}
  },
}
```

### 6.2 electron/preload/types.ts (additions)

```typescript
export interface StreamChunkData {
  streamId: string
  content: string
  fullContent: string
}

export interface StreamCompleteData {
  streamId: string
  content: string
}

export interface ElectronAPI {
  // ... existing methods ...
  
  ai: {
    verifyKey: (key: string) => Promise<{ valid: boolean; error?: string }>
    listModels: () => Promise<{ models?: Array<{ id: string; name: string; contextLength: number }>; error?: string }>
    chat: (params: {
      message: string
      documentContent: string
      history: Array<{ role: string; content: string }>
      systemPrompt: string
      model: string
      streamId?: string
    }) => Promise<{ success?: boolean; content?: string; error?: string }>
    edit: (params: unknown) => Promise<unknown>
    cancel: (streamId?: string) => Promise<{ success: boolean }>
  }
  
  onAIEvent: (channel: string, callback: (data: unknown) => void) => () => void
}
```

---

## 7. Update useAIChat for Streaming Events

### 7.1 src/hooks/useAIChat.ts (updated)

```typescript
import { useCallback, useEffect } from 'react'
import { useAIStore } from '@/stores/aiStore'
import { useEditorStore } from '@/stores/editorStore'
import { useSettingsStore } from '@/stores/settingsStore'

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

  // Listen for streaming events
  useEffect(() => {
    const unsubChunk = window.electron.onAIEvent('ai:stream-chunk', (data: any) => {
      if (activeTabId) {
        updateLastMessage(activeTabId, data.fullContent)
      }
    })

    const unsubComplete = window.electron.onAIEvent('ai:stream-complete', () => {
      setLoading(false)
      setStreaming(false)
    })

    return () => {
      unsubChunk()
      unsubComplete()
    }
  }, [activeTabId, updateLastMessage, setLoading, setStreaming])

  // Send chat message
  const sendMessage = useCallback(async (message: string) => {
    if (!activeTabId || !apiKey || !message.trim()) return

    const activeTab = getActiveTab()
    const documentContent = activeTab?.content || ''
    const history = getHistory(activeTabId)

    // Add user message
    addMessage(activeTabId, { role: 'user', content: message })

    // Create placeholder for assistant response
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
  }, [activeTabId, apiKey, selectedModel, systemPrompt, getActiveTab, getHistory, addMessage, updateLastMessage, setLoading, setStreaming, setError])

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

  // AI-13: Retry last message on error
  const retryLastMessage = useCallback(async () => {
    if (!activeTabId) return
    
    const history = getHistory(activeTabId)
    if (history.length < 2) return
    
    // Find the last user message (should be second to last)
    const lastUserMessageIndex = history.length - 2
    const lastUserMessage = history[lastUserMessageIndex]
    
    if (lastUserMessage?.role !== 'user') return
    
    // Remove both the failed assistant message and the user message
    const { chatHistories } = useAIStore.getState()
    const newHistory = history.slice(0, -2)
    const newHistories = new Map(chatHistories)
    newHistories.set(activeTabId, newHistory)
    useAIStore.setState({ chatHistories: newHistories, error: null })
    
    // Resend the message
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
```

---

## 8. Update Layout for AI Panel

### 8.1 src/components/Layout/MainContent.tsx (update)

Add AI panel integration with equal shrinking in split view:

```typescript
// In MainContent.tsx, update the container style calculation:
const aiPanelOpen = useViewStore(selectAiPanelOpen)
const sidebarOpen = useViewStore(selectSidebarOpen)
const activeView = useViewStore(selectActiveView)

// Calculate margins
const sidebarOffset = sidebarOpen && activeView !== 'render' ? 240 : 0
const aiPanelOffset = aiPanelOpen ? 360 : 0

// AI-04: In split view, both panels shrink equally
// The paddingRight handles this by reducing available width
<div
  className="h-full transition-all duration-200 ease-out"
  style={{
    marginLeft: `${sidebarOffset}px`,
    marginRight: `${aiPanelOffset}px`,
  }}
>
  {renderContent()}
</div>
```

---

## 9. Robot Icon Toggle (AI-01)

### 9.1 Update TopBar Icons

The robot icon in the top-right corner of the TopBar toggles the AI panel. Update the `EditorCornerIcons.tsx` (or equivalent component from Stage 4):

```typescript
// In EditorCornerIcons.tsx or TopBar's right section
import { useViewStore } from '@/stores/viewStore'

const aiPanelOpen = useViewStore((s) => s.aiPanelOpen)
const toggleAiPanel = useViewStore((s) => s.toggleAiPanel)

<Tooltip content={aiPanelOpen ? 'Close AI' : 'Open AI (⌘⇧A)'}>
  <button
    onClick={toggleAiPanel}
    className={`
      p-1.5 rounded-lg transition-colors
      ${aiPanelOpen
        ? 'text-accent dark:text-accent-dark bg-accent/10 dark:bg-accent-dark/10'
        : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark'
      }
      hover:bg-gray-100 dark:hover:bg-gray-700
    `}
    aria-label="Toggle AI panel"
    aria-pressed={aiPanelOpen}
  >
    <Icon name="robot" size={20} />
  </button>
</Tooltip>
```

### 9.2 Menu Shortcut Handler (⌘⇧A)

In `App.tsx`, add the menu event listener (the menu item was defined in Stage 1):

```typescript
// In useEffect for menu events
window.electron.onMenuEvent('menu:toggle-ai', () => {
  toggleAiPanel()
})
```

---

## 10. Update App.tsx

### 10.1 src/App.tsx (additions)

```typescript
import AIPanel from './components/AI/AIPanel'

// In return, add AIPanel:
return (
  <div className={`h-screen flex flex-col ${isDark ? 'dark' : ''}`}>
    <TopBar ... />
    <main className="flex-1 overflow-hidden">
      <MainContent ... />
    </main>
    <AIPanel />
    <SettingsModal />
  </div>
)
```

---

## 10. Visual Verification Table

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Panel background | `#FFFFFF` | `#1E1E1E` |
| Panel border | `#E5E5E5` (gray-200) | `#333333` (gray-700) |
| Header text | `#1A1A1A` | `#E0E0E0` |
| Model name | `#6B6B6B` (muted) | `#888888` (muted) |
| User bubble | `#2962FF` (accent) | `#448AFF` (accent-dark) |
| AI bubble | `#F3F4F6` (gray-100) | `#1F2937` (gray-800) |
| Input background | `#F9FAFB` (gray-50) | `#1F2937` (gray-800) |
| Error state | `#FEF2F2` bg / `#DC2626` text | `#7F1D1D/20` bg / `#F87171` text |
| Typing indicator dots | `#9CA3AF` (gray-400) | `#6B7280` (gray-500) |

---

## 11. Testing

### 11.1 tests/stores/aiStore.test.ts

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
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
  })
})
```

### 11.2 tests/components/AIPanel.test.tsx

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AIPanel from '@/components/AI/AIPanel'
import { useViewStore } from '@/stores/viewStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useEditorStore } from '@/stores/editorStore'

describe('AIPanel', () => {
  beforeEach(() => {
    useViewStore.setState({ aiPanelOpen: true })
    useEditorStore.setState({ activeTabId: 'tab-1' })
  })

  it('shows NoAPIKeyMessage when no API key (AI-14)', () => {
    useSettingsStore.setState({ openRouterApiKey: '' })
    
    render(<AIPanel />)
    
    expect(screen.getByText('API Key Required')).toBeInTheDocument()
    expect(screen.getByText('Open Settings')).toBeInTheDocument()
  })

  it('shows chat interface when API key is set', () => {
    useSettingsStore.setState({ 
      openRouterApiKey: 'sk-test', 
      isApiKeyVerified: true 
    })
    
    render(<AIPanel />)
    
    expect(screen.queryByText('API Key Required')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Ask about your document/)).toBeInTheDocument()
  })

  it('has 360px width (AI-02)', () => {
    useSettingsStore.setState({ openRouterApiKey: 'sk-test' })
    
    render(<AIPanel />)
    
    const panel = document.querySelector('[style*="width: 360px"]')
    expect(panel).toBeInTheDocument()
  })

  it('shows header with model name (AI-05)', () => {
    useSettingsStore.setState({ 
      openRouterApiKey: 'sk-test',
      selectedModel: 'anthropic/claude-sonnet-4',
    })
    
    render(<AIPanel />)
    
    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
    expect(screen.getByText(/claude-sonnet-4/)).toBeInTheDocument()
  })
})
```

### 11.3 tests/components/ChatInput.test.tsx

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChatInput from '@/components/AI/ChatInput'

// Mock useAIChat
vi.mock('@/hooks/useAIChat', () => ({
  useAIChat: () => ({
    sendMessage: vi.fn(),
    cancelStream: vi.fn(),
  }),
}))

describe('ChatInput', () => {
  it('renders textarea (AI-11)', () => {
    render(<ChatInput />)
    expect(screen.getByPlaceholderText(/Ask about your document/)).toBeInTheDocument()
  })

  it('disables input when disabled prop is true', () => {
    render(<ChatInput disabled />)
    
    const textarea = screen.getByPlaceholderText(/Verify API key/)
    expect(textarea).toBeDisabled()
  })

  it('sends on Enter (AI-11)', () => {
    const { useAIChat } = require('@/hooks/useAIChat')
    const sendMessage = vi.fn()
    vi.mocked(useAIChat).mockReturnValue({ sendMessage, cancelStream: vi.fn() })

    render(<ChatInput />)
    
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
    
    expect(sendMessage).toHaveBeenCalledWith('Hello')
  })

  it('does not send on Shift+Enter (AI-11)', () => {
    const { useAIChat } = require('@/hooks/useAIChat')
    const sendMessage = vi.fn()
    vi.mocked(useAIChat).mockReturnValue({ sendMessage, cancelStream: vi.fn() })

    render(<ChatInput />)
    
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
    
    expect(sendMessage).not.toHaveBeenCalled()
  })
})
```

### 11.4 tests/e2e/ai-panel.spec.ts

```typescript
import { test, expect, _electron as electron } from '@playwright/test'
import { resolve } from 'path'

test.describe('AI Chat Panel', () => {
  test('toggles with ⌘⇧A (AI-01)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('.cm-editor')

    // Open AI panel
    await window.keyboard.press('Meta+Shift+a')
    await expect(window.locator('text=AI Assistant')).toBeVisible()

    // Close AI panel
    await window.keyboard.press('Meta+Shift+a')
    await expect(window.locator('text=AI Assistant')).not.toBeVisible()

    await electronApp.close()
  })

  test('shows API key prompt when not configured (AI-14)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.keyboard.press('Meta+Shift+a')

    await expect(window.locator('text=API Key Required')).toBeVisible()
    await expect(window.locator('text=Open Settings')).toBeVisible()

    await electronApp.close()
  })

  test('available in all three views (AI-03)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()

    // Markdown view
    await window.keyboard.press('Meta+1')
    await window.keyboard.press('Meta+Shift+a')
    await expect(window.locator('text=AI Assistant')).toBeVisible()
    await window.keyboard.press('Meta+Shift+a')

    // Split view
    await window.keyboard.press('Meta+2')
    await window.keyboard.press('Meta+Shift+a')
    await expect(window.locator('text=AI Assistant')).toBeVisible()
    await window.keyboard.press('Meta+Shift+a')

    // Render view
    await window.keyboard.press('Meta+3')
    await window.keyboard.press('Meta+Shift+a')
    await expect(window.locator('text=AI Assistant')).toBeVisible()

    await electronApp.close()
  })
})
```

---

## 12. Acceptance Criteria

### 12.1 P0 Requirements Checklist

- [ ] Toggled by robot icon or ⌘⇧A (AI-01)
- [ ] Width is 360px, slides from right (AI-02)
- [ ] Available in all three views (AI-03)
- [ ] In split view: pushes both panels equally (AI-04)
- [ ] Header: robot + "AI Assistant" + model + reset + close (AI-05)
- [ ] Chat is per-file — switching tabs switches conversation (AI-06)
- [ ] Reset icon clears conversation for current file (AI-07)
- [ ] User messages right-aligned, AI left-aligned (AI-08)
- [ ] Streaming: tokens display progressively (AI-10)
- [ ] Input: Enter to send, Shift+Enter for newline (AI-11)
- [ ] Error state: inline error message with retry (AI-13)
- [ ] No API key: message directing to Settings (AI-14)

### 12.2 P1 Requirements Checklist

- [ ] AI responses render Markdown inline (AI-09)
- [ ] Loading state: typing indicator animation (AI-12)

---

## 13. Output for Next Stage

This stage produces:

1. **AIPanel** - Complete chat UI
2. **aiStore** - Per-file chat history management
3. **useAIChat** - Chat operations hook
4. **Streaming handlers** - Full OpenRouter SSE streaming

Stage 10 will consume:
- aiStore for edit history
- Streaming infrastructure for document editing
- AI panel for edit mode UI
