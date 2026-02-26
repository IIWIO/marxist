import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ThemeToggle from '@/components/Settings/components/ThemeToggle'

describe('ThemeToggle', () => {
  it('renders all theme options (ST-03, TH-01)', () => {
    render(<ThemeToggle value="system" onChange={vi.fn()} />)

    expect(screen.getByText('System')).toBeInTheDocument()
    expect(screen.getByText('Light')).toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
  })

  it('highlights active option', () => {
    render(<ThemeToggle value="dark" onChange={vi.fn()} />)

    const darkButton = screen.getByText('Dark')
    expect(darkButton).toHaveClass('bg-white')
  })

  it('calls onChange when option clicked', () => {
    const onChange = vi.fn()
    render(<ThemeToggle value="system" onChange={onChange} />)

    fireEvent.click(screen.getByText('Light'))

    expect(onChange).toHaveBeenCalledWith('light')
  })

  it('calls onChange with correct values for each option', () => {
    const onChange = vi.fn()
    render(<ThemeToggle value="system" onChange={onChange} />)

    fireEvent.click(screen.getByText('System'))
    expect(onChange).toHaveBeenCalledWith('system')

    fireEvent.click(screen.getByText('Light'))
    expect(onChange).toHaveBeenCalledWith('light')

    fireEvent.click(screen.getByText('Dark'))
    expect(onChange).toHaveBeenCalledWith('dark')
  })
})
