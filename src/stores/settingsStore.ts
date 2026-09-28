import { create } from 'zustand'
import type { AIModel, PublicSettingKey, PublicSettings } from '@/types/ipc'

interface SettingsState extends PublicSettings {
  apiKeyInput: string
  availableModels: AIModel[]
  isLoading: boolean
  isModalOpen: boolean
  activeTab: 'appearance' | 'ai' | 'editor' | 'about'
  openModal: () => void
  closeModal: () => void
  setActiveTab: (tab: SettingsState['activeTab']) => void
  loadSettings: () => Promise<void>
  updateSetting: <K extends PublicSettingKey>(key: K, value: PublicSettings[K]) => Promise<void>
  setApiKeyInput: (value: string) => void
  storeApiKey: () => Promise<{ ok: true } | { ok: false; error: string }>
  setApiKeyVerified: (verified: boolean, models?: AIModel[]) => Promise<void>
  resetToDefaults: () => Promise<void>
}

const initialSettings: PublicSettings = {
  theme: 'system',
  editorFontSize: 14,
  previewFontSize: 16,
  lineNumbers: false,
  wordWrap: true,
  spellCheck: true,
  selectedModel: 'anthropic/claude-sonnet-4-20250514',
  systemPrompt: 'You are a helpful writing assistant. Help the user improve their Markdown documents.',
  recentFiles: [],
  hasApiKey: false,
  isApiKeyVerified: false,
}

function publicPatch(settings: PublicSettings): Partial<SettingsState> {
  return { ...settings, apiKeyInput: '' }
}

async function reportSettingsError(error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error)
  await window.electron.file.showError(
    'Settings Failed',
    'Marxist could not save or load your settings.',
    message
  )
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  ...initialSettings,
  apiKeyInput: '',
  availableModels: [],
  isLoading: true,
  isModalOpen: false,
  activeTab: 'appearance',

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false, activeTab: 'appearance' }),
  setActiveTab: (activeTab) => set({ activeTab }),

  loadSettings: async () => {
    try {
      const result = await window.electron.settings.get()
      if (!result.ok) {
        await reportSettingsError(result.error)
        set({ isLoading: false })
        return
      }
      set({ ...publicPatch(result.value), isLoading: false })
    } catch (error) {
      await reportSettingsError(error)
      set({ isLoading: false })
    }
  },

  updateSetting: async (key, value) => {
    const previous = get()[key]
    set({ [key]: value } as Partial<SettingsState>)
    try {
      const result = await window.electron.settings.set(key, value)
      if (result.ok) set(publicPatch(result.value))
      else {
        set({ [key]: previous } as Partial<SettingsState>)
        await reportSettingsError(result.error)
      }
    } catch (error) {
      set({ [key]: previous } as Partial<SettingsState>)
      await reportSettingsError(error)
    }
  },

  setApiKeyInput: (apiKeyInput) => set({ apiKeyInput, isApiKeyVerified: false }),

  storeApiKey: async () => {
    try {
      const result = await window.electron.settings.setApiKey(get().apiKeyInput)
      if (!result.ok) return result
      set(publicPatch(result.value))
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  },

  setApiKeyVerified: async (isApiKeyVerified, availableModels = []) => {
    const previous = get().isApiKeyVerified
    set({ isApiKeyVerified, availableModels })
    try {
      const result = await window.electron.settings.set('isApiKeyVerified', isApiKeyVerified)
      if (!result.ok) {
        set({ isApiKeyVerified: previous })
        await reportSettingsError(result.error)
      }
    } catch (error) {
      set({ isApiKeyVerified: previous })
      await reportSettingsError(error)
    }
  },

  resetToDefaults: async () => {
    try {
      const result = await window.electron.settings.reset()
      if (result.ok) set({ ...publicPatch(result.value), availableModels: [] })
      else await reportSettingsError(result.error)
    } catch (error) {
      await reportSettingsError(error)
    }
  },
}))

export const selectIsModalOpen = (state: SettingsState) => state.isModalOpen
export const selectTheme = (state: SettingsState) => state.theme
export const selectEditorFontSize = (state: SettingsState) => state.editorFontSize
export const selectPreviewFontSize = (state: SettingsState) => state.previewFontSize
