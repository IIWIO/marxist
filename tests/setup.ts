import '@testing-library/jest-dom/vitest'
import { vi, beforeAll, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

const mockElectronAPI = {
  file: {
    open: vi.fn(),
    save: vi.fn(),
    saveAs: vi.fn(),
    getRecent: vi.fn(),
    drop: vi.fn(),
  },
  drafts: {
    saveAll: vi.fn(),
    restore: vi.fn(),
    clear: vi.fn(),
  },
  settings: {
    get: vi.fn().mockResolvedValue({
      theme: 'system',
      editorFontSize: 14,
      previewFontSize: 16,
      lineNumbers: false,
      wordWrap: true,
      spellCheck: true,
      openRouterApiKey: '',
      selectedModel: 'anthropic/claude-sonnet-4-20250514',
      systemPrompt: 'You are a helpful assistant.',
      recentFiles: [],
    }),
    set: vi.fn(),
    reset: vi.fn(),
  },
  ai: {
    chat: vi.fn(),
    edit: vi.fn(),
    cancel: vi.fn(),
    verifyKey: vi.fn(),
    listModels: vi.fn(),
  },
  onMenuEvent: vi.fn().mockReturnValue(() => {}),
}

beforeAll(() => {
  // Add electron to window object
  Object.defineProperty(window, 'electron', {
    value: mockElectronAPI,
    writable: true,
  })

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

afterEach(() => {
  cleanup()
})
