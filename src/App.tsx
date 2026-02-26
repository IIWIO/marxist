import { useEffect, useState, useRef, useCallback } from 'react'
import TopBar from './components/TopBar/TopBar'
import MainContent from './components/Layout/MainContent'
import { SettingsModal } from './components/Settings'
import { AIPanel } from './components/AI'
import { useViewStore } from './stores/viewStore'
import { useEditorStore, selectActiveTab, selectWordCount, selectLetterCount } from './stores/editorStore'
import { useFileStore } from './stores/fileStore'
import { useSettingsStore } from './stores/settingsStore'
import { useWindowSize } from './hooks/useWindowSize'
import { useViewKeyboardShortcuts } from './hooks/useViewKeyboardShortcuts'
import { useFileOperations } from './hooks/useFileOperations'
import { useDragAndDrop } from './hooks/useDragAndDrop'
import { useSessionRestore } from './hooks/useSessionRestore'
import { useAutoSave } from './hooks/useAutoSave'
import { useQuitHandler } from './hooks/useQuitHandler'
import type { EditorRef } from './types/editor'

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [editorSettings, setEditorSettings] = useState({
    fontSize: 14,
    lineNumbers: false,
    wordWrap: true,
  })

  const editorRef = useRef<EditorRef | null>(null)
  const windowWidth = useViewStore((state) => state.windowWidth)
  const activeTab = useEditorStore(selectActiveTab)
  const wordCount = useEditorStore(selectWordCount)
  const letterCount = useEditorStore(selectLetterCount)
  const loadRecentFiles = useFileStore((state) => state.loadRecentFiles)

  const openSettingsModal = useSettingsStore((s) => s.openModal)
  const settingsTheme = useSettingsStore((s) => s.theme)
  const settingsEditorFontSize = useSettingsStore((s) => s.editorFontSize)
  const settingsLineNumbers = useSettingsStore((s) => s.lineNumbers)
  const settingsWordWrap = useSettingsStore((s) => s.wordWrap)
  const updateSetting = useSettingsStore((s) => s.updateSetting)
  const loadSettings = useSettingsStore((s) => s.loadSettings)

  const { createNewFile, openFile, saveFile, saveFileAs } = useFileOperations()

  const cycleTheme = useCallback(() => {
    const themes: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark']
    const currentIndex = themes.indexOf(settingsTheme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    updateSetting('theme', nextTheme)
  }, [settingsTheme, updateSetting])

  const { isRestoring, isRestored } = useSessionRestore()

  useAutoSave(isRestored)

  useQuitHandler()

  useWindowSize()
  useViewKeyboardShortcuts()
  useDragAndDrop()

  useEffect(() => {
    loadSettings()

    window.electron.settings.get().then((loadedSettings) => {
      if (loadedSettings.recentFiles) {
        loadRecentFiles(loadedSettings.recentFiles)
      }
    })
  }, [loadSettings, loadRecentFiles])

  useEffect(() => {
    if (settingsTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(prefersDark ? 'dark' : 'light')
    } else {
      setTheme(settingsTheme)
    }

    setEditorSettings({
      fontSize: settingsEditorFontSize,
      lineNumbers: settingsLineNumbers,
      wordWrap: settingsWordWrap,
    })
  }, [settingsTheme, settingsEditorFontSize, settingsLineNumbers, settingsWordWrap])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleThemeChange = (e: MediaQueryListEvent) => {
      if (settingsTheme === 'system') {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }
    mediaQuery.addEventListener('change', handleThemeChange)

    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange)
    }
  }, [settingsTheme])

  useEffect(() => {
    const unsubNewFile = window.electron.onMenuEvent('menu:new-file', createNewFile)
    const unsubOpenFile = window.electron.onMenuEvent('menu:open-file', openFile)
    const unsubSave = window.electron.onMenuEvent('menu:save', saveFile)
    const unsubSaveAs = window.electron.onMenuEvent('menu:save-as', saveFileAs)

    const unsubMarkdown = window.electron.onMenuEvent('menu:view-markdown', () => {
      useViewStore.getState().setActiveView('markdown')
    })
    const unsubSplit = window.electron.onMenuEvent('menu:view-split', () => {
      useViewStore.getState().setActiveView('split')
    })
    const unsubRender = window.electron.onMenuEvent('menu:view-render', () => {
      useViewStore.getState().setActiveView('render')
    })
    const unsubToggleSidebar = window.electron.onMenuEvent('menu:toggle-sidebar', () => {
      useViewStore.getState().toggleSidebar()
    })
    const unsubToggleAi = window.electron.onMenuEvent('menu:toggle-ai', () => {
      useViewStore.getState().toggleAiPanel()
    })
    const unsubFind = window.electron.onMenuEvent('menu:find', () => {
      editorRef.current?.focus()
    })
    const unsubSettings = window.electron.onMenuEvent('menu:settings', openSettingsModal)
    const unsubToggleTheme = window.electron.onMenuEvent('menu:toggle-theme', cycleTheme)

    return () => {
      unsubNewFile()
      unsubOpenFile()
      unsubSave()
      unsubSaveAs()
      unsubMarkdown()
      unsubSplit()
      unsubRender()
      unsubToggleSidebar()
      unsubToggleAi()
      unsubFind()
      unsubSettings()
      unsubToggleTheme()
    }
  }, [createNewFile, openFile, saveFile, saveFileAs, openSettingsModal, cycleTheme])

  const isDark = theme === 'dark'

  if (isRestoring) {
    return (
      <div className={`h-screen flex items-center justify-center ${isDark ? 'dark bg-editor-dark' : 'bg-editor-light'}`}>
        <div className="text-text-secondary-light dark:text-text-secondary-dark">
          Restoring session...
        </div>
      </div>
    )
  }

  return (
    <div className={`h-screen flex flex-col ${isDark ? 'dark' : ''}`}>
      <TopBar
        documentName={activeTab?.fileName || 'Untitled'}
        isDirty={activeTab?.isDirty || false}
        wordCount={wordCount}
        letterCount={letterCount}
        windowWidth={windowWidth}
        editorRef={editorRef}
      />
      <main className="flex-1 overflow-hidden">
        <MainContent
          isDark={isDark}
          fontSize={editorSettings.fontSize}
          lineNumbers={editorSettings.lineNumbers}
          wordWrap={editorSettings.wordWrap}
          editorRef={editorRef}
        />
      </main>
      <AIPanel />
      <SettingsModal />
    </div>
  )
}

export default App
