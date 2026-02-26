import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DiffBanner from '@/components/Editor/DiffBanner'
import { useEditorStore } from '@/stores/editorStore'
import { useAIEdit } from '@/hooks/useAIEdit'

vi.mock('@/stores/editorStore', () => ({
  useEditorStore: vi.fn(),
}))

vi.mock('@/hooks/useAIEdit', () => ({
  useAIEdit: vi.fn(),
}))

describe('DiffBanner', () => {
  const mockAcceptEdit = vi.fn()
  const mockRevertEdit = vi.fn()
  const mockCancelEdit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useAIEdit).mockReturnValue({
      startEdit: vi.fn(),
      acceptEdit: mockAcceptEdit,
      revertEdit: mockRevertEdit,
      cancelEdit: mockCancelEdit,
      isEditing: false,
      showDiff: false,
      diffResult: null,
    })

    vi.mocked(useEditorStore).mockReturnValue({
      isAIEditing: false,
      showDiff: false,
    })
  })

  it('renders nothing when not editing and no diff', () => {
    const { container } = render(<DiffBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('renders editing state with spinner and cancel button', () => {
    vi.mocked(useEditorStore).mockReturnValue({
      isAIEditing: true,
      showDiff: false,
    })
    vi.mocked(useAIEdit).mockReturnValue({
      startEdit: vi.fn(),
      acceptEdit: mockAcceptEdit,
      revertEdit: mockRevertEdit,
      cancelEdit: mockCancelEdit,
      isEditing: true,
      showDiff: false,
      diffResult: null,
    })

    render(<DiffBanner />)

    expect(screen.getByText(/AI is editing/i)).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('calls cancelEdit when cancel button is clicked', () => {
    vi.mocked(useEditorStore).mockReturnValue({
      isAIEditing: true,
      showDiff: false,
    })
    vi.mocked(useAIEdit).mockReturnValue({
      startEdit: vi.fn(),
      acceptEdit: mockAcceptEdit,
      revertEdit: mockRevertEdit,
      cancelEdit: mockCancelEdit,
      isEditing: true,
      showDiff: false,
      diffResult: null,
    })

    render(<DiffBanner />)

    fireEvent.click(screen.getByText('Cancel'))
    expect(mockCancelEdit).toHaveBeenCalled()
  })

  it('renders diff state with accept/revert buttons', () => {
    vi.mocked(useEditorStore).mockReturnValue({
      isAIEditing: false,
      showDiff: true,
    })
    vi.mocked(useAIEdit).mockReturnValue({
      startEdit: vi.fn(),
      acceptEdit: mockAcceptEdit,
      revertEdit: mockRevertEdit,
      cancelEdit: mockCancelEdit,
      isEditing: false,
      showDiff: true,
      diffResult: {
        lines: [],
        addedCount: 5,
        removedCount: 2,
        unchangedCount: 10,
      },
    })

    render(<DiffBanner />)

    expect(screen.getByText(/AI made changes/i)).toBeInTheDocument()
    expect(screen.getByText('Accept')).toBeInTheDocument()
    expect(screen.getByText('Revert')).toBeInTheDocument()
  })

  it('displays diff summary with added and removed counts', () => {
    vi.mocked(useEditorStore).mockReturnValue({
      isAIEditing: false,
      showDiff: true,
    })
    vi.mocked(useAIEdit).mockReturnValue({
      startEdit: vi.fn(),
      acceptEdit: mockAcceptEdit,
      revertEdit: mockRevertEdit,
      cancelEdit: mockCancelEdit,
      isEditing: false,
      showDiff: true,
      diffResult: {
        lines: [],
        addedCount: 5,
        removedCount: 2,
        unchangedCount: 10,
      },
    })

    render(<DiffBanner />)

    expect(screen.getByText(/\+5/)).toBeInTheDocument()
    expect(screen.getByText(/-2/)).toBeInTheDocument()
  })

  it('calls acceptEdit when accept button is clicked', () => {
    vi.mocked(useEditorStore).mockReturnValue({
      isAIEditing: false,
      showDiff: true,
    })
    vi.mocked(useAIEdit).mockReturnValue({
      startEdit: vi.fn(),
      acceptEdit: mockAcceptEdit,
      revertEdit: mockRevertEdit,
      cancelEdit: mockCancelEdit,
      isEditing: false,
      showDiff: true,
      diffResult: {
        lines: [],
        addedCount: 1,
        removedCount: 0,
        unchangedCount: 5,
      },
    })

    render(<DiffBanner />)

    fireEvent.click(screen.getByText('Accept'))
    expect(mockAcceptEdit).toHaveBeenCalled()
  })

  it('calls revertEdit when revert button is clicked', () => {
    vi.mocked(useEditorStore).mockReturnValue({
      isAIEditing: false,
      showDiff: true,
    })
    vi.mocked(useAIEdit).mockReturnValue({
      startEdit: vi.fn(),
      acceptEdit: mockAcceptEdit,
      revertEdit: mockRevertEdit,
      cancelEdit: mockCancelEdit,
      isEditing: false,
      showDiff: true,
      diffResult: {
        lines: [],
        addedCount: 1,
        removedCount: 0,
        unchangedCount: 5,
      },
    })

    render(<DiffBanner />)

    fireEvent.click(screen.getByText('Revert'))
    expect(mockRevertEdit).toHaveBeenCalled()
  })
})
