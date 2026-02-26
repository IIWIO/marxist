import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FormattingToolbar from '@/components/TopBar/FormattingToolbar'

describe('FormattingToolbar', () => {
  const mockOnAction = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all 8 priority icons at wide width', () => {
    render(<FormattingToolbar onAction={mockOnAction} windowWidth={1200} />)

    expect(screen.getByLabelText('Bold')).toBeInTheDocument()
    expect(screen.getByLabelText('Italic')).toBeInTheDocument()
    expect(screen.getByLabelText('Heading 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Heading 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Bullet list')).toBeInTheDocument()
    expect(screen.getByLabelText('Number list')).toBeInTheDocument()
    expect(screen.getByLabelText('Code block')).toBeInTheDocument()
    expect(screen.getByLabelText('Link')).toBeInTheDocument()
  })

  it('shows all icons including non-priority at wide width', () => {
    render(<FormattingToolbar onAction={mockOnAction} windowWidth={1200} />)

    expect(screen.getByLabelText('Underline')).toBeInTheDocument()
    expect(screen.getByLabelText('Strikethrough')).toBeInTheDocument()
    expect(screen.getByLabelText('Indent')).toBeInTheDocument()
    expect(screen.getByLabelText('Outdent')).toBeInTheDocument()
  })

  it('shows overflow menu at narrow width (TB-07)', () => {
    render(<FormattingToolbar onAction={mockOnAction} windowWidth={800} />)

    expect(screen.getByLabelText('More formatting options')).toBeInTheDocument()
    expect(screen.queryByLabelText('Underline')).not.toBeInTheDocument()
  })

  it('calls onAction when button clicked', () => {
    render(<FormattingToolbar onAction={mockOnAction} windowWidth={1200} />)

    fireEvent.click(screen.getByLabelText('Bold'))
    expect(mockOnAction).toHaveBeenCalledWith('bold')
  })

  it('opens overflow menu on click', () => {
    render(<FormattingToolbar onAction={mockOnAction} windowWidth={800} />)

    const overflowButton = screen.getByLabelText('More formatting options')
    fireEvent.click(overflowButton)

    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Underline/i })).toBeInTheDocument()
  })

  it('closes overflow menu after selecting item', () => {
    render(<FormattingToolbar onAction={mockOnAction} windowWidth={800} />)

    fireEvent.click(screen.getByLabelText('More formatting options'))
    fireEvent.click(screen.getByRole('menuitem', { name: /Underline/i }))

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(mockOnAction).toHaveBeenCalledWith('underline')
  })

  it('disables buttons when disabled prop is true', () => {
    render(<FormattingToolbar onAction={mockOnAction} windowWidth={1200} disabled={true} />)

    expect(screen.getByLabelText('Bold')).toBeDisabled()
    expect(screen.getByLabelText('Italic')).toBeDisabled()
  })

  it('heading buttons display correct labels', () => {
    render(<FormattingToolbar onAction={mockOnAction} windowWidth={1200} />)

    const h1Button = screen.getByLabelText('Heading 1')
    const h2Button = screen.getByLabelText('Heading 2')

    expect(h1Button).toHaveTextContent('H1')
    expect(h2Button).toHaveTextContent('H2')
  })

  it('calls onAction with correct heading command', () => {
    render(<FormattingToolbar onAction={mockOnAction} windowWidth={1200} />)

    fireEvent.click(screen.getByLabelText('Heading 1'))
    expect(mockOnAction).toHaveBeenCalledWith('heading1')

    fireEvent.click(screen.getByLabelText('Heading 2'))
    expect(mockOnAction).toHaveBeenCalledWith('heading2')
  })
})
