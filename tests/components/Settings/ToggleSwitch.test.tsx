import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ToggleSwitch from '@/components/Settings/components/ToggleSwitch'

describe('ToggleSwitch', () => {
  it('renders label', () => {
    render(<ToggleSwitch label="Test Label" checked={false} onChange={vi.fn()} />)
    expect(screen.getByText('Test Label')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(
      <ToggleSwitch
        label="Test Label"
        description="Test description"
        checked={false}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('Test description')).toBeInTheDocument()
  })

  it('does not render description when not provided', () => {
    render(<ToggleSwitch label="Test Label" checked={false} onChange={vi.fn()} />)
    const descriptions = screen.queryByText(/description/i)
    expect(descriptions).not.toBeInTheDocument()
  })

  it('reflects checked state', () => {
    const { rerender } = render(
      <ToggleSwitch label="Test" checked={false} onChange={vi.fn()} />
    )

    const switchEl = screen.getByRole('switch')
    expect(switchEl).toHaveAttribute('aria-checked', 'false')

    rerender(<ToggleSwitch label="Test" checked={true} onChange={vi.fn()} />)
    expect(switchEl).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onChange with opposite value when clicked', () => {
    const onChange = vi.fn()
    render(<ToggleSwitch label="Test" checked={false} onChange={onChange} />)

    fireEvent.click(screen.getByRole('switch'))

    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('calls onChange with false when checked is true', () => {
    const onChange = vi.fn()
    render(<ToggleSwitch label="Test" checked={true} onChange={onChange} />)

    fireEvent.click(screen.getByRole('switch'))

    expect(onChange).toHaveBeenCalledWith(false)
  })
})
