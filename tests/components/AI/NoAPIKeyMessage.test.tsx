import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NoAPIKeyMessage from '@/components/AI/NoAPIKeyMessage'
import { useSettingsStore } from '@/stores/settingsStore'

describe('NoAPIKeyMessage', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      isModalOpen: false,
      activeTab: 'appearance',
    })
  })

  it('renders API key required message (AI-14)', () => {
    render(<NoAPIKeyMessage />)

    expect(screen.getByText('API Key Required')).toBeInTheDocument()
    expect(
      screen.getByText(/configure your OpenRouter API key/)
    ).toBeInTheDocument()
  })

  it('shows Open Settings button', () => {
    render(<NoAPIKeyMessage />)
    expect(screen.getByText('Open Settings')).toBeInTheDocument()
  })

  it('opens settings modal on button click', () => {
    render(<NoAPIKeyMessage />)

    fireEvent.click(screen.getByText('Open Settings'))

    expect(useSettingsStore.getState().isModalOpen).toBe(true)
  })

  it('switches to AI tab when opening settings', () => {
    render(<NoAPIKeyMessage />)

    fireEvent.click(screen.getByText('Open Settings'))

    expect(useSettingsStore.getState().activeTab).toBe('ai')
  })

  it('has icon wrapper', () => {
    const { container } = render(<NoAPIKeyMessage />)

    const iconWrapper = container.querySelector('.rounded-full')
    expect(iconWrapper).toBeInTheDocument()
  })
})
