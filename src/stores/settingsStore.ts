import { create } from 'zustand'

export interface Settings {
  theme: 'system' | 'light' | 'dark'
  editorFontSize: number
  previewFontSize: number
  openRouterApiKey: string
  selectedModel: string
  systemPrompt: string
  isApiKeyVerified: boolean
  availableModels: Array<{ id: string; name: string; contextLength: number }>
  lineNumbers: boolean
  wordWrap: boolean
  spellCheck: boolean
}

interface SettingsState extends Settings {
  isLoading: boolean
  isModalOpen: boolean
  activeTab: 'appearance' | 'ai' | 'editor' | 'about'

  openModal: () => void
  closeModal: () => void
  setActiveTab: (tab: SettingsState['activeTab']) => void
  loadSettings: () => Promise<void>
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>
  setApiKeyVerified: (verified: boolean, models?: Settings['availableModels']) => Promise<void>
  resetToDefaults: () => Promise<void>
}

const DEFAULT_SYSTEM_PROMPT = `You are a helpful writing assistant. Help the user improve their Markdown documents. Be concise and direct in your responses.

When asked to edit the document:
- Return the COMPLETE modified document as raw Markdown
- Do not include explanations unless asked
- Preserve the overall structure and formatting`

export const useSettingsStore = create<SettingsState>()((set) => ({
  theme: 'system',
  editorFontSize: 14,
  previewFontSize: 16,
  openRouterApiKey: '',
  selectedModel: 'anthropic/claude-sonnet-4-20250514',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  isApiKeyVerified: false,
  availableModels: [],
  lineNumbers: false,
  wordWrap: true,
  spellCheck: true,

  isLoading: true,
  isModalOpen: false,
  activeTab: 'appearance',

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false, activeTab: 'appearance' }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  loadSettings: async () => {
    try {
      const settings = await window.electron.settings.get()
      set({
        theme: settings.theme,
        editorFontSize: settings.editorFontSize,
        previewFontSize: settings.previewFontSize,
        openRouterApiKey: settings.openRouterApiKey,
        selectedModel: settings.selectedModel,
        systemPrompt: settings.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        lineNumbers: settings.lineNumbers,
        wordWrap: settings.wordWrap,
        spellCheck: settings.spellCheck,
        isLoading: false,
        isApiKeyVerified: settings.isApiKeyVerified || false,
      })
    } catch (error) {
      console.error('Failed to load settings:', error)
      set({ isLoading: false })
    }
  },

  updateSetting: async (key, value) => {
    set({ [key]: value } as Partial<SettingsState>)

    const persistableKeys = [
      'theme',
      'editorFontSize',
      'previewFontSize',
      'openRouterApiKey',
      'selectedModel',
      'systemPrompt',
      'lineNumbers',
      'wordWrap',
      'spellCheck',
      'isApiKeyVerified',
    ] as const

    if (persistableKeys.includes(key as typeof persistableKeys[number])) {
      try {
        await window.electron.settings.set(
          key as Parameters<typeof window.electron.settings.set>[0],
          value
        )
      } catch (error) {
        console.error(`Failed to save setting ${key}:`, error)
      }
    }
  },

  setApiKeyVerified: async (verified, models = []) => {
    set({ isApiKeyVerified: verified, availableModels: models })
    try {
      await window.electron.settings.set('isApiKeyVerified', verified)
    } catch (error) {
      console.error('Failed to save API key verification status:', error)
    }
  },

  resetToDefaults: async () => {
    try {
      const defaults = await window.electron.settings.reset()
      set({
        theme: defaults.theme,
        editorFontSize: defaults.editorFontSize,
        previewFontSize: defaults.previewFontSize,
        openRouterApiKey: defaults.openRouterApiKey,
        selectedModel: defaults.selectedModel,
        systemPrompt: defaults.systemPrompt,
        lineNumbers: defaults.lineNumbers,
        wordWrap: defaults.wordWrap,
        spellCheck: defaults.spellCheck,
        isApiKeyVerified: false,
        availableModels: [],
      })
    } catch (error) {
      console.error('Failed to reset settings:', error)
    }
  },
}))

export const selectIsModalOpen = (s: SettingsState) => s.isModalOpen
export const selectTheme = (s: SettingsState) => s.theme
export const selectEditorFontSize = (s: SettingsState) => s.editorFontSize
export const selectPreviewFontSize = (s: SettingsState) => s.previewFontSize
