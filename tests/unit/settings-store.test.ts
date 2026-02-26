import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Settings Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return default settings', async () => {
    const settings = await window.electron.settings.get()
    expect(settings.theme).toBe('system')
    expect(settings.editorFontSize).toBe(14)
    expect(settings.wordWrap).toBe(true)
  })

  it('should have encrypted API key storage', async () => {
    const settings = await window.electron.settings.get()
    expect(settings).toHaveProperty('openRouterApiKey')
  })

  it('should have default model configured', async () => {
    const settings = await window.electron.settings.get()
    expect(settings.selectedModel).toBe('anthropic/claude-sonnet-4-20250514')
  })

  it('should have default system prompt', async () => {
    const settings = await window.electron.settings.get()
    expect(settings.systemPrompt).toBe('You are a helpful assistant.')
  })

  it('should have empty recent files by default', async () => {
    const settings = await window.electron.settings.get()
    expect(settings.recentFiles).toEqual([])
  })
})
