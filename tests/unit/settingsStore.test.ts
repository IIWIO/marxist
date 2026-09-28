import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettingsStore } from '@/stores/settingsStore'
import { defaultPublicSettings, mockElectronAPI } from '../setup'

describe('settingsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSettingsStore.setState({
      ...defaultPublicSettings,
      apiKeyInput: '',
      availableModels: [],
      isLoading: true,
      isModalOpen: false,
      activeTab: 'appearance',
    })
    mockElectronAPI.settings.get.mockResolvedValue({
      ok: true,
      value: { ...defaultPublicSettings, theme: 'dark', editorFontSize: 16 },
    })
    mockElectronAPI.settings.set.mockImplementation(async (key, value) => ({
      ok: true,
      value: { ...defaultPublicSettings, [key]: value },
    }))
  })

  it('loads public settings', async () => {
    await useSettingsStore.getState().loadSettings()
    expect(useSettingsStore.getState().theme).toBe('dark')
    expect(useSettingsStore.getState().editorFontSize).toBe(16)
    expect(useSettingsStore.getState().isLoading).toBe(false)
  })

  it('settles loading when settings cannot be read', async () => {
    mockElectronAPI.settings.get.mockResolvedValue({ ok: false, error: 'read failed' })
    await useSettingsStore.getState().loadSettings()
    expect(useSettingsStore.getState().isLoading).toBe(false)
  })

  it('persists ordinary settings through the typed contract', async () => {
    await useSettingsStore.getState().updateSetting('editorFontSize', 18)
    expect(mockElectronAPI.settings.set).toHaveBeenCalledWith('editorFontSize', 18)
  })

  it('rolls back an optimistic setting when persistence fails', async () => {
    mockElectronAPI.settings.set.mockResolvedValueOnce({ ok: false, error: 'write failed' })
    await useSettingsStore.getState().updateSetting('editorFontSize', 18)

    expect(useSettingsStore.getState().editorFontSize).toBe(14)
    expect(mockElectronAPI.file.showError).toHaveBeenCalledWith(
      'Settings Failed',
      'Marxist could not save or load your settings.',
      'write failed'
    )
  })

  it('settles and reports a rejected settings read', async () => {
    mockElectronAPI.settings.get.mockRejectedValueOnce(new Error('transport failed'))
    await useSettingsStore.getState().loadSettings()

    expect(useSettingsStore.getState().isLoading).toBe(false)
    expect(mockElectronAPI.file.showError).toHaveBeenCalled()
  })

  it('stores API keys separately and clears renderer plaintext', async () => {
    useSettingsStore.getState().setApiKeyInput('sk-or-v1-secret')
    const result = await useSettingsStore.getState().storeApiKey()
    expect(result.ok).toBe(true)
    expect(mockElectronAPI.settings.setApiKey).toHaveBeenCalledWith('sk-or-v1-secret')
    expect(useSettingsStore.getState().apiKeyInput).toBe('')
    expect(useSettingsStore.getState().hasApiKey).toBe(true)
  })

  it('returns a typed error when secure key storage rejects', async () => {
    useSettingsStore.getState().setApiKeyInput('secret')
    mockElectronAPI.settings.setApiKey.mockRejectedValueOnce(new Error('secure storage unavailable'))

    await expect(useSettingsStore.getState().storeApiKey()).resolves.toEqual({
      ok: false,
      error: 'secure storage unavailable',
    })
  })

  it('manages modal state and verification metadata', async () => {
    useSettingsStore.getState().openModal()
    useSettingsStore.getState().setActiveTab('ai')
    await useSettingsStore.getState().setApiKeyVerified(true, [
      { id: 'model', name: 'Model', contextLength: 8_192 },
    ])
    expect(useSettingsStore.getState().isModalOpen).toBe(true)
    expect(useSettingsStore.getState().isApiKeyVerified).toBe(true)
    useSettingsStore.getState().closeModal()
    expect(useSettingsStore.getState().activeTab).toBe('appearance')
  })

  it('rolls back verification state when it cannot be persisted', async () => {
    mockElectronAPI.settings.set.mockResolvedValueOnce({ ok: false, error: 'write failed' })
    await useSettingsStore.getState().setApiKeyVerified(true)

    expect(useSettingsStore.getState().isApiKeyVerified).toBe(false)
    expect(mockElectronAPI.file.showError).toHaveBeenCalled()
  })

  it('resets settings through the typed contract', async () => {
    useSettingsStore.setState({ theme: 'dark' })
    await useSettingsStore.getState().resetToDefaults()
    expect(useSettingsStore.getState().theme).toBe('system')
  })
})
