import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import EditorCornerIcons from '@/components/Editor/EditorCornerIcons'
import { useViewStore } from '@/stores/viewStore'

Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
})

describe('EditorCornerIcons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useViewStore.setState({ sidebarOpen: false, aiPanelOpen: false })
  })

  it('renders burger icon (VM-04)', () => {
    render(<EditorCornerIcons content="test" />)
    expect(screen.getByLabelText('Toggle file sidebar')).toBeInTheDocument()
  })

  it('renders copy icon (VM-05)', () => {
    render(<EditorCornerIcons content="test" />)
    expect(screen.getByLabelText('Copy raw Markdown')).toBeInTheDocument()
  })

  it('renders AI icon', () => {
    render(<EditorCornerIcons content="test" />)
    expect(screen.getByLabelText('Toggle AI assistant')).toBeInTheDocument()
  })

  it('toggles sidebar on burger click', () => {
    render(<EditorCornerIcons content="test" />)

    fireEvent.click(screen.getByLabelText('Toggle file sidebar'))
    expect(useViewStore.getState().sidebarOpen).toBe(true)
  })

  it('copies content to clipboard on copy click', async () => {
    const testContent = '# Test Markdown'
    render(<EditorCornerIcons content={testContent} />)

    fireEvent.click(screen.getByLabelText('Copy raw Markdown'))

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testContent)
    })
  })

  it('shows copied feedback after copying (VM-07)', async () => {
    render(<EditorCornerIcons content="test" />)

    fireEvent.click(screen.getByLabelText('Copy raw Markdown'))

    await waitFor(() => {
      const button = screen.getByLabelText('Copy raw Markdown')
      expect(button).toHaveClass('text-green-600')
    })
  })

  it('toggles AI panel on AI icon click', () => {
    render(<EditorCornerIcons content="test" />)

    fireEvent.click(screen.getByLabelText('Toggle AI assistant'))
    expect(useViewStore.getState().aiPanelOpen).toBe(true)
  })

  it('hides burger icon when showBurger is false', () => {
    render(<EditorCornerIcons content="test" showBurger={false} />)
    expect(screen.queryByLabelText('Toggle file sidebar')).not.toBeInTheDocument()
  })

  it('hides copy icon when showCopy is false', () => {
    render(<EditorCornerIcons content="test" showCopy={false} />)
    expect(screen.queryByLabelText('Copy raw Markdown')).not.toBeInTheDocument()
  })

  it('hides AI icon when showAI is false', () => {
    render(<EditorCornerIcons content="test" showAI={false} />)
    expect(screen.queryByLabelText('Toggle AI assistant')).not.toBeInTheDocument()
  })
})
