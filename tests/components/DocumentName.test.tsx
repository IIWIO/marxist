import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DocumentName from '@/components/TopBar/DocumentName'

describe('DocumentName', () => {
  it('renders filename (TB-01)', () => {
    render(<DocumentName name="readme.md" isDirty={false} />)
    expect(screen.getByText('readme.md')).toBeInTheDocument()
  })

  it('shows unsaved indicator when dirty (TB-03)', () => {
    render(<DocumentName name="readme.md" isDirty={true} />)
    expect(screen.getByText('•')).toBeInTheDocument()
  })

  it('does not show indicator when saved', () => {
    render(<DocumentName name="readme.md" isDirty={false} />)
    expect(screen.queryByText('•')).not.toBeInTheDocument()
  })

  it('handles Untitled filename (TB-02)', () => {
    render(<DocumentName name="Untitled" isDirty={false} />)
    expect(screen.getByText('Untitled')).toBeInTheDocument()
  })

  it('handles numbered Untitled files (TB-02)', () => {
    render(<DocumentName name="Untitled 2" isDirty={false} />)
    expect(screen.getByText('Untitled 2')).toBeInTheDocument()
  })

  it('truncates long filenames', () => {
    const longName = 'this_is_a_very_long_filename_that_should_be_truncated.md'
    render(<DocumentName name={longName} isDirty={false} />)
    const element = screen.getByText(longName)
    expect(element).toHaveClass('truncate')
    expect(element).toHaveAttribute('title', longName)
  })
})
