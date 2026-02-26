# Stage 08: Settings Modal

## Overview

Implement the settings modal with appearance, AI configuration, and editor preference sections. Includes OpenRouter API key verification and model selection.

## Requirements Covered

### Settings

| ID | Requirement | Priority |
|----|-------------|----------|
| ST-01 | Opened via ⌘, or settings icon | P0 |
| ST-02 | Centered modal (560px wide) | P0 |
| ST-03 | **Appearance:** theme toggle (System / Light / Dark) | P0 |
| ST-04 | **Appearance:** editor font size (default 14px) | P1 |
| ST-05 | **Appearance:** preview font size (default 16px) | P1 |
| ST-06 | **AI:** OpenRouter API key input (password field + visibility toggle) | P0 |
| ST-07 | **AI:** Verify button — tests key against OpenRouter API | P0 |
| ST-08 | **AI:** On verified key, **searchable dropdown** with full OpenRouter model list | P0 |
| ST-09 | **AI:** Selected model persists across sessions | P0 |
| ST-10 | **AI:** System prompt — text area with sensible default pre-filled | P0 |
| ST-11 | **Editor:** line numbers toggle (default off) | P1 |
| ST-12 | **Editor:** word wrap toggle (default on) | P1 |
| ST-13 | **Editor:** spell check toggle (default on) | P2 |
| ST-14 | **About:** app version, icon, credits | P2 |
| ST-15 | Settings persisted via electron-store | P0 |

### Theme

| ID | Requirement | Priority |
|----|-------------|----------|
| TH-01 | System / Light / Dark theme options | P0 |
| TH-02 | System mode follows macOS appearance preference | P0 |
| TH-03 | Toggle via Settings and ⌘⇧D | P0 |

## Dependencies from Previous Stages

- Settings handlers from Stage 1 (`settings:get`, `settings:set`)
- AI handlers stub from Stage 1 (to be implemented in Stage 9)
- electron-store with encryption for API key (NF-06)

---

## 1. Project Structure

```
src/
├── components/
│   ├── Settings/
│   │   ├── SettingsModal.tsx        # NEW: Modal container
│   │   ├── SettingsHeader.tsx       # NEW: Modal header with close
│   │   ├── SettingsTabs.tsx         # NEW: Tab navigation
│   │   ├── sections/
│   │   │   ├── AppearanceSection.tsx    # NEW: Theme, fonts
│   │   │   ├── AISection.tsx            # NEW: API key, model, prompt
│   │   │   ├── EditorSection.tsx        # NEW: Line numbers, wrap, spell
│   │   │   └── AboutSection.tsx         # NEW: Version, credits
│   │   └── components/
│   │       ├── ThemeToggle.tsx          # NEW: System/Light/Dark
│   │       ├── FontSizeSlider.tsx       # NEW: Font size control
│   │       ├── APIKeyInput.tsx          # NEW: Password field
│   │       ├── ModelSelector.tsx        # NEW: Searchable dropdown
│   │       ├── SystemPromptEditor.tsx   # NEW: Text area
│   │       └── ToggleSwitch.tsx         # NEW: On/off toggle
├── stores/
│   └── settingsStore.ts             # NEW: Settings state
└── hooks/
    └── useSettings.ts               # NEW: Settings hook
```

---

## 2. Settings Store

### 2.1 src/stores/settingsStore.ts

```typescript
import { create } from 'zustand'

export interface Settings {
  // Appearance
  theme: 'system' | 'light' | 'dark'
  editorFontSize: number
  previewFontSize: number
  
  // AI
  openRouterApiKey: string
  selectedModel: string
  systemPrompt: string
  isApiKeyVerified: boolean
  availableModels: Array<{ id: string; name: string; contextLength: number }>
  
  // Editor
  lineNumbers: boolean
  wordWrap: boolean
  spellCheck: boolean
}

interface SettingsState extends Settings {
  isLoading: boolean
  isModalOpen: boolean
  activeTab: 'appearance' | 'ai' | 'editor' | 'about'
  
  // Actions
  openModal: () => void
  closeModal: () => void
  setActiveTab: (tab: SettingsState['activeTab']) => void
  loadSettings: () => Promise<void>
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>
  setApiKeyVerified: (verified: boolean, models?: Settings['availableModels']) => void
  resetToDefaults: () => Promise<void>
}

const DEFAULT_SYSTEM_PROMPT = `You are a helpful writing assistant. Help the user improve their Markdown documents. Be concise and direct in your responses.

When asked to edit the document:
- Return the COMPLETE modified document as raw Markdown
- Do not include explanations unless asked
- Preserve the overall structure and formatting`

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  // Default values
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
        // If API key exists, we'll verify it later
        isApiKeyVerified: false,
      })
    } catch (error) {
      console.error('Failed to load settings:', error)
      set({ isLoading: false })
    }
  },

  updateSetting: async (key, value) => {
    // Optimistic update
    set({ [key]: value } as Partial<SettingsState>)
    
    try {
      await window.electron.settings.set(key, value)
    } catch (error) {
      console.error(`Failed to save setting ${key}:`, error)
      // Could revert here if needed
    }
  },

  setApiKeyVerified: (verified, models = []) => {
    set({ isApiKeyVerified: verified, availableModels: models })
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

// Selectors
export const selectIsModalOpen = (s: SettingsState) => s.isModalOpen
export const selectTheme = (s: SettingsState) => s.theme
export const selectEditorFontSize = (s: SettingsState) => s.editorFontSize
export const selectPreviewFontSize = (s: SettingsState) => s.previewFontSize
```

---

## 3. Settings Hook

### 3.1 src/hooks/useSettings.ts

```typescript
import { useEffect, useCallback } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'

export function useSettings() {
  const loadSettings = useSettingsStore((s) => s.loadSettings)
  const updateSetting = useSettingsStore((s) => s.updateSetting)
  const openModal = useSettingsStore((s) => s.openModal)
  const closeModal = useSettingsStore((s) => s.closeModal)
  
  const theme = useSettingsStore((s) => s.theme)
  const editorFontSize = useSettingsStore((s) => s.editorFontSize)
  const previewFontSize = useSettingsStore((s) => s.previewFontSize)
  const lineNumbers = useSettingsStore((s) => s.lineNumbers)
  const wordWrap = useSettingsStore((s) => s.wordWrap)
  const spellCheck = useSettingsStore((s) => s.spellCheck)
  const isLoading = useSettingsStore((s) => s.isLoading)

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const cycleTheme = useCallback(() => {
    const themes: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark']
    const currentIndex = themes.indexOf(theme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    updateSetting('theme', nextTheme)
  }, [theme, updateSetting])

  return {
    theme,
    editorFontSize,
    previewFontSize,
    lineNumbers,
    wordWrap,
    spellCheck,
    isLoading,
    updateSetting,
    openModal,
    closeModal,
    cycleTheme,
  }
}
```

---

## 4. Modal Components

### 4.1 src/components/Settings/SettingsModal.tsx

```typescript
import { useEffect, useCallback } from 'react'
import { useSettingsStore, selectIsModalOpen } from '@/stores/settingsStore'
import SettingsHeader from './SettingsHeader'
import SettingsTabs from './SettingsTabs'
import AppearanceSection from './sections/AppearanceSection'
import AISection from './sections/AISection'
import EditorSection from './sections/EditorSection'
import AboutSection from './sections/AboutSection'

export default function SettingsModal() {
  const isOpen = useSettingsStore(selectIsModalOpen)
  const activeTab = useSettingsStore((s) => s.activeTab)
  const closeModal = useSettingsStore((s) => s.closeModal)

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeModal])

  // Close on backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal()
    }
  }, [closeModal])

  if (!isOpen) return null

  const renderSection = () => {
    switch (activeTab) {
      case 'appearance':
        return <AppearanceSection />
      case 'ai':
        return <AISection />
      case 'editor':
        return <EditorSection />
      case 'about':
        return <AboutSection />
      default:
        return null
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      {/* ST-02: 560px wide centered modal */}
      <div
        className="
          w-[560px] max-h-[80vh] 
          bg-white dark:bg-[#1E1E1E]
          rounded-xl shadow-2xl
          flex flex-col overflow-hidden
          animate-in fade-in zoom-in-95 duration-150
        "
        onClick={(e) => e.stopPropagation()}
      >
        <SettingsHeader />
        <SettingsTabs />
        <div className="flex-1 overflow-y-auto p-6">
          {renderSection()}
        </div>
      </div>
    </div>
  )
}
```

### 4.2 src/components/Settings/SettingsHeader.tsx

```typescript
import Icon from '@/components/common/Icon'
import { useSettingsStore } from '@/stores/settingsStore'

export default function SettingsHeader() {
  const closeModal = useSettingsStore((s) => s.closeModal)

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <h2
        id="settings-title"
        className="text-lg font-medium text-text-primary-light dark:text-text-primary-dark"
      >
        Settings
      </h2>
      <button
        onClick={closeModal}
        className="
          p-1.5 rounded-lg
          text-text-secondary-light dark:text-text-secondary-dark
          hover:text-text-primary-light dark:hover:text-text-primary-dark
          hover:bg-gray-100 dark:hover:bg-gray-700
          transition-colors
        "
        aria-label="Close settings"
      >
        <Icon name="close" size={20} />
      </button>
    </div>
  )
}
```

### 4.3 src/components/Settings/SettingsTabs.tsx

```typescript
import { useSettingsStore } from '@/stores/settingsStore'

type TabId = 'appearance' | 'ai' | 'editor' | 'about'

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'ai', label: 'AI' },
  { id: 'editor', label: 'Editor' },
  { id: 'about', label: 'About' },
]

export default function SettingsTabs() {
  const activeTab = useSettingsStore((s) => s.activeTab)
  const setActiveTab = useSettingsStore((s) => s.setActiveTab)

  return (
    <div className="flex px-6 border-b border-gray-200 dark:border-gray-700">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`
            px-4 py-3 text-sm font-medium transition-colors relative
            ${activeTab === tab.id
              ? 'text-accent dark:text-accent-dark'
              : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark'
            }
          `}
        >
          {tab.label}
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent dark:bg-accent-dark" />
          )}
        </button>
      ))}
    </div>
  )
}
```

---

## 5. Section Components

### 5.1 src/components/Settings/sections/AppearanceSection.tsx

```typescript
import { useSettingsStore } from '@/stores/settingsStore'
import ThemeToggle from '../components/ThemeToggle'
import FontSizeSlider from '../components/FontSizeSlider'

export default function AppearanceSection() {
  const theme = useSettingsStore((s) => s.theme)
  const editorFontSize = useSettingsStore((s) => s.editorFontSize)
  const previewFontSize = useSettingsStore((s) => s.previewFontSize)
  const updateSetting = useSettingsStore((s) => s.updateSetting)

  return (
    <div className="space-y-6">
      {/* ST-03: Theme toggle */}
      <div>
        <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">
          Theme
        </label>
        <ThemeToggle
          value={theme}
          onChange={(value) => updateSetting('theme', value)}
        />
        <p className="mt-1.5 text-xs text-text-secondary-light dark:text-text-secondary-dark">
          System follows your macOS appearance preference
        </p>
      </div>

      {/* ST-04: Editor font size */}
      <div>
        <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">
          Editor Font Size
        </label>
        <FontSizeSlider
          value={editorFontSize}
          min={10}
          max={24}
          onChange={(value) => updateSetting('editorFontSize', value)}
        />
      </div>

      {/* ST-05: Preview font size */}
      <div>
        <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">
          Preview Font Size
        </label>
        <FontSizeSlider
          value={previewFontSize}
          min={12}
          max={28}
          onChange={(value) => updateSetting('previewFontSize', value)}
        />
      </div>
    </div>
  )
}
```

### 5.2 src/components/Settings/sections/AISection.tsx

```typescript
import { useState, useCallback } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'
import APIKeyInput from '../components/APIKeyInput'
import ModelSelector from '../components/ModelSelector'
import SystemPromptEditor from '../components/SystemPromptEditor'

export default function AISection() {
  const apiKey = useSettingsStore((s) => s.openRouterApiKey)
  const selectedModel = useSettingsStore((s) => s.selectedModel)
  const systemPrompt = useSettingsStore((s) => s.systemPrompt)
  const isApiKeyVerified = useSettingsStore((s) => s.isApiKeyVerified)
  const availableModels = useSettingsStore((s) => s.availableModels)
  const updateSetting = useSettingsStore((s) => s.updateSetting)
  const setApiKeyVerified = useSettingsStore((s) => s.setApiKeyVerified)

  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  // ST-07: Verify API key
  const handleVerify = useCallback(async () => {
    if (!apiKey.trim()) {
      setVerifyError('Please enter an API key')
      return
    }

    setIsVerifying(true)
    setVerifyError(null)

    try {
      // First verify the key
      const verifyResult = await window.electron.ai.verifyKey(apiKey)
      
      if (!verifyResult.valid) {
        setVerifyError(verifyResult.error || 'Invalid API key')
        setApiKeyVerified(false, [])
        return
      }

      // Then fetch available models
      const modelsResult = await window.electron.ai.listModels()
      
      if (modelsResult.error) {
        setVerifyError(modelsResult.error)
        setApiKeyVerified(false, [])
        return
      }

      setApiKeyVerified(true, modelsResult.models || [])
    } catch (error) {
      setVerifyError((error as Error).message)
      setApiKeyVerified(false, [])
    } finally {
      setIsVerifying(false)
    }
  }, [apiKey, setApiKeyVerified])

  const handleApiKeyChange = useCallback((value: string) => {
    updateSetting('openRouterApiKey', value)
    // Reset verification when key changes
    setApiKeyVerified(false, [])
    setVerifyError(null)
  }, [updateSetting, setApiKeyVerified])

  return (
    <div className="space-y-6">
      {/* ST-06: API Key input */}
      <div>
        <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">
          OpenRouter API Key
        </label>
        <APIKeyInput
          value={apiKey}
          onChange={handleApiKeyChange}
          onVerify={handleVerify}
          isVerifying={isVerifying}
          isVerified={isApiKeyVerified}
          error={verifyError}
        />
        <p className="mt-1.5 text-xs text-text-secondary-light dark:text-text-secondary-dark">
          Get your API key from{' '}
          <button
            onClick={() => window.electron.file.openExternal('https://openrouter.ai/keys')}
            className="text-accent dark:text-accent-dark hover:underline"
          >
            openrouter.ai/keys
          </button>
        </p>
      </div>

      {/* ST-08: Model selector (only after verification) */}
      {isApiKeyVerified && (
        <div>
          <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">
            Model
          </label>
          <ModelSelector
            value={selectedModel}
            models={availableModels}
            onChange={(value) => updateSetting('selectedModel', value)}
          />
        </div>
      )}

      {/* ST-10: System prompt */}
      <div>
        <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">
          System Prompt
        </label>
        <SystemPromptEditor
          value={systemPrompt}
          onChange={(value) => updateSetting('systemPrompt', value)}
        />
        <p className="mt-1.5 text-xs text-text-secondary-light dark:text-text-secondary-dark">
          Customize how the AI assistant behaves
        </p>
      </div>
    </div>
  )
}
```

### 5.3 src/components/Settings/sections/EditorSection.tsx

```typescript
import { useSettingsStore } from '@/stores/settingsStore'
import ToggleSwitch from '../components/ToggleSwitch'

export default function EditorSection() {
  const lineNumbers = useSettingsStore((s) => s.lineNumbers)
  const wordWrap = useSettingsStore((s) => s.wordWrap)
  const spellCheck = useSettingsStore((s) => s.spellCheck)
  const updateSetting = useSettingsStore((s) => s.updateSetting)

  return (
    <div className="space-y-4">
      {/* ST-11: Line numbers */}
      <ToggleSwitch
        label="Line Numbers"
        description="Show line numbers in the editor"
        checked={lineNumbers}
        onChange={(value) => updateSetting('lineNumbers', value)}
      />

      {/* ST-12: Word wrap */}
      <ToggleSwitch
        label="Word Wrap"
        description="Wrap long lines to fit the editor width"
        checked={wordWrap}
        onChange={(value) => updateSetting('wordWrap', value)}
      />

      {/* ST-13: Spell check (P2) */}
      <ToggleSwitch
        label="Spell Check"
        description="Highlight spelling errors in the editor"
        checked={spellCheck}
        onChange={(value) => updateSetting('spellCheck', value)}
      />
    </div>
  )
}
```

### 5.4 src/components/Settings/sections/AboutSection.tsx

```typescript
import { useState, useEffect } from 'react'

export default function AboutSection() {
  const [appVersion, setAppVersion] = useState('1.0.0')

  useEffect(() => {
    // Could fetch from main process if needed
    // For now, this would be set at build time
  }, [])

  return (
    <div className="flex flex-col items-center text-center py-8">
      {/* App icon */}
      <div className="w-24 h-24 mb-4">
        <img
          src="./icon.png"
          alt="Marxist"
          className="w-full h-full rounded-2xl shadow-lg"
        />
      </div>

      <h3 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-1">
        Marxist
      </h3>
      
      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
        Version {appVersion}
      </p>

      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark max-w-sm">
        A beautiful Markdown editor for macOS with AI-powered assistance.
      </p>

      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 w-full">
        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
          Built with Electron, React, and CodeMirror
        </p>
      </div>
    </div>
  )
}
```

---

## 6. Control Components

### 6.1 src/components/Settings/components/ThemeToggle.tsx

```typescript
interface ThemeToggleProps {
  value: 'system' | 'light' | 'dark'
  onChange: (value: 'system' | 'light' | 'dark') => void
}

const options: Array<{ value: 'system' | 'light' | 'dark'; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export default function ThemeToggle({ value, onChange }: ThemeToggleProps) {
  return (
    <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all
            ${value === option.value
              ? 'bg-white dark:bg-gray-700 text-text-primary-light dark:text-text-primary-dark shadow-sm'
              : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark'
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
```

### 6.2 src/components/Settings/components/FontSizeSlider.tsx

```typescript
interface FontSizeSliderProps {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}

export default function FontSizeSlider({ value, min, max, onChange }: FontSizeSliderProps) {
  return (
    <div className="flex items-center gap-4">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="
          flex-1 h-2 rounded-full appearance-none cursor-pointer
          bg-gray-200 dark:bg-gray-700
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-accent
          [&::-webkit-slider-thumb]:dark:bg-accent-dark
          [&::-webkit-slider-thumb]:cursor-pointer
        "
      />
      <span className="w-12 text-right text-sm font-mono text-text-secondary-light dark:text-text-secondary-dark">
        {value}px
      </span>
    </div>
  )
}
```

### 6.3 src/components/Settings/components/APIKeyInput.tsx

```typescript
import { useState } from 'react'
import Icon from '@/components/common/Icon'

interface APIKeyInputProps {
  value: string
  onChange: (value: string) => void
  onVerify: () => void
  isVerifying: boolean
  isVerified: boolean
  error: string | null
}

export default function APIKeyInput({
  value,
  onChange,
  onVerify,
  isVerifying,
  isVerified,
  error,
}: APIKeyInputProps) {
  const [showKey, setShowKey] = useState(false)

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="sk-or-v1-..."
            className={`
              w-full px-3 py-2 pr-10
              rounded-lg border
              bg-white dark:bg-gray-800
              text-text-primary-light dark:text-text-primary-dark
              placeholder-gray-400
              focus:outline-none focus:ring-2
              ${error
                ? 'border-red-500 focus:ring-red-500/20'
                : isVerified
                ? 'border-green-500 focus:ring-green-500/20'
                : 'border-gray-300 dark:border-gray-600 focus:ring-accent/20 dark:focus:ring-accent-dark/20'
              }
            `}
          />
          {/* ST-06: Visibility toggle */}
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark"
          >
            <Icon name={showKey ? 'visibility_off' : 'visibility'} size={18} />
          </button>
        </div>
        
        {/* ST-07: Verify button */}
        <button
          onClick={onVerify}
          disabled={isVerifying || !value.trim()}
          className={`
            px-4 py-2 rounded-lg font-medium text-sm
            transition-colors
            ${isVerifying || !value.trim()
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              : isVerified
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-accent dark:bg-accent-dark text-white hover:opacity-90'
            }
          `}
        >
          {isVerifying ? (
            <span className="flex items-center gap-2">
              <Icon name="sync" size={16} className="animate-spin" />
              Verifying
            </span>
          ) : isVerified ? (
            <span className="flex items-center gap-2">
              <Icon name="check_circle" size={16} />
              Verified
            </span>
          ) : (
            'Verify'
          )}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
```

### 6.4 src/components/Settings/components/ModelSelector.tsx

```typescript
import { useState, useMemo, useRef, useEffect } from 'react'
import Icon from '@/components/common/Icon'

interface Model {
  id: string
  name: string
  contextLength: number
}

interface ModelSelectorProps {
  value: string
  models: Model[]
  onChange: (value: string) => void
}

export default function ModelSelector({ value, models, onChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ST-08: Searchable dropdown
  const filteredModels = useMemo(() => {
    if (!search.trim()) return models
    const query = search.toLowerCase()
    return models.filter(
      (m) => m.id.toLowerCase().includes(query) || m.name.toLowerCase().includes(query)
    )
  }, [models, search])

  const selectedModel = models.find((m) => m.id === value)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (modelId: string) => {
    onChange(modelId)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          w-full flex items-center justify-between px-3 py-2
          rounded-lg border border-gray-300 dark:border-gray-600
          bg-white dark:bg-gray-800
          text-text-primary-light dark:text-text-primary-dark
          hover:border-gray-400 dark:hover:border-gray-500
          transition-colors
        "
      >
        <span className="truncate">
          {selectedModel?.name || selectedModel?.id || 'Select a model'}
        </span>
        <Icon name="expand_more" size={20} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="
          absolute z-10 mt-1 w-full
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          rounded-lg shadow-lg
          overflow-hidden
        ">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Icon
                name="search"
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary-light dark:text-text-secondary-dark"
              />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search models..."
                className="
                  w-full pl-9 pr-3 py-2
                  rounded-md border border-gray-200 dark:border-gray-600
                  bg-gray-50 dark:bg-gray-900
                  text-sm text-text-primary-light dark:text-text-primary-dark
                  placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-accent/20
                "
              />
            </div>
          </div>

          {/* Model list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredModels.length === 0 ? (
              <div className="px-4 py-3 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                No models found
              </div>
            ) : (
              filteredModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleSelect(model.id)}
                  className={`
                    w-full px-4 py-2 text-left text-sm
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    transition-colors
                    ${model.id === value ? 'bg-accent/10 dark:bg-accent-dark/10' : ''}
                  `}
                >
                  <div className="font-medium text-text-primary-light dark:text-text-primary-dark truncate">
                    {model.name || model.id}
                  </div>
                  <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-0.5">
                    {model.id} • {(model.contextLength / 1000).toFixed(0)}k context
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

### 6.5 src/components/Settings/components/SystemPromptEditor.tsx

```typescript
interface SystemPromptEditorProps {
  value: string
  onChange: (value: string) => void
}

export default function SystemPromptEditor({ value, onChange }: SystemPromptEditorProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={6}
      className="
        w-full px-3 py-2
        rounded-lg border border-gray-300 dark:border-gray-600
        bg-white dark:bg-gray-800
        text-sm text-text-primary-light dark:text-text-primary-dark
        placeholder-gray-400
        resize-y min-h-[120px]
        focus:outline-none focus:ring-2 focus:ring-accent/20 dark:focus:ring-accent-dark/20
        focus:border-accent dark:focus:border-accent-dark
      "
      placeholder="Enter system prompt..."
    />
  )
}
```

### 6.6 src/components/Settings/components/ToggleSwitch.tsx

```typescript
interface ToggleSwitchProps {
  label: string
  description?: string
  checked: boolean
  onChange: (value: boolean) => void
}

export default function ToggleSwitch({ label, description, checked, onChange }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
          {label}
        </div>
        {description && (
          <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-0.5">
            {description}
          </div>
        )}
      </div>
      
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative w-11 h-6 rounded-full transition-colors
          ${checked
            ? 'bg-accent dark:bg-accent-dark'
            : 'bg-gray-300 dark:bg-gray-600'
          }
        `}
      >
        <span
          className={`
            absolute top-1 left-1 w-4 h-4
            bg-white rounded-full shadow
            transition-transform
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  )
}
```

---

## 7. Update AI Handlers (Main Process)

**Important:** These handlers make network requests to OpenRouter's API from the main process. This follows NF-07: "AI API calls from main process only (never renderer)".

### 7.1 electron/main/ipc/ai-handlers.ts

```typescript
import { ipcMain } from 'electron'
import { getSettings } from './settings-handlers'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1'

export function registerAiHandlers(): void {
  // ST-07: Verify API key
  // Uses OpenRouter's /api/v1/key endpoint to validate the key
  ipcMain.handle('ai:verify-key', async (_, apiKey: string) => {
    try {
      const response = await fetch(`${OPENROUTER_API_URL}/key`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://marxist.app',
          'X-Title': 'Marxist',
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          return { valid: false, error: 'Invalid API key' }
        }
        const error = await response.json().catch(() => ({}))
        return {
          valid: false,
          error: error.message || `HTTP ${response.status}`,
        }
      }

      // Key is valid - response includes usage data we can ignore
      return { valid: true }
    } catch (error) {
      return {
        valid: false,
        error: (error as Error).message,
      }
    }
  })

  // ST-08: List available models
  ipcMain.handle('ai:list-models', async () => {
    const settings = getSettings()
    const apiKey = settings.openRouterApiKey

    if (!apiKey) {
      return { error: 'No API key configured' }
    }

    try {
      const response = await fetch(`${OPENROUTER_API_URL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://marxist.app',
          'X-Title': 'Marxist',
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        return { error: error.message || `HTTP ${response.status}` }
      }

      const data = await response.json()
      
      // Map to simplified model format
      const models = (data.data || []).map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        contextLength: model.context_length || 4096,
      }))

      // Sort by name
      models.sort((a: any, b: any) => a.name.localeCompare(b.name))

      return { models }
    } catch (error) {
      return { error: (error as Error).message }
    }
  })

  // Chat and edit handlers - implemented in Stage 9
  ipcMain.handle('ai:chat', async () => {
    return { error: 'AI chat not yet implemented' }
  })

  ipcMain.handle('ai:edit', async () => {
    return { error: 'AI edit not yet implemented' }
  })

  ipcMain.handle('ai:cancel', async () => {
    return { success: true }
  })
}
```

---

## 8. Update Menu for Settings

### 8.1 electron/main/menu.ts (additions)

Add to the menu template (typically in the app menu on macOS):

```typescript
// In the app menu (first menu on macOS)
{
  label: app.name,
  submenu: [
    { role: 'about' },
    { type: 'separator' },
    {
      label: 'Settings...',
      accelerator: 'CmdOrCtrl+,',
      click: () => mainWindow.webContents.send('menu:settings')
    },
    { type: 'separator' },
    { role: 'services' },
    { type: 'separator' },
    { role: 'hide' },
    { role: 'hideOthers' },
    { role: 'unhide' },
    { type: 'separator' },
    { role: 'quit' }
  ]
}
```

---

## 9. Update App.tsx

### 9.1 src/App.tsx (additions)

```typescript
import SettingsModal from './components/Settings/SettingsModal'
import { useSettingsStore } from './stores/settingsStore'

// In App component:
const openSettingsModal = useSettingsStore((s) => s.openModal)
const settingsTheme = useSettingsStore((s) => s.theme)
const updateSetting = useSettingsStore((s) => s.updateSetting)

// Resolve theme from settings
useEffect(() => {
  if (settingsTheme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setTheme(prefersDark ? 'dark' : 'light')
  } else {
    setTheme(settingsTheme)
  }
}, [settingsTheme])

// TH-03: Theme toggle function for ⌘⇧D
const cycleTheme = useCallback(() => {
  const themes: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark']
  const currentIndex = themes.indexOf(settingsTheme)
  const nextTheme = themes[(currentIndex + 1) % themes.length]
  updateSetting('theme', nextTheme)
}, [settingsTheme, updateSetting])

// In useEffect for menu events:
const unsubSettings = window.electron.onMenuEvent('menu:settings', openSettingsModal)

// TH-03: Toggle theme via ⌘⇧D
const unsubToggleTheme = window.electron.onMenuEvent('menu:toggle-theme', cycleTheme)

// In cleanup:
unsubSettings()
unsubToggleTheme()

// In return, add modal:
return (
  <div className={`h-screen flex flex-col ${isDark ? 'dark' : ''}`}>
    <TopBar ... />
    <main className="flex-1 overflow-hidden">
      <MainContent ... />
    </main>
    <SettingsModal />
  </div>
)
```

---

## 10. Update Preload Types

### 10.1 electron/preload/types.ts (additions)

```typescript
export interface AIVerifyResult {
  valid: boolean
  error?: string
}

export interface AIModelsResult {
  models?: Array<{
    id: string
    name: string
    contextLength: number
  }>
  error?: string
}

export interface ElectronAPI {
  // ... existing methods ...
  
  ai: {
    verifyKey: (key: string) => Promise<AIVerifyResult>
    listModels: () => Promise<AIModelsResult>
    chat: (params: unknown) => Promise<unknown>
    edit: (params: unknown) => Promise<unknown>
    cancel: () => Promise<{ success: boolean }>
  }
  
  // Add 'menu:settings' to valid channels
}
```

### 10.2 electron/preload/index.ts (update onMenuEvent)

```typescript
onMenuEvent: (channel: string, callback: () => void) => {
  const validChannels = [
    'menu:new-file', 'menu:open-file', 'menu:save', 'menu:save-as',
    'menu:find', 'menu:settings', 'menu:about',
    'menu:view-markdown', 'menu:view-split', 'menu:view-render',
    'menu:toggle-sidebar', 'menu:toggle-ai', 'menu:toggle-theme'
  ]
  // ...
}
```

---

## 11. Testing

### 11.1 tests/components/SettingsModal.test.tsx

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SettingsModal from '@/components/Settings/SettingsModal'
import { useSettingsStore } from '@/stores/settingsStore'

describe('SettingsModal', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      isModalOpen: true,
      activeTab: 'appearance',
      theme: 'system',
      editorFontSize: 14,
      previewFontSize: 16,
    })
  })

  it('renders when open (ST-02)', () => {
    render(<SettingsModal />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes on Escape key', () => {
    render(<SettingsModal />)
    
    fireEvent.keyDown(window, { key: 'Escape' })
    
    expect(useSettingsStore.getState().isModalOpen).toBe(false)
  })

  it('closes on backdrop click', () => {
    render(<SettingsModal />)
    
    fireEvent.click(screen.getByRole('dialog'))
    
    expect(useSettingsStore.getState().isModalOpen).toBe(false)
  })

  it('has 560px width (ST-02)', () => {
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
})
```

### 11.2 tests/components/ThemeToggle.test.tsx

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ThemeToggle from '@/components/Settings/components/ThemeToggle'

describe('ThemeToggle', () => {
  it('renders all theme options (ST-03, TH-01)', () => {
    render(<ThemeToggle value="system" onChange={vi.fn()} />)
    
    expect(screen.getByText('System')).toBeInTheDocument()
    expect(screen.getByText('Light')).toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
  })

  it('highlights active option', () => {
    render(<ThemeToggle value="dark" onChange={vi.fn()} />)
    
    const darkButton = screen.getByText('Dark')
    expect(darkButton).toHaveClass('bg-white', 'shadow-sm')
  })

  it('calls onChange when option clicked', () => {
    const onChange = vi.fn()
    render(<ThemeToggle value="system" onChange={onChange} />)
    
    fireEvent.click(screen.getByText('Light'))
    
    expect(onChange).toHaveBeenCalledWith('light')
  })
})
```

### 11.3 tests/components/APIKeyInput.test.tsx

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import APIKeyInput from '@/components/Settings/components/APIKeyInput'

describe('APIKeyInput', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onVerify: vi.fn(),
    isVerifying: false,
    isVerified: false,
    error: null,
  }

  it('renders password input by default (ST-06)', () => {
    render(<APIKeyInput {...defaultProps} value="sk-test" />)
    
    const input = screen.getByPlaceholderText('sk-or-v1-...')
    expect(input).toHaveAttribute('type', 'password')
  })

  it('toggles visibility (ST-06)', () => {
    render(<APIKeyInput {...defaultProps} value="sk-test" />)
    
    const input = screen.getByPlaceholderText('sk-or-v1-...')
    const toggle = screen.getByRole('button', { name: /visibility/i })
    
    fireEvent.click(toggle)
    expect(input).toHaveAttribute('type', 'text')
    
    fireEvent.click(toggle)
    expect(input).toHaveAttribute('type', 'password')
  })

  it('shows Verify button (ST-07)', () => {
    render(<APIKeyInput {...defaultProps} value="sk-test" />)
    expect(screen.getByText('Verify')).toBeInTheDocument()
  })

  it('disables Verify when empty', () => {
    render(<APIKeyInput {...defaultProps} />)
    
    const button = screen.getByText('Verify')
    expect(button).toBeDisabled()
  })

  it('shows verifying state', () => {
    render(<APIKeyInput {...defaultProps} isVerifying={true} value="sk-test" />)
    expect(screen.getByText('Verifying')).toBeInTheDocument()
  })

  it('shows verified state', () => {
    render(<APIKeyInput {...defaultProps} isVerified={true} value="sk-test" />)
    expect(screen.getByText('Verified')).toBeInTheDocument()
  })

  it('shows error message', () => {
    render(<APIKeyInput {...defaultProps} error="Invalid key" value="sk-test" />)
    expect(screen.getByText('Invalid key')).toBeInTheDocument()
  })
})
```

### 11.4 tests/e2e/settings.spec.ts

```typescript
import { test, expect, _electron as electron } from '@playwright/test'
import { resolve } from 'path'

test.describe('Settings Modal', () => {
  test('opens with ⌘, (ST-01)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('.cm-editor')

    await window.keyboard.press('Meta+,')
    
    await expect(window.locator('[role="dialog"]')).toBeVisible()
    await expect(window.locator('text=Settings')).toBeVisible()

    await electronApp.close()
  })

  test('closes with Escape', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('.cm-editor')

    await window.keyboard.press('Meta+,')
    await expect(window.locator('[role="dialog"]')).toBeVisible()

    await window.keyboard.press('Escape')
    await expect(window.locator('[role="dialog"]')).not.toBeVisible()

    await electronApp.close()
  })

  test('theme toggle works (ST-03)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('.cm-editor')

    await window.keyboard.press('Meta+,')
    
    // Click Dark theme
    await window.click('text=Dark')
    
    // App should have dark class
    const html = await window.$('div.h-screen')
    const classes = await html?.getAttribute('class')
    expect(classes).toContain('dark')

    await electronApp.close()
  })

  test('all tabs are accessible', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.keyboard.press('Meta+,')

    // Check each tab
    await window.click('text=Appearance')
    await expect(window.locator('text=Theme')).toBeVisible()

    await window.click('text=AI')
    await expect(window.locator('text=OpenRouter API Key')).toBeVisible()

    await window.click('text=Editor')
    await expect(window.locator('text=Line Numbers')).toBeVisible()

    await window.click('text=About')
    await expect(window.locator('text=Marxist')).toBeVisible()

    await electronApp.close()
  })
})
```

---

## 12. Acceptance Criteria

### 12.1 P0 Requirements Checklist

- [ ] Modal opens via ⌘, (ST-01)
- [ ] Modal is 560px wide, centered (ST-02)
- [ ] Theme toggle with System/Light/Dark (ST-03)
- [ ] API key input with password field (ST-06)
- [ ] Visibility toggle for API key (ST-06)
- [ ] Verify button tests key against OpenRouter (ST-07)
- [ ] Searchable model dropdown after verification (ST-08)
- [ ] Selected model persists (ST-09)
- [ ] System prompt text area with default (ST-10)
- [ ] Settings persisted via electron-store (ST-15)

### 12.2 P1 Requirements Checklist

- [ ] Editor font size control (ST-04)
- [ ] Preview font size control (ST-05)
- [ ] Line numbers toggle (ST-11)
- [ ] Word wrap toggle (ST-12)

### 12.3 P2 Requirements Checklist

- [ ] Spell check toggle (ST-13)
- [ ] About section with version (ST-14)

---

## 13. Output for Next Stage

This stage produces:

1. **SettingsModal** - Complete settings UI
2. **settingsStore** - Settings state management
3. **AI verification** - OpenRouter key validation
4. **Model listing** - Available models from OpenRouter API

Stage 09 will consume:
- Verified API key for chat/edit operations
- Selected model ID
- System prompt configuration
