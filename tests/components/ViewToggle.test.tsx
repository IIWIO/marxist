import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ViewToggle from '@/components/TopBar/ViewToggle'
import { useViewStore } from '@/stores/viewStore'

describe('ViewToggle', () => {
  beforeEach(() => {
    useViewStore.setState({
      activeView: 'split',
      isNarrowWindow: false,
    })
  })

  it('renders three view options', () => {
    render(<ViewToggle />)

    expect(screen.getByText('Markdown')).toBeInTheDocument()
    expect(screen.getByText('Split')).toBeInTheDocument()
    expect(screen.getByText('Render')).toBeInTheDocument()
  })

  it('highlights active view', () => {
    render(<ViewToggle />)

    const splitButton = screen.getByRole('tab', { name: 'Split' })
    expect(splitButton).toHaveAttribute('aria-selected', 'true')
  })

  it('changes view on click', () => {
    render(<ViewToggle />)

    fireEvent.click(screen.getByText('Markdown'))
    expect(useViewStore.getState().activeView).toBe('markdown')
  })

  it('disables split option in narrow window', () => {
    useViewStore.setState({ isNarrowWindow: true })
    render(<ViewToggle />)

    const splitButton = screen.getByRole('tab', { name: 'Split' })
    expect(splitButton).toHaveAttribute('aria-disabled', 'true')
    expect(splitButton).toBeDisabled()
  })

  it('has proper tablist role', () => {
    render(<ViewToggle />)

    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })

  it('switches from split to render on click', () => {
    render(<ViewToggle />)

    fireEvent.click(screen.getByText('Render'))
    expect(useViewStore.getState().activeView).toBe('render')
  })
})
