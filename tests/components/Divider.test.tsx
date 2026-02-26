import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Divider from '@/components/SplitView/Divider'
import { useViewStore } from '@/stores/viewStore'
import { useRef } from 'react'

function DividerWrapper() {
  const containerRef = useRef<HTMLDivElement>(null)
  return (
    <div ref={containerRef} style={{ width: '1000px', height: '500px' }}>
      <Divider containerRef={containerRef} />
    </div>
  )
}

describe('Divider', () => {
  beforeEach(() => {
    useViewStore.setState({ splitRatio: 0.5 })
  })

  it('renders divider with correct accessibility attributes', () => {
    render(<DividerWrapper />)

    const divider = screen.getByRole('separator')
    expect(divider).toHaveAttribute('aria-orientation', 'vertical')
    expect(divider).toHaveAttribute('aria-valuenow', '50')
  })

  it('has col-resize cursor', () => {
    render(<DividerWrapper />)

    const divider = screen.getByRole('separator')
    expect(divider).toHaveClass('cursor-col-resize')
  })

  it('has correct aria-valuemin and aria-valuemax', () => {
    render(<DividerWrapper />)

    const divider = screen.getByRole('separator')
    expect(divider).toHaveAttribute('aria-valuemin', '20')
    expect(divider).toHaveAttribute('aria-valuemax', '80')
  })

  it('resets to 50/50 on double-click (SV-07)', () => {
    useViewStore.setState({ splitRatio: 0.7 })
    render(<DividerWrapper />)

    const divider = screen.getByRole('separator')

    fireEvent.mouseDown(divider)
    fireEvent.mouseDown(divider)

    expect(useViewStore.getState().splitRatio).toBe(0.5)
  })

  it('has aria-label for accessibility', () => {
    render(<DividerWrapper />)

    const divider = screen.getByRole('separator')
    expect(divider).toHaveAttribute('aria-label', 'Resize panels')
  })
})
