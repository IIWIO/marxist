import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SettingsModal from '@/components/Settings/SettingsModal'
import { useSettingsStore } from '@/stores/settingsStore'

vi.mock('@/components/Settings/sections/AppearanceSection', () => ({
  default: () => <div data-testid="appearance-section">Appearance Section</div>,
}))
vi.mock('@/components/Settings/sections/AISection', () => ({
  default: () => <div data-testid="ai-section">AI Section</div>,
}))
vi.mock('@/components/Settings/sections/EditorSection', () => ({
  default: () => <div data-testid="editor-section">Editor Section</div>,
}))
vi.mock('@/components/Settings/sections/AboutSection', () => ({
  default: () => <div data-testid="about-section">About Section</div>,
}))

describe('SettingsModal', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      isModalOpen: true,
      activeTab: 'appearance',
      theme: 'system',
      editorFontSize: 14,
      previewFontSize: 16,
      openRouterApiKey: '',
      selectedModel: 'anthropic/claude-sonnet-4-20250514',
      systemPrompt: '',
      isApiKeyVerified: false,
      availableModels: [],
      lineNumbers: false,
      wordWrap: true,
      spellCheck: true,
      isLoading: false,
    })
  })

  it('renders when open (ST-02)', () => {
    render(<SettingsModal />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    useSettingsStore.setState({ isModalOpen: false })
    render(<SettingsModal />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes on Escape key', () => {
    render(<SettingsModal />)

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(useSettingsStore.getState().isModalOpen).toBe(false)
  })

  it('closes on backdrop click', () => {
    render(<SettingsModal />)

    const backdrop = screen.getByRole('dialog')
    fireEvent.click(backdrop)

    expect(useSettingsStore.getState().isModalOpen).toBe(false)
  })

  it('does not close when clicking modal content', () => {
    render(<SettingsModal />)

    const modalContent = screen.getByText('Settings').closest('div')
    if (modalContent?.parentElement) {
      fireEvent.click(modalContent.parentElement)
    }

    expect(useSettingsStore.getState().isModalOpen).toBe(true)
  })

  it('has 560px width class (ST-02)', () => {
    render(<SettingsModal />)

    const modal = screen.getByRole('dialog').firstElementChild
    expect(modal).toHaveClass('w-[560px]')
  })

  it('shows all tabs', () => {
    render(<SettingsModal />)

    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getByText('AI')).toBeInTheDocument()
    expect(screen.getByText('Editor')).toBeInTheDocument()
    expect(screen.getByText('About')).toBeInTheDocument()
  })

  it('switches tabs on click', () => {
    render(<SettingsModal />)

    fireEvent.click(screen.getByText('Editor'))

    expect(useSettingsStore.getState().activeTab).toBe('editor')
  })

  it('shows correct section based on active tab', () => {
    render(<SettingsModal />)

    expect(screen.getByTestId('appearance-section')).toBeInTheDocument()

    fireEvent.click(screen.getByText('AI'))
    expect(screen.getByTestId('ai-section')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Editor'))
    expect(screen.getByTestId('editor-section')).toBeInTheDocument()

    fireEvent.click(screen.getByText('About'))
    expect(screen.getByTestId('about-section')).toBeInTheDocument()
  })
})
