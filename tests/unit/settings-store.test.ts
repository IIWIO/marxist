import { describe, expect, it } from 'vitest'

describe('settings IPC contract', () => {
  it('returns public defaults without exposing credential material', async () => {
    const result = await window.electron.settings.get()
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.theme).toBe('system')
    expect(result.value.editorFontSize).toBe(14)
    expect(result.value.wordWrap).toBe(true)
    expect(result.value.selectedModel).toBe('anthropic/claude-sonnet-4-20250514')
    expect(result.value.systemPrompt).toBe('You are a helpful assistant.')
    expect(result.value.recentFiles).toEqual([])
    expect(result.value).not.toHaveProperty('openRouterApiKey')
    expect(result.value).not.toHaveProperty('encryptedApiKey')
  })
})
