import '@testing-library/jest-dom/vitest'
import { vi, beforeAll, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import type { ElectronAPI, PublicSettings } from '@/types/ipc'

export const defaultPublicSettings: PublicSettings = {
  theme: 'system',
  editorFontSize: 14,
  previewFontSize: 16,
  lineNumbers: false,
  wordWrap: true,
  spellCheck: true,
  selectedModel: 'anthropic/claude-sonnet-4-20250514',
  systemPrompt: 'You are a helpful assistant.',
  recentFiles: [],
  hasApiKey: false,
  isApiKeyVerified: false,
}

export const mockElectronAPI = {
  file: {
    open: vi.fn().mockResolvedValue({ ok: true, value: { path: null, name: '', content: '' } }),
    save: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    saveAs: vi.fn().mockResolvedValue({ ok: true, value: { path: null } }),
    getRecent: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    drop: vi.fn().mockResolvedValue({ ok: false, error: 'Not found' }),
    openExternal: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    showError: vi.fn().mockResolvedValue(undefined),
    confirmClose: vi.fn().mockResolvedValue('cancel'),
  },
  drafts: {
    saveSnapshot: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    restore: vi.fn().mockResolvedValue({
      ok: true,
      value: { success: true, tabs: [], session: null },
    }),
    clear: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    clearAll: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
  },
  settings: {
    get: vi.fn().mockResolvedValue({ ok: true, value: defaultPublicSettings }),
    set: vi.fn().mockResolvedValue({ ok: true, value: defaultPublicSettings }),
    setApiKey: vi.fn().mockResolvedValue({
      ok: true,
      value: { ...defaultPublicSettings, hasApiKey: true },
    }),
    reset: vi.fn().mockResolvedValue({ ok: true, value: defaultPublicSettings }),
  },
  ai: {
    chat: vi.fn().mockResolvedValue({ ok: true, value: { content: '' } }),
    edit: vi.fn().mockResolvedValue({ ok: true, value: { content: '' } }),
    cancel: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    verifyKey: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    listModels: vi.fn().mockResolvedValue({ ok: true, value: [] }),
  },
  app: {
    getVersion: vi.fn().mockResolvedValue({ ok: true, value: '0.8.2' }),
    saveBeforeQuit: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    readyToQuit: vi.fn(),
    getWelcomeFile: vi.fn().mockResolvedValue({
      ok: true,
      value: { isFirstRun: false, content: null },
    }),
    confirmQuitFailure: vi.fn().mockResolvedValue('cancel'),
    checkForUpdates: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    copyDiagnostics: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
  },
  onMenuEvent: vi.fn().mockReturnValue(() => undefined),
  onAppEvent: vi.fn().mockReturnValue(() => undefined),
  onAIEvent: vi.fn().mockReturnValue(() => undefined),
} satisfies ElectronAPI

beforeAll(() => {
  Object.defineProperty(window, 'electron', { value: mockElectronAPI, writable: true })
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
  const emptyRectList = Object.assign([], { item: () => null }) as unknown as DOMRectList
  Range.prototype.getClientRects = vi.fn(() => emptyRectList)
  Range.prototype.getBoundingClientRect = vi.fn(() => new DOMRect())
})

afterEach(() => cleanup())
