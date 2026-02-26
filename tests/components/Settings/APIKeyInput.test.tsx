import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import APIKeyInput from '@/components/Settings/components/APIKeyInput'

describe('APIKeyInput', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onVerify: vi.fn(),
    isVerifying: false,
    isVerified: false,
    error: null,
  }

  it('renders password input by default (ST-06)', () => {
    render(<APIKeyInput {...defaultProps} value="sk-test" />)

    const input = screen.getByPlaceholderText('sk-or-v1-...')
    expect(input).toHaveAttribute('type', 'password')
  })

  it('toggles visibility (ST-06)', () => {
    render(<APIKeyInput {...defaultProps} value="sk-test" />)

    const input = screen.getByPlaceholderText('sk-or-v1-...')
    const toggle = screen.getByRole('button', { name: /show api key/i })

    fireEvent.click(toggle)
    expect(input).toHaveAttribute('type', 'text')

    fireEvent.click(toggle)
    expect(input).toHaveAttribute('type', 'password')
  })

  it('shows Verify button (ST-07)', () => {
    render(<APIKeyInput {...defaultProps} value="sk-test" />)
    expect(screen.getByText('Verify')).toBeInTheDocument()
  })

  it('disables Verify when empty', () => {
    render(<APIKeyInput {...defaultProps} />)

    const button = screen.getByText('Verify')
    expect(button).toBeDisabled()
  })

  it('enables Verify when has value', () => {
    render(<APIKeyInput {...defaultProps} value="sk-test" />)

    const button = screen.getByText('Verify')
    expect(button).not.toBeDisabled()
  })

  it('shows verifying state', () => {
    render(<APIKeyInput {...defaultProps} isVerifying={true} value="sk-test" />)
    expect(screen.getByText('Verifying')).toBeInTheDocument()
  })

  it('shows verified state', () => {
    render(<APIKeyInput {...defaultProps} isVerified={true} value="sk-test" />)
    expect(screen.getByText('Verified')).toBeInTheDocument()
  })

  it('shows error message', () => {
    render(<APIKeyInput {...defaultProps} error="Invalid key" value="sk-test" />)
    expect(screen.getByText('Invalid key')).toBeInTheDocument()
  })

  it('calls onChange when input changes', () => {
    const onChange = vi.fn()
    render(<APIKeyInput {...defaultProps} onChange={onChange} />)

    const input = screen.getByPlaceholderText('sk-or-v1-...')
    fireEvent.change(input, { target: { value: 'sk-new-key' } })

    expect(onChange).toHaveBeenCalledWith('sk-new-key')
  })

  it('calls onVerify when verify button clicked', () => {
    const onVerify = vi.fn()
    render(<APIKeyInput {...defaultProps} onVerify={onVerify} value="sk-test" />)

    fireEvent.click(screen.getByText('Verify'))

    expect(onVerify).toHaveBeenCalled()
  })
})
