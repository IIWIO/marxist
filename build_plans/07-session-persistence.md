# Stage 07: Session Persistence

## Overview

Implement session state persistence and draft auto-save for crash recovery. This stage ensures the app silently preserves all user work on quit and fully restores it on launch, with no save prompts.

## Requirements Covered

### Session Persistence

| ID | Requirement | Priority |
|----|-------------|----------|
| SP-01 | On quit: **silent** — no save prompts | P0 |
| SP-02 | On quit: all unsaved tab contents saved to `~/Library/Application Support/Marxist/drafts/` | P0 |
| SP-03 | On quit: session state saved (open tabs, active tab, split ratio, view, sidebar/AI panel state) | P0 |
| SP-04 | On launch: full session restored including unsaved drafts | P0 |
| SP-05 | On launch: if no previous session, show one "Untitled" tab in split view | P0 |
| SP-06 | Draft files cleared when user saves that file | P0 |

## Dependencies from Stage 06

- editorStore with tabs Map
- fileStore with recentFiles
- viewStore with sidebarOpen, aiPanelOpen, activeView, splitRatio
- useFileOperations hook for save operations

---

## 1. Project Structure

```
electron/
├── main/
│   ├── ipc/
│   │   └── draft-handlers.ts      # UPDATE: Full implementation
│   ├── services/
│   │   └── sessionService.ts      # NEW: Session state management
│   └── index.ts                   # UPDATE: Quit handling
src/
├── hooks/
│   ├── useSessionRestore.ts       # NEW: Session restoration hook
│   └── useAutoSave.ts             # NEW: Periodic draft saving (crash safety)
└── types/
    └── session.ts                 # NEW: Session-related types
```

---

## 2. Type Definitions

### 2.1 src/types/session.ts

```typescript
export interface DraftMetadata {
  tabId: string
  filePath: string | null
  fileName: string
  isDirty: boolean
  cursorPosition: number
  scrollPosition: number
  createdAt: string           // ISO timestamp
}

export interface SessionState {
  // Tab state
  openTabIds: string[]        // Ordered list
  activeTabId: string | null
  untitledCounter: number
  
  // View state
  activeView: 'markdown' | 'split' | 'render'
  splitRatio: number
  sidebarOpen: boolean
  aiPanelOpen: boolean
  
  // Metadata
  savedAt: string             // ISO timestamp
  appVersion: string
}

export interface DraftFile {
  content: string
  metadata: DraftMetadata
}

export interface RestoreResult {
  success: boolean
  tabs: Array<{
    tabId: string
    filePath: string | null
    fileName: string
    content: string
    isDirty: boolean
    cursorPosition: number
    scrollPosition: number
  }>
  session: SessionState | null
  error?: string
}
```

---

## 3. Session Service (Main Process)

### 3.1 electron/main/services/sessionService.ts

```typescript
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync, rmSync } from 'fs'
import type { DraftMetadata, SessionState, RestoreResult } from '../../src/types/session'

const APP_DATA_PATH = app.getPath('userData')
const DRAFTS_PATH = join(APP_DATA_PATH, 'drafts')
const SESSION_FILE = join(APP_DATA_PATH, 'session.json')

// Ensure drafts directory exists
function ensureDraftsDir(): void {
  if (!existsSync(DRAFTS_PATH)) {
    mkdirSync(DRAFTS_PATH, { recursive: true })
  }
}

/**
 * Save a single draft file (content + metadata)
 * SP-02: Save unsaved tab contents to drafts folder
 */
export function saveDraft(
  tabId: string,
  content: string,
  metadata: Omit<DraftMetadata, 'tabId' | 'createdAt'>
): void {
  ensureDraftsDir()
  
  const contentPath = join(DRAFTS_PATH, `${tabId}.md`)
  const metadataPath = join(DRAFTS_PATH, `${tabId}.json`)
  
  const fullMetadata: DraftMetadata = {
    ...metadata,
    tabId,
    createdAt: new Date().toISOString(),
  }
  
  writeFileSync(contentPath, content, 'utf-8')
  writeFileSync(metadataPath, JSON.stringify(fullMetadata, null, 2), 'utf-8')
}

/**
 * Save all drafts at once (used on quit)
 */
export function saveAllDrafts(
  drafts: Array<{
    tabId: string
    content: string
    filePath: string | null
    fileName: string
    isDirty: boolean
    cursorPosition: number
    scrollPosition: number
  }>
): void {
  ensureDraftsDir()
  
  // Clear existing drafts first
  clearAllDrafts()
  
  for (const draft of drafts) {
    saveDraft(draft.tabId, draft.content, {
      filePath: draft.filePath,
      fileName: draft.fileName,
      isDirty: draft.isDirty,
      cursorPosition: draft.cursorPosition,
      scrollPosition: draft.scrollPosition,
    })
  }
}

/**
 * Clear a single draft (SP-06: cleared when user saves)
 */
export function clearDraft(tabId: string): void {
  const contentPath = join(DRAFTS_PATH, `${tabId}.md`)
  const metadataPath = join(DRAFTS_PATH, `${tabId}.json`)
  
  try {
    if (existsSync(contentPath)) unlinkSync(contentPath)
    if (existsSync(metadataPath)) unlinkSync(metadataPath)
  } catch (error) {
    console.error(`Failed to clear draft ${tabId}:`, error)
  }
}

/**
 * Clear all drafts
 */
export function clearAllDrafts(): void {
  if (!existsSync(DRAFTS_PATH)) return
  
  try {
    rmSync(DRAFTS_PATH, { recursive: true, force: true })
    mkdirSync(DRAFTS_PATH, { recursive: true })
  } catch (error) {
    console.error('Failed to clear all drafts:', error)
  }
}

/**
 * Load all drafts from disk
 */
export function loadDrafts(): Array<{
  tabId: string
  content: string
  metadata: DraftMetadata
}> {
  ensureDraftsDir()
  
  const drafts: Array<{ tabId: string; content: string; metadata: DraftMetadata }> = []
  
  try {
    const files = readdirSync(DRAFTS_PATH)
    const metadataFiles = files.filter((f) => f.endsWith('.json'))
    
    for (const metaFile of metadataFiles) {
      const tabId = metaFile.replace('.json', '')
      const contentFile = `${tabId}.md`
      
      const metadataPath = join(DRAFTS_PATH, metaFile)
      const contentPath = join(DRAFTS_PATH, contentFile)
      
      if (!existsSync(contentPath)) continue
      
      try {
        const metadata: DraftMetadata = JSON.parse(readFileSync(metadataPath, 'utf-8'))
        const content = readFileSync(contentPath, 'utf-8')
        
        drafts.push({ tabId, content, metadata })
      } catch (error) {
        console.error(`Failed to load draft ${tabId}:`, error)
      }
    }
  } catch (error) {
    console.error('Failed to load drafts:', error)
  }
  
  return drafts
}

/**
 * Save session state (SP-03)
 */
export function saveSessionState(state: SessionState): void {
  try {
    writeFileSync(SESSION_FILE, JSON.stringify(state, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to save session state:', error)
  }
}

/**
 * Load session state (SP-04)
 */
export function loadSessionState(): SessionState | null {
  try {
    if (!existsSync(SESSION_FILE)) return null
    
    const data = readFileSync(SESSION_FILE, 'utf-8')
    return JSON.parse(data) as SessionState
  } catch (error) {
    console.error('Failed to load session state:', error)
    return null
  }
}

/**
 * Full restore (SP-04): Load drafts + session state
 */
export function restoreSession(): RestoreResult {
  try {
    const drafts = loadDrafts()
    const session = loadSessionState()
    
    if (drafts.length === 0 && !session) {
      return { success: true, tabs: [], session: null }
    }
    
    // Build tab list from drafts, ordered by session state
    const tabsMap = new Map(
      drafts.map((d) => [
        d.tabId,
        {
          tabId: d.tabId,
          filePath: d.metadata.filePath,
          fileName: d.metadata.fileName,
          content: d.content,
          isDirty: d.metadata.isDirty,
          cursorPosition: d.metadata.cursorPosition,
          scrollPosition: d.metadata.scrollPosition,
        },
      ])
    )
    
    // Order tabs according to session state
    let orderedTabs: typeof drafts extends Array<infer T> ? Array<{
      tabId: string
      filePath: string | null
      fileName: string
      content: string
      isDirty: boolean
      cursorPosition: number
      scrollPosition: number
    }> : never = []
    
    if (session?.openTabIds) {
      for (const tabId of session.openTabIds) {
        const tab = tabsMap.get(tabId)
        if (tab) {
          orderedTabs.push(tab)
          tabsMap.delete(tabId)
        }
      }
      // Add any remaining tabs not in session (shouldn't happen normally)
      orderedTabs.push(...tabsMap.values())
    } else {
      orderedTabs = Array.from(tabsMap.values())
    }
    
    return {
      success: true,
      tabs: orderedTabs,
      session,
    }
  } catch (error) {
    console.error('Failed to restore session:', error)
    return {
      success: false,
      tabs: [],
      session: null,
      error: (error as Error).message,
    }
  }
}

/**
 * Get app version for session metadata
 */
export function getAppVersion(): string {
  return app.getVersion()
}
```

---

## 4. Update Draft Handlers

### 4.1 electron/main/ipc/draft-handlers.ts

```typescript
import { ipcMain } from 'electron'
import {
  saveDraft,
  saveAllDrafts,
  clearDraft,
  clearAllDrafts,
  loadDrafts,
  saveSessionState,
  loadSessionState,
  restoreSession,
  getAppVersion,
} from '../services/sessionService'
import type { SessionState } from '../../../src/types/session'

export function registerDraftHandlers(): void {
  // Save single draft (for periodic auto-save)
  ipcMain.handle('drafts:save', async (_, tabId: string, content: string, metadata: unknown) => {
    try {
      saveDraft(tabId, content, metadata as any)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Save all drafts at once (SP-02: on quit)
  ipcMain.handle('drafts:save-all', async (_, drafts: unknown[]) => {
    try {
      saveAllDrafts(drafts as any[])
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Clear single draft (SP-06: when file is saved)
  ipcMain.handle('drafts:clear', async (_, tabId: string) => {
    try {
      clearDraft(tabId)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Clear all drafts
  ipcMain.handle('drafts:clear-all', async () => {
    try {
      clearAllDrafts()
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Restore session (SP-04: on launch)
  ipcMain.handle('drafts:restore', async () => {
    return restoreSession()
  })

  // Save session state (SP-03: on quit)
  ipcMain.handle('session:save', async (_, state: SessionState) => {
    try {
      saveSessionState({
        ...state,
        savedAt: new Date().toISOString(),
        appVersion: getAppVersion(),
      })
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Load session state
  ipcMain.handle('session:load', async () => {
    return loadSessionState()
  })
}
```

---

## 5. Update Preload Types

### 5.1 electron/preload/types.ts (additions)

```typescript
import type { DraftMetadata, SessionState, RestoreResult } from '../../src/types/session'

export interface ElectronAPI {
  // ... existing methods ...
  
  drafts: {
    save: (tabId: string, content: string, metadata: Omit<DraftMetadata, 'tabId' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>
    saveAll: (drafts: Array<{
      tabId: string
      content: string
      filePath: string | null
      fileName: string
      isDirty: boolean
      cursorPosition: number
      scrollPosition: number
    }>) => Promise<{ success: boolean; error?: string }>
    clear: (tabId: string) => Promise<{ success: boolean; error?: string }>
    clearAll: () => Promise<{ success: boolean; error?: string }>
    restore: () => Promise<RestoreResult>
  }
  
  session: {
    save: (state: Omit<SessionState, 'savedAt' | 'appVersion'>) => Promise<{ success: boolean; error?: string }>
    load: () => Promise<SessionState | null>
  }
}
```

### 5.2 electron/preload/index.ts (additions)

```typescript
const electronAPI: ElectronAPI = {
  // ... existing methods ...
  
  drafts: {
    save: (tabId, content, metadata) => ipcRenderer.invoke('drafts:save', tabId, content, metadata),
    saveAll: (drafts) => ipcRenderer.invoke('drafts:save-all', drafts),
    clear: (tabId) => ipcRenderer.invoke('drafts:clear', tabId),
    clearAll: () => ipcRenderer.invoke('drafts:clear-all'),
    restore: () => ipcRenderer.invoke('drafts:restore'),
  },
  
  session: {
    save: (state) => ipcRenderer.invoke('session:save', state),
    load: () => ipcRenderer.invoke('session:load'),
  },
}
```

---

## 6. Session Restore Hook

### 6.1 src/hooks/useSessionRestore.ts

**Note:** Requires `restoreTab` action added to editorStore (see 6.2 below).

```typescript
import { useEffect, useState } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { useViewStore } from '@/stores/viewStore'
import type { RestoreResult } from '@/types/session'

interface SessionRestoreState {
  isRestoring: boolean
  isRestored: boolean
  error: string | null
}

export function useSessionRestore(): SessionRestoreState {
  const [state, setState] = useState<SessionRestoreState>({
    isRestoring: true,
    isRestored: false,
    error: null,
  })

  const createTab = useEditorStore((s) => s.createTab)
  const restoreTab = useEditorStore((s) => s.restoreTab)
  const setActiveTab = useEditorStore((s) => s.setActiveTab)
  const setUntitledCounter = useEditorStore((s) => s.setUntitledCounter)
  
  const setActiveView = useViewStore((s) => s.setActiveView)
  const setSplitRatio = useViewStore((s) => s.setSplitRatio)

  useEffect(() => {
    async function restore() {
      try {
        const result: RestoreResult = await window.electron.drafts.restore()
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to restore session')
        }

        // SP-05: If no previous session, create one Untitled tab in split view
        if (result.tabs.length === 0) {
          createTab(null, '')
          setActiveView('split')
          setState({ isRestoring: false, isRestored: true, error: null })
          return
        }

        // Restore untitledCounter from session FIRST
        if (result.session?.untitledCounter) {
          setUntitledCounter(result.session.untitledCounter)
        }

        // Restore tabs using restoreTab to preserve names
        const tabIdMap = new Map<string, string>() // old ID -> new ID
        
        for (const tab of result.tabs) {
          // Use restoreTab to preserve the exact fileName
          const newTabId = restoreTab({
            filePath: tab.filePath,
            fileName: tab.fileName,
            content: tab.content,
            isDirty: tab.isDirty,
            cursorPosition: tab.cursorPosition,
            scrollPosition: tab.scrollPosition,
          })
          
          tabIdMap.set(tab.tabId, newTabId)
        }

        // Restore session state
        if (result.session) {
          // Set active tab
          const activeTabId = result.session.activeTabId
          if (activeTabId && tabIdMap.has(activeTabId)) {
            setActiveTab(tabIdMap.get(activeTabId)!)
          }
          
          // Restore view state
          setActiveView(result.session.activeView || 'split')
          
          if (result.session.splitRatio) {
            setSplitRatio(result.session.splitRatio)
          }
          
          // Note: sidebar and AI panel start closed by default per spec
          // The session state stores them but we don't restore them
          // per Flow 1: "Set sidebar closed, AI panel closed"
        }

        setState({ isRestoring: false, isRestored: true, error: null })
      } catch (error) {
        console.error('Session restore failed:', error)
        
        // Fallback: create one Untitled tab
        createTab(null, '')
        setActiveView('split')
        
        setState({
          isRestoring: false,
          isRestored: true,
          error: (error as Error).message,
        })
      }
    }

    restore()
  }, [])

  return state
}
```

### 6.2 Required editorStore additions (update to Stage 6)

Add these actions to `src/stores/editorStore.ts`:

```typescript
// Add to EditorStoreState interface:
restoreTab: (tab: {
  filePath: string | null
  fileName: string
  content: string
  isDirty: boolean
  cursorPosition: number
  scrollPosition: number
}) => string

setUntitledCounter: (counter: number) => void

// Add to the store implementation:
restoreTab: (tabData) => {
  const { tabs } = get()
  
  // Don't exceed MAX_TABS
  if (tabs.size >= MAX_TABS) {
    console.warn('Cannot restore tab: 20 tabs limit reached')
    return ''
  }

  const tabId = generateTabId()
  
  const newTab: TabState = {
    tabId,
    filePath: tabData.filePath,
    fileName: tabData.fileName,
    content: tabData.content,
    savedContent: tabData.isDirty ? '' : tabData.content, // If dirty, savedContent differs
    isDirty: tabData.isDirty,
    editorState: null,
    scrollPosition: tabData.scrollPosition,
    cursorPosition: tabData.cursorPosition,
    preEditSnapshot: null,
    isAIEditing: false,
    showDiff: false,
  }

  const newTabs = new Map(tabs)
  newTabs.set(tabId, newTab)

  set({
    tabs: newTabs,
    activeTabId: tabId,
    wordCount: calculateWordCount(tabData.content),
    letterCount: calculateLetterCount(tabData.content),
  })

  return tabId
},

setUntitledCounter: (counter) => {
  set({ untitledCounter: counter })
},
```

---

## 7. Auto-Save Hook (Crash Safety)

### 7.1 src/hooks/useAutoSave.ts

```typescript
import { useEffect, useRef } from 'react'
import { useEditorStore } from '@/stores/editorStore'

const AUTO_SAVE_INTERVAL = 30000 // 30 seconds

/**
 * Periodic draft saving as crash safety net (mentioned in notes)
 * "Unsaved content also written to drafts/ as a crash safety net"
 * 
 * @param enabled - Only start auto-save after session is restored
 */
export function useAutoSave(enabled: boolean): void {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled) return

    const saveDrafts = async () => {
      const { tabs } = useEditorStore.getState()
      
      if (tabs.size === 0) return

      const drafts = Array.from(tabs.values()).map((tab) => ({
        tabId: tab.tabId,
        content: tab.content,
        filePath: tab.filePath,
        fileName: tab.fileName,
        isDirty: tab.isDirty,
        cursorPosition: tab.cursorPosition,
        scrollPosition: tab.scrollPosition,
      }))

      try {
        await window.electron.drafts.saveAll(drafts)
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    }

    // Initial save after a short delay
    const initialTimeout = setTimeout(saveDrafts, 5000)
    
    // Periodic saves
    intervalRef.current = setInterval(saveDrafts, AUTO_SAVE_INTERVAL)

    return () => {
      clearTimeout(initialTimeout)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled])
}
```

---

## 8. Update Main Process (Quit Handling)

### 8.1 electron/main/index.ts (updates)

**Important:** Use IPC-based state collection instead of `executeJavaScript` for reliability. The renderer sends state to main process before quit.

```typescript
import { app, BrowserWindow, ipcMain } from 'electron'
import { createWindow } from './window'
import { registerIpcHandlers } from './ipc'
import { createMenu } from './menu'
import { saveAllDrafts, saveSessionState, getAppVersion } from './services/sessionService'

let mainWindow: BrowserWindow | null = null
let isQuitting = false

async function initialize() {
  registerIpcHandlers()
  mainWindow = await createWindow()
  createMenu(mainWindow)
}

app.whenReady().then(initialize)

// Handle state save from renderer before quit
ipcMain.handle('app:save-before-quit', async (_, data: {
  drafts: Array<{
    tabId: string
    content: string
    filePath: string | null
    fileName: string
    isDirty: boolean
    cursorPosition: number
    scrollPosition: number
  }>
  session: {
    openTabIds: string[]
    activeTabId: string | null
    untitledCounter: number
    activeView: 'markdown' | 'split' | 'render'
    splitRatio: number
    sidebarOpen: boolean
    aiPanelOpen: boolean
  }
}) => {
  try {
    // SP-02: Save all drafts
    saveAllDrafts(data.drafts)
    
    // SP-03: Save session state
    saveSessionState({
      ...data.session,
      savedAt: new Date().toISOString(),
      appVersion: getAppVersion(),
    })
    
    return { success: true }
  } catch (error) {
    console.error('Failed to save session:', error)
    return { success: false, error: (error as Error).message }
  }
})

// SP-01: Silent quit handling
app.on('before-quit', (event) => {
  if (!isQuitting && mainWindow) {
    event.preventDefault()
    isQuitting = true
    
    // Tell renderer to save state and then quit
    mainWindow.webContents.send('app:quit-requested')
    
    // Fallback: force quit after timeout if renderer doesn't respond
    setTimeout(() => {
      app.exit(0)
    }, 3000)
  }
})

// Renderer signals it's ready to quit
ipcMain.on('app:ready-to-quit', () => {
  app.exit(0)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = await createWindow()
    createMenu(mainWindow)
  }
})

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}
```

---

## 9. Quit Handler Hook

### 9.1 src/hooks/useQuitHandler.ts

```typescript
import { useEffect } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { useViewStore } from '@/stores/viewStore'

/**
 * Handles the quit sequence: saves state to main process, then signals ready to quit
 */
export function useQuitHandler(): void {
  useEffect(() => {
    const handleQuitRequest = async () => {
      const editorState = useEditorStore.getState()
      const viewState = useViewStore.getState()
      
      // Prepare state for persistence
      const drafts = Array.from(editorState.tabs.values()).map((tab) => ({
        tabId: tab.tabId,
        content: tab.content,
        filePath: tab.filePath,
        fileName: tab.fileName,
        isDirty: tab.isDirty,
        cursorPosition: tab.cursorPosition,
        scrollPosition: tab.scrollPosition,
      }))
      
      const session = {
        openTabIds: Array.from(editorState.tabs.keys()),
        activeTabId: editorState.activeTabId,
        untitledCounter: editorState.untitledCounter,
        activeView: viewState.activeView,
        splitRatio: viewState.splitRatio,
        sidebarOpen: viewState.sidebarOpen,
        aiPanelOpen: viewState.aiPanelOpen,
      }
      
      try {
        // Save state via IPC
        await window.electron.app.saveBeforeQuit({ drafts, session })
      } catch (error) {
        console.error('Failed to save before quit:', error)
      }
      
      // Signal ready to quit
      window.electron.app.readyToQuit()
    }

    const unsubscribe = window.electron.onAppEvent('app:quit-requested', handleQuitRequest)

    return () => {
      unsubscribe()
    }
  }, [])
}
```

### 9.2 Update Preload (additions)

```typescript
// In electron/preload/index.ts
const electronAPI: ElectronAPI = {
  // ... existing methods ...
  
  app: {
    saveBeforeQuit: (data) => ipcRenderer.invoke('app:save-before-quit', data),
    readyToQuit: () => ipcRenderer.send('app:ready-to-quit'),
  },
  
  onAppEvent: (channel: string, callback: () => void) => {
    const validChannels = ['app:quit-requested']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback)
      return () => ipcRenderer.removeListener(channel, callback)
    }
    return () => {}
  },
}
```

### 9.3 Update Preload Types

```typescript
// In electron/preload/types.ts
export interface ElectronAPI {
  // ... existing methods ...
  
  app: {
    saveBeforeQuit: (data: {
      drafts: Array<{
        tabId: string
        content: string
        filePath: string | null
        fileName: string
        isDirty: boolean
        cursorPosition: number
        scrollPosition: number
      }>
      session: {
        openTabIds: string[]
        activeTabId: string | null
        untitledCounter: number
        activeView: 'markdown' | 'split' | 'render'
        splitRatio: number
        sidebarOpen: boolean
        aiPanelOpen: boolean
      }
    }) => Promise<{ success: boolean; error?: string }>
    readyToQuit: () => void
  }
  
  onAppEvent: (channel: string, callback: () => void) => () => void
}
```

---

## 10. Update useFileOperations (Clear Draft on Save)

### 10.1 src/hooks/useFileOperations.ts (update)

Add draft clearing after successful save (SP-06):

```typescript
// In saveFile function, after successful save:
const saveFile = useCallback(async (): Promise<boolean> => {
  const activeTab = getActiveTab()
  if (!activeTab) return false

  try {
    if (activeTab.filePath) {
      const result = await window.electron.file.save(
        activeTab.filePath,
        activeTab.content
      )
      
      if (result.success) {
        markTabSaved(activeTab.tabId)
        
        // SP-06: Clear draft when file is saved
        await window.electron.drafts.clear(activeTab.tabId)
        
        return true
      }
      
      return false
    } else {
      return await saveFileAs()
    }
  } catch (error) {
    console.error('Failed to save file:', error)
    return false
  }
}, [getActiveTab, markTabSaved])

// In saveFileAs function, after successful save:
const saveFileAs = useCallback(async (): Promise<boolean> => {
  const activeTab = getActiveTab()
  if (!activeTab) return false

  try {
    const result = await window.electron.file.saveAs(activeTab.content)
    
    if (result.path) {
      markTabSaved(activeTab.tabId, result.path, result.name)
      addRecentFile(result.path, result.name || 'Untitled')
      
      // SP-06: Clear draft when file is saved
      await window.electron.drafts.clear(activeTab.tabId)
      
      return true
    }
    
    return false
  } catch (error) {
    console.error('Failed to save file as:', error)
    return false
  }
}, [getActiveTab, markTabSaved, addRecentFile])
```

---

## 11. Update App.tsx

### 11.1 src/App.tsx (updates)

```typescript
import { useEffect, useState, useRef } from 'react'
import TopBar from './components/TopBar/TopBar'
import MainContent from './components/Layout/MainContent'
import { useViewStore, selectActiveView } from './stores/viewStore'
import { useEditorStore, selectActiveTab, selectWordCount, selectLetterCount } from './stores/editorStore'
import { useFileStore } from './stores/fileStore'
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
  const [settings, setSettings] = useState({
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
  
  const { createNewFile, openFile, saveFile, saveFileAs } = useFileOperations()
  
  // Session restoration (SP-04)
  const { isRestoring, isRestored, error: restoreError } = useSessionRestore()
  
  // Crash safety net auto-save (only after session restored)
  useAutoSave(isRestored)
  
  // Handle quit sequence (SP-01, SP-02, SP-03)
  useQuitHandler()
  
  useWindowSize()
  useViewKeyboardShortcuts()
  useDragAndDrop()

  useEffect(() => {
    // Load settings
    window.electron.settings.get().then((loadedSettings) => {
      if (loadedSettings.theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        setTheme(prefersDark ? 'dark' : 'light')
      } else {
        setTheme(loadedSettings.theme)
      }
      
      setSettings({
        fontSize: loadedSettings.editorFontSize,
        lineNumbers: loadedSettings.lineNumbers,
        wordWrap: loadedSettings.wordWrap,
      })

      if (loadedSettings.recentFiles) {
        loadRecentFiles(loadedSettings.recentFiles)
      }
    })

    // System theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleThemeChange = (e: MediaQueryListEvent) => {
      window.electron.settings.get().then((s) => {
        if (s.theme === 'system') {
          setTheme(e.matches ? 'dark' : 'light')
        }
      })
    }
    mediaQuery.addEventListener('change', handleThemeChange)

    // Menu events
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
    const unsubToggleAI = window.electron.onMenuEvent('menu:toggle-ai', () => {
      useViewStore.getState().toggleAiPanel()
    })

    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange)
      unsubNewFile()
      unsubOpenFile()
      unsubSave()
      unsubSaveAs()
      unsubMarkdown()
      unsubSplit()
      unsubRender()
      unsubToggleSidebar()
      unsubToggleAI()
    }
  }, [])

  const isDark = theme === 'dark'

  // Show loading state during session restore
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
          fontSize={settings.fontSize}
          lineNumbers={settings.lineNumbers}
          wordWrap={settings.wordWrap}
          editorRef={editorRef}
        />
      </main>
    </div>
  )
}

export default App
```

---

## 12. Testing

### 12.1 tests/unit/sessionService.test.ts

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'path'
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs'

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/marxist-test'),
    getVersion: vi.fn(() => '1.0.0'),
  },
}))

import {
  saveDraft,
  clearDraft,
  loadDrafts,
  saveSessionState,
  loadSessionState,
  restoreSession,
} from '@electron/main/services/sessionService'

const TEST_PATH = '/tmp/marxist-test'
const DRAFTS_PATH = join(TEST_PATH, 'drafts')

describe('sessionService', () => {
  beforeEach(() => {
    // Clean up test directory
    if (existsSync(TEST_PATH)) {
      rmSync(TEST_PATH, { recursive: true, force: true })
    }
    mkdirSync(DRAFTS_PATH, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(TEST_PATH)) {
      rmSync(TEST_PATH, { recursive: true, force: true })
    }
  })

  describe('saveDraft', () => {
    it('saves content and metadata files (SP-02)', () => {
      saveDraft('tab-1', '# Hello', {
        filePath: '/path/to/file.md',
        fileName: 'file.md',
        isDirty: true,
        cursorPosition: 10,
        scrollPosition: 0,
      })

      expect(existsSync(join(DRAFTS_PATH, 'tab-1.md'))).toBe(true)
      expect(existsSync(join(DRAFTS_PATH, 'tab-1.json'))).toBe(true)

      const content = readFileSync(join(DRAFTS_PATH, 'tab-1.md'), 'utf-8')
      expect(content).toBe('# Hello')

      const metadata = JSON.parse(readFileSync(join(DRAFTS_PATH, 'tab-1.json'), 'utf-8'))
      expect(metadata.tabId).toBe('tab-1')
      expect(metadata.fileName).toBe('file.md')
      expect(metadata.isDirty).toBe(true)
    })
  })

  describe('clearDraft', () => {
    it('removes draft files (SP-06)', () => {
      // Create draft first
      saveDraft('tab-1', 'content', {
        filePath: null,
        fileName: 'Untitled',
        isDirty: true,
        cursorPosition: 0,
        scrollPosition: 0,
      })

      expect(existsSync(join(DRAFTS_PATH, 'tab-1.md'))).toBe(true)

      clearDraft('tab-1')

      expect(existsSync(join(DRAFTS_PATH, 'tab-1.md'))).toBe(false)
      expect(existsSync(join(DRAFTS_PATH, 'tab-1.json'))).toBe(false)
    })
  })

  describe('loadDrafts', () => {
    it('loads all saved drafts', () => {
      saveDraft('tab-1', 'Content 1', {
        filePath: null,
        fileName: 'Untitled',
        isDirty: true,
        cursorPosition: 5,
        scrollPosition: 0,
      })

      saveDraft('tab-2', 'Content 2', {
        filePath: '/path/file.md',
        fileName: 'file.md',
        isDirty: false,
        cursorPosition: 10,
        scrollPosition: 100,
      })

      const drafts = loadDrafts()

      expect(drafts).toHaveLength(2)
      expect(drafts.find(d => d.tabId === 'tab-1')?.content).toBe('Content 1')
      expect(drafts.find(d => d.tabId === 'tab-2')?.metadata.scrollPosition).toBe(100)
    })
  })

  describe('saveSessionState / loadSessionState', () => {
    it('persists and restores session state (SP-03, SP-04)', () => {
      const state = {
        openTabIds: ['tab-1', 'tab-2'],
        activeTabId: 'tab-2',
        untitledCounter: 1,
        activeView: 'split' as const,
        splitRatio: 0.4,
        sidebarOpen: true,
        aiPanelOpen: false,
        savedAt: new Date().toISOString(),
        appVersion: '1.0.0',
      }

      saveSessionState(state)

      const loaded = loadSessionState()

      expect(loaded?.openTabIds).toEqual(['tab-1', 'tab-2'])
      expect(loaded?.activeTabId).toBe('tab-2')
      expect(loaded?.splitRatio).toBe(0.4)
      expect(loaded?.activeView).toBe('split')
    })
  })

  describe('restoreSession', () => {
    it('returns empty result when no previous session (SP-05)', () => {
      const result = restoreSession()

      expect(result.success).toBe(true)
      expect(result.tabs).toHaveLength(0)
      expect(result.session).toBeNull()
    })

    it('restores tabs in correct order', () => {
      saveDraft('tab-a', 'A', {
        filePath: null,
        fileName: 'Untitled',
        isDirty: true,
        cursorPosition: 0,
        scrollPosition: 0,
      })

      saveDraft('tab-b', 'B', {
        filePath: null,
        fileName: 'Untitled 2',
        isDirty: true,
        cursorPosition: 0,
        scrollPosition: 0,
      })

      saveSessionState({
        openTabIds: ['tab-b', 'tab-a'], // Reverse order
        activeTabId: 'tab-a',
        untitledCounter: 2,
        activeView: 'markdown',
        splitRatio: 0.5,
        sidebarOpen: false,
        aiPanelOpen: false,
        savedAt: new Date().toISOString(),
        appVersion: '1.0.0',
      })

      const result = restoreSession()

      expect(result.success).toBe(true)
      expect(result.tabs[0].tabId).toBe('tab-b') // First per session order
      expect(result.tabs[1].tabId).toBe('tab-a')
    })
  })
})
```

### 12.2 tests/hooks/useSessionRestore.test.tsx

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSessionRestore } from '@/hooks/useSessionRestore'
import { useEditorStore } from '@/stores/editorStore'
import { useViewStore } from '@/stores/viewStore'

describe('useSessionRestore', () => {
  beforeEach(() => {
    // Reset stores
    useEditorStore.setState({
      tabs: new Map(),
      activeTabId: null,
      untitledCounter: 0,
      wordCount: 0,
      letterCount: 0,
    })
    useViewStore.setState({
      activeView: 'split',
      splitRatio: 0.5,
      sidebarOpen: false,
      aiPanelOpen: false,
    })
  })

  it('creates Untitled tab when no previous session (SP-05)', async () => {
    vi.spyOn(window.electron.drafts, 'restore').mockResolvedValue({
      success: true,
      tabs: [],
      session: null,
    })

    const { result } = renderHook(() => useSessionRestore())

    await waitFor(() => {
      expect(result.current.isRestored).toBe(true)
    })

    expect(useEditorStore.getState().tabs.size).toBe(1)
    expect(useViewStore.getState().activeView).toBe('split')
  })

  it('restores tabs from drafts (SP-04)', async () => {
    vi.spyOn(window.electron.drafts, 'restore').mockResolvedValue({
      success: true,
      tabs: [
        {
          tabId: 'old-tab-1',
          filePath: '/path/file.md',
          fileName: 'file.md',
          content: '# Hello',
          isDirty: false,
          cursorPosition: 5,
          scrollPosition: 100,
        },
      ],
      session: {
        openTabIds: ['old-tab-1'],
        activeTabId: 'old-tab-1',
        untitledCounter: 0,
        activeView: 'markdown',
        splitRatio: 0.6,
        sidebarOpen: true, // Will be ignored
        aiPanelOpen: true, // Will be ignored
        savedAt: new Date().toISOString(),
        appVersion: '1.0.0',
      },
    })

    const { result } = renderHook(() => useSessionRestore())

    await waitFor(() => {
      expect(result.current.isRestored).toBe(true)
    })

    expect(useEditorStore.getState().tabs.size).toBe(1)
    expect(useViewStore.getState().activeView).toBe('markdown')
    expect(useViewStore.getState().splitRatio).toBe(0.6)
    
    // Sidebar and AI panel should remain closed per spec
    expect(useViewStore.getState().sidebarOpen).toBe(false)
    expect(useViewStore.getState().aiPanelOpen).toBe(false)
  })
})
```

### 12.3 tests/e2e/session.spec.ts

```typescript
import { test, expect, _electron as electron } from '@playwright/test'
import { resolve, join } from 'path'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs'

const APP_DATA_PATH = resolve(__dirname, '../../test-app-data')
const DRAFTS_PATH = join(APP_DATA_PATH, 'drafts')

test.describe('Session Persistence', () => {
  test.beforeEach(() => {
    // Clean test data
    if (existsSync(APP_DATA_PATH)) {
      rmSync(APP_DATA_PATH, { recursive: true, force: true })
    }
  })

  test('creates Untitled tab on first launch (SP-05)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')],
      env: { ...process.env, ELECTRON_USER_DATA: APP_DATA_PATH },
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('.cm-editor')

    // Should have one Untitled tab
    const docName = await window.locator('header').textContent()
    expect(docName).toContain('Untitled')

    // Should be in split view
    await expect(window.locator('.split-view-container')).toBeVisible()

    await electronApp.close()
  })

  test('silently quits without save prompts (SP-01)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')],
      env: { ...process.env, ELECTRON_USER_DATA: APP_DATA_PATH },
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('.cm-editor')

    // Type some content
    await window.click('.cm-content')
    await window.keyboard.type('Unsaved content')

    // Quit - should not show any dialog
    await electronApp.close()

    // No assertion needed - test passes if quit completes without blocking
  })

  test('restores session on relaunch (SP-04)', async () => {
    // First session
    const electronApp1 = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')],
      env: { ...process.env, ELECTRON_USER_DATA: APP_DATA_PATH },
    })

    const window1 = await electronApp1.firstWindow()
    await window1.waitForSelector('.cm-editor')

    // Create content
    await window1.click('.cm-content')
    await window1.keyboard.type('# My Document')

    // Switch to markdown view
    await window1.keyboard.press('Meta+1')
    await window1.waitForTimeout(100)

    await electronApp1.close()
    await new Promise(r => setTimeout(r, 1000)) // Wait for save

    // Second session
    const electronApp2 = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')],
      env: { ...process.env, ELECTRON_USER_DATA: APP_DATA_PATH },
    })

    const window2 = await electronApp2.firstWindow()
    await window2.waitForSelector('.cm-editor')

    // Content should be restored
    const content = await window2.locator('.cm-content').textContent()
    expect(content).toContain('My Document')

    await electronApp2.close()
  })
})
```

---

## 13. Acceptance Criteria

### 13.1 P0 Requirements Checklist

- [ ] On quit: no save prompts shown (SP-01)
- [ ] On quit: all unsaved tab contents saved to `~/Library/Application Support/Marxist/drafts/` (SP-02)
- [ ] On quit: session state saved (open tabs, active tab, split ratio, view, sidebar/AI state) (SP-03)
- [ ] On launch: full session restored including unsaved drafts (SP-04)
- [ ] On launch with no session: one "Untitled" tab in split view (SP-05)
- [ ] Draft files cleared when user saves file (SP-06)

### 13.2 Data File Locations

| File | Location | Purpose |
|------|----------|---------|
| Draft content | `~/Library/Application Support/Marxist/drafts/{tabId}.md` | Raw Markdown |
| Draft metadata | `~/Library/Application Support/Marxist/drafts/{tabId}.json` | Tab state |
| Session state | `~/Library/Application Support/Marxist/session.json` | View/tab state |

### 13.3 Session State Contents

```json
{
  "openTabIds": ["tab-abc123", "tab-def456"],
  "activeTabId": "tab-abc123",
  "untitledCounter": 2,
  "activeView": "split",
  "splitRatio": 0.5,
  "sidebarOpen": false,
  "aiPanelOpen": false,
  "savedAt": "2024-01-15T10:30:00.000Z",
  "appVersion": "1.0.0"
}
```

---

## 14. Output for Next Stage

This stage produces:

1. **sessionService** - Full draft and session persistence in main process
2. **useSessionRestore** - Hook for restoring session on app launch
3. **useAutoSave** - Periodic crash safety net saving
4. **Updated quit handling** - Silent quit with state preservation

Stage 08 will consume:
- Session restoration complete before settings modal can open
- Draft clearing logic integrated with save operations
