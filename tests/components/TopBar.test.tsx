import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TopBar from '@/components/TopBar/TopBar'
import type { EditorRef } from '@/types/editor'

const mockEditorRef = { current: null as EditorRef | null }

const defaultProps = {
  documentName: 'Untitled',
  isDirty: false,
  wordCount: 0,
  letterCount: 0,
  windowWidth: 1200,
  editorRef: mockEditorRef,
}

describe('TopBar', () => {
  it('renders document name', () => {
    render(<TopBar {...defaultProps} />)
    expect(screen.getByText('Untitled')).toBeInTheDocument()
  })

  it('renders word and letter counts', () => {
    render(<TopBar {...defaultProps} />)
    expect(screen.getByText(/W: 0/)).toBeInTheDocument()
    expect(screen.getByText(/L: 0/)).toBeInTheDocument()
  })

  it('has correct height of 44px', () => {
    render(<TopBar {...defaultProps} />)
    const header = document.querySelector('header')
    expect(header).toHaveClass('h-topbar')
  })

  it('has correct structure for traffic light clearance', () => {
    render(<TopBar {...defaultProps} />)
    const header = document.querySelector('header')
    expect(header).toHaveStyle({ paddingLeft: '80px' })
  })

  it('clears traffic light area with 80px left padding', () => {
    render(<TopBar {...defaultProps} />)
    const header = document.querySelector('header')
    expect(header).toHaveStyle({ paddingLeft: '80px' })
  })

  it('renders view toggle with three options', () => {
    render(<TopBar {...defaultProps} />)
    expect(screen.getByRole('tablist', { name: 'View mode' })).toBeInTheDocument()
    expect(screen.getByText('Markdown')).toBeInTheDocument()
    expect(screen.getByText('Split')).toBeInTheDocument()
    expect(screen.getByText('Render')).toBeInTheDocument()
  })

  it('renders with correct background classes', () => {
    render(<TopBar {...defaultProps} />)
    const header = document.querySelector('header')
    expect(header).toHaveClass('bg-white')
    expect(header).toHaveClass('dark:bg-topbar-dark')
  })

  it('renders with border classes', () => {
    render(<TopBar {...defaultProps} />)
    const header = document.querySelector('header')
    expect(header).toHaveClass('border-b')
  })

  it('shows dirty indicator when isDirty is true', () => {
    render(<TopBar {...defaultProps} isDirty={true} />)
    const dirtyIndicator = document.querySelector('.text-text-secondary-light.mr-1')
    expect(dirtyIndicator).toBeInTheDocument()
    expect(dirtyIndicator?.textContent).toBe('•')
  })

  it('shows formatting toolbar by default', () => {
    render(<TopBar {...defaultProps} />)
    expect(screen.getByLabelText('Bold')).toBeInTheDocument()
    expect(screen.getByLabelText('Italic')).toBeInTheDocument()
  })

  it('displays correct word count', () => {
    render(<TopBar {...defaultProps} wordCount={150} letterCount={750} />)
    expect(screen.getByText('W: 150')).toBeInTheDocument()
    expect(screen.getByText('L: 750')).toBeInTheDocument()
  })
})
