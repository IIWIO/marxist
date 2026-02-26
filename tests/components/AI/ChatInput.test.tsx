import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChatInput from '@/components/AI/ChatInput'
import { useAIStore } from '@/stores/aiStore'

const mockSendMessage = vi.fn()
const mockCancelStream = vi.fn()

vi.mock('@/hooks/useAIChat', () => ({
  useAIChat: () => ({
    sendMessage: mockSendMessage,
    cancelStream: mockCancelStream,
  }),
}))

describe('ChatInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAIStore.setState({
      isLoading: false,
      isStreaming: false,
    })
  })

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
    render(<ChatInput />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

    expect(mockSendMessage).toHaveBeenCalledWith('Hello')
  })

  it('does not send on Shift+Enter (AI-11)', () => {
    render(<ChatInput />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  it('does not send empty message', () => {
    render(<ChatInput />)

    const textarea = screen.getByRole('textbox')
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  it('clears input after sending', () => {
    render(<ChatInput />)

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

    expect(textarea.value).toBe('')
  })

  it('shows send button', () => {
    render(<ChatInput />)
    expect(screen.getByLabelText('Send message')).toBeInTheDocument()
  })

  it('shows cancel button when streaming', () => {
    useAIStore.setState({ isStreaming: true })

    render(<ChatInput />)

    expect(screen.getByLabelText('Cancel')).toBeInTheDocument()
  })

  it('calls cancel when streaming and cancel clicked', () => {
    useAIStore.setState({ isStreaming: true })

    render(<ChatInput />)
    fireEvent.click(screen.getByLabelText('Cancel'))

    expect(mockCancelStream).toHaveBeenCalled()
  })

  it('shows hint text about Enter/Shift+Enter', () => {
    render(<ChatInput />)
    expect(screen.getByText(/Press Enter to send/)).toBeInTheDocument()
  })
})
