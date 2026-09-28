import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import DiffBanner from '@/components/Editor/DiffBanner'
import { useEditorStore } from '@/stores/editorStore'

const actions = {
  acceptEdit: vi.fn(),
  revertEdit: vi.fn(),
  cancelRequest: vi.fn(),
}

vi.mock('@/hooks/useAIAgent', () => ({ useAIAgent: () => actions }))

describe('DiffBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useEditorStore.setState({ tabs: new Map(), activeTabId: null })
  })

  function createTab(): string {
    return useEditorStore.getState().createTab(null, 'Original')
  }

  it('renders nothing when no edit is active', () => {
    createTab()
    const { container } = render(<DiffBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('shows editing state and cancels the owned request', () => {
    const tabId = createTab()
    useEditorStore.getState().setTabAIEditing(tabId, true, 'Original')
    render(<DiffBanner />)
    expect(screen.getByText(/Karl is editing/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cancel'))
    expect(actions.cancelRequest).toHaveBeenCalledOnce()
  })

  it('shows diff counts and dispatches Accept and Revert', () => {
    const tabId = createTab()
    useEditorStore.getState().setTabShowDiff(tabId, true)
    useEditorStore.getState().setTabDiff(tabId, {
      lines: [], addedCount: 5, removedCount: 2, unchangedCount: 10,
    })
    render(<DiffBanner />)
    expect(screen.getByLabelText('5 lines added, 2 lines removed')).toHaveTextContent('+5 / -2 lines')
    fireEvent.click(screen.getByText('Accept'))
    fireEvent.click(screen.getByText('Revert'))
    expect(actions.acceptEdit).toHaveBeenCalledOnce()
    expect(actions.revertEdit).toHaveBeenCalledOnce()
  })
})
