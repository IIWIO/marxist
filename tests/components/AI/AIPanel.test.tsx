import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import AIPanel from '@/components/AI/AIPanel'
import { useViewStore } from '@/stores/viewStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useEditorStore } from '@/stores/editorStore'
import { useAIStore } from '@/stores/aiStore'

vi.mock('@/hooks/useAIChat', () => ({
  useAIChat: () => ({
    sendMessage: vi.fn(),
    resetConversation: vi.fn(),
    cancelStream: vi.fn(),
    retryLastMessage: vi.fn(),
    hasApiKey: true,
    isApiKeyVerified: true,
  }),
}))

vi.mock('@/hooks/useAIEdit', () => ({
  useAIEdit: () => ({
    startEdit: vi.fn(),
    acceptEdit: vi.fn(),
    revertEdit: vi.fn(),
    cancelEdit: vi.fn(),
    isEditing: false,
    showDiff: false,
    diffResult: null,
  }),
}))

vi.mock('@/hooks/useMarkdownParser', () => ({
  useMarkdownParser: () => ({ html: '', isProcessing: false, error: null }),
}))

describe('AIPanel', () => {
  beforeEach(() => {
    useViewStore.setState({ aiPanelOpen: true })
    useEditorStore.setState({
      activeTabId: 'tab-1',
      tabs: new Map([
        ['tab-1', { tabId: 'tab-1', content: '', fileName: 'test.md', filePath: null, isDirty: false, savedContent: '', cursorPosition: 0, scrollPosition: 0, editorState: null, isAIEditing: false, preEditSnapshot: null, showDiff: false }],
      ]),
    })
    useAIStore.setState({
      chatHistories: new Map(),
      isLoading: false,
      isStreaming: false,
      error: null,
    })
    useSettingsStore.setState({
      openRouterApiKey: '',
      isApiKeyVerified: false,
      selectedModel: 'test-model',
    })
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
      isApiKeyVerified: true,
    })

    render(<AIPanel />)

    expect(screen.queryByText('API Key Required')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Ask about your document/)).toBeInTheDocument()
  })

  it('has 360px width style (AI-02)', () => {
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

  it('shows empty state message when no messages', () => {
    useSettingsStore.setState({
      openRouterApiKey: 'sk-test',
      isApiKeyVerified: true,
    })

    render(<AIPanel />)

    expect(screen.getByText(/Ask me anything about your document/)).toBeInTheDocument()
  })

  it('is hidden when not open', () => {
    useViewStore.setState({ aiPanelOpen: false })

    render(<AIPanel />)

    const panel = document.querySelector('[aria-hidden="true"]')
    expect(panel).toBeInTheDocument()
  })
})
