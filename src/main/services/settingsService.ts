import { safeStorage } from 'electron'
import Store from 'electron-store'
import type { PublicSettingKey, PublicSettings } from '../../types/ipc'

interface StoredSettings extends Omit<PublicSettings, 'hasApiKey'> {
  encryptedApiKey: string
  hasLaunchedBefore: boolean
  openRouterApiKey?: string
}

export const defaultSettings: StoredSettings = {
  theme: 'system',
  editorFontSize: 14,
  previewFontSize: 16,
  lineNumbers: false,
  wordWrap: true,
  spellCheck: true,
  encryptedApiKey: '',
  selectedModel: 'anthropic/claude-sonnet-4-20250514',
  systemPrompt:
    'You are a helpful writing assistant. Help the user improve their Markdown documents while preserving Markdown structure and the user’s intent.',
  recentFiles: [],
  hasLaunchedBefore: false,
  isApiKeyVerified: false,
}

let store: Store<{ settings: StoredSettings }> | null = null
let sessionApiKey = ''

const publicSettingKeys = new Set<PublicSettingKey>([
  'theme',
  'editorFontSize',
  'previewFontSize',
  'lineNumbers',
  'wordWrap',
  'spellCheck',
  'selectedModel',
  'systemPrompt',
  'recentFiles',
  'isApiKeyVerified',
])

function assertSettingValue(key: PublicSettingKey, value: unknown): void {
  if (!publicSettingKeys.has(key)) throw new Error(`Unknown setting: ${String(key)}`)
  if (key === 'theme' && !['system', 'light', 'dark'].includes(String(value))) {
    throw new Error('Invalid theme')
  }
  if ((key === 'editorFontSize' || key === 'previewFontSize') &&
      (typeof value !== 'number' || !Number.isFinite(value) || value < 8 || value > 72)) {
    throw new Error(`Invalid ${key}`)
  }
  if (['lineNumbers', 'wordWrap', 'spellCheck', 'isApiKeyVerified'].includes(key) && typeof value !== 'boolean') {
    throw new Error(`Invalid ${key}`)
  }
  if ((key === 'selectedModel' || key === 'systemPrompt') &&
      (typeof value !== 'string' || value.length > 20000)) {
    throw new Error(`Invalid ${key}`)
  }
  if (key === 'recentFiles' &&
      (!Array.isArray(value) || value.length > 20 || value.some((file) =>
        !file || typeof file.path !== 'string' || typeof file.name !== 'string' || typeof file.lastOpened !== 'string'
      ))) {
    throw new Error('Invalid recentFiles')
  }
}

function getStore(): Store<{ settings: StoredSettings }> {
  if (!store) {
    store = new Store<{ settings: StoredSettings }>({
      name: 'settings',
      defaults: { settings: defaultSettings },
      clearInvalidConfig: true,
    })
    migratePlaintextKey(store)
  }
  return store
}

function migratePlaintextKey(settingsStore: Store<{ settings: StoredSettings }>): void {
  const settings = settingsStore.get('settings')
  if (!settings.openRouterApiKey) return
  const legacyKey = settings.openRouterApiKey
  delete settings.openRouterApiKey
  if (safeStorage.isEncryptionAvailable()) {
    settings.encryptedApiKey = safeStorage.encryptString(legacyKey).toString('base64')
  } else {
    sessionApiKey = legacyKey
  }
  settingsStore.set('settings', settings)
}

function toPublic(settings: StoredSettings): PublicSettings {
  return {
    theme: settings.theme,
    editorFontSize: settings.editorFontSize,
    previewFontSize: settings.previewFontSize,
    lineNumbers: settings.lineNumbers,
    wordWrap: settings.wordWrap,
    spellCheck: settings.spellCheck,
    selectedModel: settings.selectedModel,
    systemPrompt: settings.systemPrompt,
    recentFiles: settings.recentFiles,
    isApiKeyVerified: settings.isApiKeyVerified,
    hasApiKey: Boolean(settings.encryptedApiKey || sessionApiKey),
  }
}

export function getPublicSettings(): PublicSettings {
  return toPublic(getStore().get('settings'))
}

export function getStoredSettings(): StoredSettings {
  return getStore().get('settings')
}

export function setSetting<K extends PublicSettingKey>(key: K, value: PublicSettings[K]): PublicSettings {
  assertSettingValue(key, value)
  const settings = getStore().get('settings')
  getStore().set('settings', { ...settings, [key]: value })
  return getPublicSettings()
}

export function setApiKey(apiKey: string): PublicSettings {
  const value = apiKey.trim()
  const settings = getStore().get('settings')
  if (!value) {
    sessionApiKey = ''
    getStore().set('settings', { ...settings, encryptedApiKey: '', isApiKeyVerified: false })
    return getPublicSettings()
  }
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Secure credential storage is unavailable. The API key was not saved.')
  }
  sessionApiKey = ''
  getStore().set('settings', {
    ...settings,
    encryptedApiKey: safeStorage.encryptString(value).toString('base64'),
  })
  return getPublicSettings()
}

export function getApiKey(): string {
  if (sessionApiKey) return sessionApiKey
  const encrypted = getStore().get('settings').encryptedApiKey
  if (!encrypted) return ''
  if (!safeStorage.isEncryptionAvailable()) return ''
  return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
}

export function resetSettings(): PublicSettings {
  sessionApiKey = ''
  getStore().set('settings', defaultSettings)
  return getPublicSettings()
}

export function markLaunched(): boolean {
  const settings = getStore().get('settings')
  if (settings.hasLaunchedBefore) return false
  getStore().set('settings', { ...settings, hasLaunchedBefore: true })
  return true
}
