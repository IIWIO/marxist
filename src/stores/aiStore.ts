import { create } from 'zustand'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isEdit?: boolean
  isError?: boolean
}

interface AIStoreState {
  chatHistories: Map<string, ChatMessage[]>
  isLoading: boolean
  isStreaming: boolean
  error: string | null

  getHistory: (tabId: string) => ChatMessage[]
  addMessage: (tabId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  updateLastMessage: (tabId: string, content: string) => void
  clearHistory: (tabId: string) => void
  setLoading: (loading: boolean) => void
  setStreaming: (streaming: boolean) => void
  setError: (error: string | null) => void
}

function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export const useAIStore = create<AIStoreState>()((set, get) => ({
  chatHistories: new Map(),
  isLoading: false,
  isStreaming: false,
  error: null,

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

  clearHistory: (tabId) => {
    const { chatHistories } = get()
    const newHistories = new Map(chatHistories)
    newHistories.delete(tabId)
    set({ chatHistories: newHistories })
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setError: (error) => set({ error }),
}))

export const selectIsLoading = (state: AIStoreState) => state.isLoading
export const selectIsStreaming = (state: AIStoreState) => state.isStreaming
export const selectError = (state: AIStoreState) => state.error
