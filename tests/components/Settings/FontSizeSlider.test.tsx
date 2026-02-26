import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FontSizeSlider from '@/components/Settings/components/FontSizeSlider'

describe('FontSizeSlider', () => {
  it('renders with correct value', () => {
    render(<FontSizeSlider value={14} min={10} max={24} onChange={vi.fn()} />)

    expect(screen.getByText('14px')).toBeInTheDocument()
  })

  it('renders range input with correct attributes', () => {
    render(<FontSizeSlider value={14} min={10} max={24} onChange={vi.fn()} />)

    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('min', '10')
    expect(slider).toHaveAttribute('max', '24')
    expect(slider).toHaveValue('14')
  })

  it('calls onChange when value changes', () => {
    const onChange = vi.fn()
    render(<FontSizeSlider value={14} min={10} max={24} onChange={onChange} />)

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '18' } })

    expect(onChange).toHaveBeenCalledWith(18)
  })

  it('displays updated value', () => {
    const { rerender } = render(
      <FontSizeSlider value={14} min={10} max={24} onChange={vi.fn()} />
    )

    expect(screen.getByText('14px')).toBeInTheDocument()

    rerender(<FontSizeSlider value={20} min={10} max={24} onChange={vi.fn()} />)

    expect(screen.getByText('20px')).toBeInTheDocument()
  })
})
