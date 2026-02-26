# Stage 06: Tab System & File Management

## Overview

Implement the multi-tab editor system with Zustand stores, file sidebar with tab switching, and complete file operations (new, open, save, save-as, drag-and-drop). This stage establishes the document management architecture.

## Requirements Covered

### File Sidebar

| ID | Requirement | Priority |
|----|-------------|----------|
| FS-01 | Toggled by burger icon or ⌘\ | P0 |
| FS-02 | Width: 240px, slides in from left, pushes editor content | P0 |
| FS-03 | Animation: 200ms ease-out in, 150ms ease-in out | P1 |
| FS-04 | Header: "Recent Files" with close X | P0 |
| FS-05 | Shows last 20 opened files as tabs | P0 |
| FS-06 | Files behave as tabs — switching is instant, no save prompts | P0 |
| FS-07 | Each item: file name (truncated) + save status dot (right side) | P0 |
| FS-08 | Save dot: green semi-transparent filled (60% opacity) = saved | P0 |
| FS-09 | Save dot: red semi-transparent filled (60% opacity) = unsaved | P0 |
| FS-10 | Active file visually distinguished (highlight or left border) | P1 |
| FS-11 | Unsaved files retain full state in memory (content, cursor, dirty flag) | P0 |
| FS-12 | New file (⌘N) creates new tab and switches to it | P0 |
| FS-13 | Sidebar available in Markdown and Split views (not Render) | P0 |

### File Operations

| ID | Requirement | Priority |
|----|-------------|----------|
| FO-01 | New file: ⌘N — creates new tab in sidebar, switches to it | P0 |
| FO-02 | Open file: ⌘O — native macOS dialog, filters .md, .markdown, .txt | P0 |
| FO-03 | Drag and drop: .md files dragged onto window open as new tabs | P0 |
| FO-04 | Save: ⌘S — saves to existing path, or triggers Save As if untitled | P0 |
| FO-05 | Save As: ⌘⇧S — native save dialog | P0 |
| FO-06 | No auto-save — manual save only | P0 |
| FO-08 | Files are plain .md on disk — no proprietary format | P0 |
| FO-09 | If a dropped/opened file is already in a tab, switch to that tab | P0 |

## Dependencies from Stage 05

- PreviewPanel for split view
- useMarkdownParser for word/letter counts
- EditorRef API for state snapshots

---

## 1. Project Structure

```
src/
├── components/
│   ├── Sidebar/
│   │   ├── FileSidebar.tsx        # NEW: Sidebar container
│   │   ├── SidebarHeader.tsx      # NEW: "Recent Files" header
│   │   ├── FileList.tsx           # NEW: Tab list
│   │   └── FileListItem.tsx       # NEW: Individual tab item
│   └── Layout/
│       └── MainContent.tsx        # UPDATE: Add sidebar integration
├── stores/
│   ├── editorStore.ts             # NEW: Multi-tab document state
│   └── fileStore.ts               # NEW: Open tabs and recent files
├── hooks/
│   ├── useFileOperations.ts       # NEW: File operation hook
│   └── useDragAndDrop.ts          # NEW: Drag-and-drop handling
└── types/
    └── files.ts                   # NEW: File-related types
```

---

## 2. Type Definitions

### 2.1 src/types/files.ts

**Important Note on EditorState:**
CodeMirror 6's `EditorState` is a complex object that cannot be directly serialized to JSON. For tab switching (FS-11), we store:
- `scrollPosition`: Numeric scroll top value
- `cursorPosition`: Cursor anchor position (character offset)

The full `editorState` field is only used for in-memory tab switching during a session. For session persistence (Stage 7), we serialize only the content, cursor, and scroll positions.

```typescript
import type { EditorState } from '@codemirror/state'

export interface TabState {
  tabId: string
  filePath: string | null          // null = untitled
  fileName: string                 // "Untitled", "Untitled 2", or from path
  content: string                  // Current Markdown content
  savedContent: string             // Last saved snapshot
  isDirty: boolean                 // content !== savedContent
  editorState: EditorState | null  // In-memory only, not serialized
  scrollPosition: number           // Persisted for session restore
  cursorPosition: number           // Persisted for session restore
  // AI editing state (for Stage 10)
  preEditSnapshot: string | null
  isAIEditing: boolean
  showDiff: boolean
}

export interface RecentFile {
  path: string
  name: string
  lastOpened: string              // ISO date string
}

export interface OpenFileResult {
  path: string
  name: string
  content: string
}

export interface SaveFileResult {
  success: boolean
  path?: string
  name?: string
  error?: string
}
```

---

## 3. Editor Store (Multi-Tab State)

### 3.1 src/stores/editorStore.ts

```typescript
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { EditorState } from '@codemirror/state'
import type { TabState } from '@/types/files'

interface EditorStoreState {
  // Tab state
  tabs: Map<string, TabState>
  activeTabId: string | null
  
  // Counts for current tab
  wordCount: number
  letterCount: number
  
  // Untitled file counter
  untitledCounter: number
  
  // Actions
  createTab: (filePath?: string | null, content?: string) => string
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  updateTabContent: (tabId: string, content: string) => void
  updateTabEditorState: (tabId: string, state: EditorState | null, scroll?: number, cursor?: number) => void
  markTabSaved: (tabId: string, filePath?: string, fileName?: string) => void
  getActiveTab: () => TabState | null
  getTabByPath: (filePath: string) => TabState | null
  
  // AI editing (for Stage 10)
  setTabAIEditing: (tabId: string, isEditing: boolean, preEditSnapshot?: string) => void
  setTabShowDiff: (tabId: string, showDiff: boolean) => void
}

const MAX_TABS = 20

function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function getFileNameFromPath(filePath: string): string {
  return filePath.split('/').pop() || filePath
}

function calculateWordCount(content: string): number {
  const trimmed = content.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

function calculateLetterCount(content: string): number {
  return content.replace(/\s/g, '').length
}

export const useEditorStore = create<EditorStoreState>()(
  subscribeWithSelector((set, get) => ({
    tabs: new Map(),
    activeTabId: null,
    wordCount: 0,
    letterCount: 0,
    untitledCounter: 0,

    createTab: (filePath = null, content = '') => {
      const { tabs, untitledCounter } = get()
      
      // FS-05: Limit to 20 tabs
      if (tabs.size >= MAX_TABS) {
        // Find oldest non-dirty tab to close
        let oldestNonDirtyTabId: string | null = null
        for (const [id, tab] of tabs) {
          if (!tab.isDirty) {
            oldestNonDirtyTabId = id
            break
          }
        }
        
        if (oldestNonDirtyTabId) {
          get().closeTab(oldestNonDirtyTabId)
        } else {
          console.warn('Cannot create new tab: 20 tabs limit reached, all have unsaved changes')
          return ''
        }
      }

      const tabId = generateTabId()
      let fileName: string
      
      if (filePath) {
        fileName = getFileNameFromPath(filePath)
      } else {
        // TB-02: Untitled naming convention
        const newCounter = untitledCounter + 1
        fileName = newCounter === 1 ? 'Untitled' : `Untitled ${newCounter}`
        set({ untitledCounter: newCounter })
      }

      const newTab: TabState = {
        tabId,
        filePath,
        fileName,
        content,
        savedContent: content, // New files start "clean" (empty = saved)
        isDirty: false,
        editorState: null,
        scrollPosition: 0,
        cursorPosition: 0,
        preEditSnapshot: null,
        isAIEditing: false,
        showDiff: false,
      }

      const newTabs = new Map(tabs)
      newTabs.set(tabId, newTab)

      set({
        tabs: newTabs,
        activeTabId: tabId,
        wordCount: calculateWordCount(content),
        letterCount: calculateLetterCount(content),
      })

      return tabId
    },

    closeTab: (tabId) => {
      const { tabs, activeTabId } = get()
      
      if (!tabs.has(tabId)) return

      const newTabs = new Map(tabs)
      newTabs.delete(tabId)

      // If closing active tab, switch to another
      let newActiveTabId = activeTabId
      if (activeTabId === tabId) {
        const remainingIds = Array.from(newTabs.keys())
        newActiveTabId = remainingIds.length > 0 ? remainingIds[remainingIds.length - 1] : null
      }

      const newActiveTab = newActiveTabId ? newTabs.get(newActiveTabId) : null

      set({
        tabs: newTabs,
        activeTabId: newActiveTabId,
        wordCount: newActiveTab ? calculateWordCount(newActiveTab.content) : 0,
        letterCount: newActiveTab ? calculateLetterCount(newActiveTab.content) : 0,
      })
    },

    setActiveTab: (tabId) => {
      const { tabs } = get()
      const tab = tabs.get(tabId)
      
      if (!tab) return

      set({
        activeTabId: tabId,
        wordCount: calculateWordCount(tab.content),
        letterCount: calculateLetterCount(tab.content),
      })
    },

    updateTabContent: (tabId, content) => {
      const { tabs, activeTabId } = get()
      const tab = tabs.get(tabId)
      
      if (!tab) return

      const newTab: TabState = {
        ...tab,
        content,
        isDirty: content !== tab.savedContent,
      }

      const newTabs = new Map(tabs)
      newTabs.set(tabId, newTab)

      const updates: Partial<EditorStoreState> = { tabs: newTabs }
      
      // Update counts if this is the active tab
      if (tabId === activeTabId) {
        updates.wordCount = calculateWordCount(content)
        updates.letterCount = calculateLetterCount(content)
      }

      set(updates)
    },

    updateTabEditorState: (tabId, state, scroll, cursor) => {
      const { tabs } = get()
      const tab = tabs.get(tabId)
      
      if (!tab) return

      const newTab: TabState = {
        ...tab,
        editorState: state,
        scrollPosition: scroll ?? tab.scrollPosition,
        cursorPosition: cursor ?? tab.cursorPosition,
      }

      const newTabs = new Map(tabs)
      newTabs.set(tabId, newTab)

      set({ tabs: newTabs })
    },

    markTabSaved: (tabId, filePath, fileName) => {
      const { tabs } = get()
      const tab = tabs.get(tabId)
      
      if (!tab) return

      const newTab: TabState = {
        ...tab,
        filePath: filePath ?? tab.filePath,
        fileName: fileName ?? tab.fileName,
        savedContent: tab.content,
        isDirty: false,
      }

      const newTabs = new Map(tabs)
      newTabs.set(tabId, newTab)

      set({ tabs: newTabs })
    },

    getActiveTab: () => {
      const { tabs, activeTabId } = get()
      return activeTabId ? tabs.get(activeTabId) || null : null
    },

    getTabByPath: (filePath) => {
      const { tabs } = get()
      for (const tab of tabs.values()) {
        if (tab.filePath === filePath) {
          return tab
        }
      }
      return null
    },

    // AI editing methods (Stage 10)
    setTabAIEditing: (tabId, isEditing, preEditSnapshot) => {
      const { tabs } = get()
      const tab = tabs.get(tabId)
      
      if (!tab) return

      const newTab: TabState = {
        ...tab,
        isAIEditing: isEditing,
        preEditSnapshot: preEditSnapshot ?? tab.preEditSnapshot,
      }

      const newTabs = new Map(tabs)
      newTabs.set(tabId, newTab)

      set({ tabs: newTabs })
    },

    setTabShowDiff: (tabId, showDiff) => {
      const { tabs } = get()
      const tab = tabs.get(tabId)
      
      if (!tab) return

      const newTab: TabState = {
        ...tab,
        showDiff,
      }

      const newTabs = new Map(tabs)
      newTabs.set(tabId, newTab)

      set({ tabs: newTabs })
    },
  }))
)

// Selectors
export const selectActiveTab = (state: EditorStoreState) => 
  state.activeTabId ? state.tabs.get(state.activeTabId) : null
export const selectTabs = (state: EditorStoreState) => state.tabs
export const selectActiveTabId = (state: EditorStoreState) => state.activeTabId
export const selectWordCount = (state: EditorStoreState) => state.wordCount
export const selectLetterCount = (state: EditorStoreState) => state.letterCount
```

---

## 4. File Store (Recent Files)

### 4.1 src/stores/fileStore.ts

```typescript
import { create } from 'zustand'
import type { RecentFile } from '@/types/files'

interface FileStoreState {
  recentFiles: RecentFile[]
  
  // Actions
  addRecentFile: (path: string, name: string) => void
  removeRecentFile: (path: string) => void
  clearRecentFiles: () => void
  loadRecentFiles: (files: RecentFile[]) => void
}

const MAX_RECENT_FILES = 20

export const useFileStore = create<FileStoreState>()((set, get) => ({
  recentFiles: [],

  addRecentFile: (path, name) => {
    const { recentFiles } = get()
    
    // Remove if already exists (will re-add at top)
    const filtered = recentFiles.filter((f) => f.path !== path)
    
    const newFile: RecentFile = {
      path,
      name,
      lastOpened: new Date().toISOString(),
    }

    // Add to front, limit to MAX_RECENT_FILES
    const updated = [newFile, ...filtered].slice(0, MAX_RECENT_FILES)

    set({ recentFiles: updated })

    // Persist to settings
    window.electron?.settings?.set('recentFiles', updated)
  },

  removeRecentFile: (path) => {
    const { recentFiles } = get()
    const updated = recentFiles.filter((f) => f.path !== path)
    set({ recentFiles: updated })
    window.electron?.settings?.set('recentFiles', updated)
  },

  clearRecentFiles: () => {
    set({ recentFiles: [] })
    window.electron?.settings?.set('recentFiles', [])
  },

  loadRecentFiles: (files) => {
    set({ recentFiles: files.slice(0, MAX_RECENT_FILES) })
  },
}))

export const selectRecentFiles = (state: FileStoreState) => state.recentFiles
```

---

## 5. File Operations Hook

### 5.1 src/hooks/useFileOperations.ts

```typescript
import { useCallback } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { useFileStore } from '@/stores/fileStore'
import type { OpenFileResult, SaveFileResult } from '@/types/files'

export function useFileOperations() {
  const createTab = useEditorStore((state) => state.createTab)
  const setActiveTab = useEditorStore((state) => state.setActiveTab)
  const getActiveTab = useEditorStore((state) => state.getActiveTab)
  const getTabByPath = useEditorStore((state) => state.getTabByPath)
  const markTabSaved = useEditorStore((state) => state.markTabSaved)
  const addRecentFile = useFileStore((state) => state.addRecentFile)

  // FO-01: Create new file
  const createNewFile = useCallback(() => {
    const tabId = createTab(null, '')
    return tabId
  }, [createTab])

  // FO-02: Open file via dialog
  const openFile = useCallback(async (): Promise<string | null> => {
    try {
      const result: OpenFileResult = await window.electron.file.open()
      
      if (!result.path) return null

      // FO-09: Check if already open
      const existingTab = getTabByPath(result.path)
      if (existingTab) {
        setActiveTab(existingTab.tabId)
        return existingTab.tabId
      }

      // Create new tab with file content
      const tabId = createTab(result.path, result.content)
      
      // Add to recent files
      addRecentFile(result.path, result.name)

      return tabId
    } catch (error) {
      console.error('Failed to open file:', error)
      return null
    }
  }, [createTab, setActiveTab, getTabByPath, addRecentFile])

  // FO-03: Open file from path (drag-drop or recent)
  const openFilePath = useCallback(async (filePath: string): Promise<string | null> => {
    try {
      // FO-09: Check if already open
      const existingTab = getTabByPath(filePath)
      if (existingTab) {
        setActiveTab(existingTab.tabId)
        return existingTab.tabId
      }

      const result: OpenFileResult = await window.electron.file.drop(filePath)
      
      if (!result.path) return null

      const tabId = createTab(result.path, result.content)
      addRecentFile(result.path, result.name)

      return tabId
    } catch (error) {
      console.error('Failed to open file path:', error)
      return null
    }
  }, [createTab, setActiveTab, getTabByPath, addRecentFile])

  // FO-04: Save current file
  const saveFile = useCallback(async (): Promise<boolean> => {
    const activeTab = getActiveTab()
    if (!activeTab) return false

    try {
      if (activeTab.filePath) {
        // Save to existing path
        const result: SaveFileResult = await window.electron.file.save(
          activeTab.filePath,
          activeTab.content
        )
        
        if (result.success) {
          markTabSaved(activeTab.tabId)
          return true
        }
        
        console.error('Save failed:', result.error)
        return false
      } else {
        // No path - trigger Save As
        return await saveFileAs()
      }
    } catch (error) {
      console.error('Failed to save file:', error)
      return false
    }
  }, [getActiveTab, markTabSaved])

  // FO-05: Save As
  const saveFileAs = useCallback(async (): Promise<boolean> => {
    const activeTab = getActiveTab()
    if (!activeTab) return false

    try {
      const result = await window.electron.file.saveAs(activeTab.content)
      
      if (result.path) {
        markTabSaved(activeTab.tabId, result.path, result.path.split('/').pop())
        addRecentFile(result.path, result.path.split('/').pop() || 'Untitled')
        return true
      }
      
      return false // User cancelled
    } catch (error) {
      console.error('Failed to save file as:', error)
      return false
    }
  }, [getActiveTab, markTabSaved, addRecentFile])

  return {
    createNewFile,
    openFile,
    openFilePath,
    saveFile,
    saveFileAs,
  }
}
```

---

## 6. Drag and Drop Hook

### 6.1 src/hooks/useDragAndDrop.ts

```typescript
import { useEffect, useCallback } from 'react'
import { useFileOperations } from './useFileOperations'

export function useDragAndDrop() {
  const { openFilePath } = useFileOperations()

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return

    // FO-03: Handle dropped .md files
    for (const file of Array.from(files)) {
      const path = (file as any).path as string
      
      if (!path) continue
      
      // Check file extension
      const ext = path.toLowerCase().split('.').pop()
      if (ext === 'md' || ext === 'markdown' || ext === 'txt') {
        await openFilePath(path)
      } else {
        console.warn('Unsupported file type:', ext)
        // Could show toast notification here
      }
    }
  }, [openFilePath])

  useEffect(() => {
    // Prevent default drag behavior on document
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)

    return () => {
      document.removeEventListener('dragenter', handleDragEnter)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
    }
  }, [handleDragOver, handleDrop])
}
```

---

## 7. File Sidebar Components

### 7.1 src/components/Sidebar/SidebarHeader.tsx

```typescript
import Icon from '@/components/common/Icon'
import { useViewStore } from '@/stores/viewStore'

export default function SidebarHeader() {
  const toggleSidebar = useViewStore((state) => state.toggleSidebar)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      {/* FS-04: Header text */}
      <span className="font-sans font-medium text-sm text-text-primary-light dark:text-text-primary-dark">
        Recent Files
      </span>
      
      {/* Close button */}
      <button
        onClick={toggleSidebar}
        className="
          p-1 rounded
          text-text-secondary-light dark:text-text-secondary-dark
          hover:text-text-primary-light dark:hover:text-text-primary-dark
          hover:bg-gray-100 dark:hover:bg-gray-700
          transition-colors duration-150
        "
        aria-label="Close sidebar"
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  )
}
```

### 7.2 src/components/Sidebar/FileListItem.tsx

```typescript
import { memo } from 'react'
import type { TabState } from '@/types/files'

interface FileListItemProps {
  tab: TabState
  isActive: boolean
  onClick: () => void
}

function FileListItem({ tab, isActive, onClick }: FileListItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center justify-between px-4 h-9
        text-left transition-colors duration-150
        ${isActive 
          ? 'bg-accent/10 dark:bg-accent-dark/10 border-l-2 border-accent dark:border-accent-dark' 
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 border-l-2 border-transparent'
        }
      `}
      title={tab.filePath || tab.fileName}
    >
      {/* FS-07: File name (truncated) */}
      <span 
        className={`
          font-sans text-sm truncate mr-2
          ${isActive 
            ? 'font-medium text-text-primary-light dark:text-text-primary-dark' 
            : 'text-text-secondary-light dark:text-text-secondary-dark'
          }
        `}
      >
        {tab.fileName}
      </span>
      
      {/* FS-07, FS-08, FS-09: Save status dot (6px = w-1.5 h-1.5) */}
      {/* Light mode: #4CAF50/#F44336 at 60% | Dark mode: #66BB6A/#EF5350 at 50% */}
      <span
        className={`
          flex-shrink-0 w-1.5 h-1.5 rounded-full
          ${tab.isDirty 
            ? 'bg-[#F44336]/60 dark:bg-[#EF5350]/50' // FS-09: Red = unsaved
            : 'bg-[#4CAF50]/60 dark:bg-[#66BB6A]/50' // FS-08: Green = saved
          }
        `}
        aria-label={tab.isDirty ? 'Unsaved changes' : 'Saved'}
      />
    </button>
  )
}

export default memo(FileListItem)
```

### 7.3 src/components/Sidebar/FileList.tsx

```typescript
import { useMemo } from 'react'
import { useEditorStore, selectTabs, selectActiveTabId } from '@/stores/editorStore'
import FileListItem from './FileListItem'

export default function FileList() {
  const tabs = useEditorStore(selectTabs)
  const activeTabId = useEditorStore(selectActiveTabId)
  const setActiveTab = useEditorStore((state) => state.setActiveTab)

  // Convert Map to array sorted by most recently active
  const tabList = useMemo(() => {
    return Array.from(tabs.values()).reverse() // Most recent first
  }, [tabs])

  if (tabList.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <span className="text-text-secondary-light dark:text-text-secondary-dark text-sm">
          No files open
        </span>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto py-1">
      {/* FS-05: Show last 20 opened files (handled by MAX_TABS in editorStore) */}
      {tabList.map((tab) => (
        <FileListItem
          key={tab.tabId}
          tab={tab}
          isActive={tab.tabId === activeTabId}
          onClick={() => setActiveTab(tab.tabId)}
        />
      ))}
    </div>
  )
}
```

### 7.4 src/components/Sidebar/FileSidebar.tsx

```typescript
import { useViewStore, selectSidebarOpen, selectActiveView } from '@/stores/viewStore'
import SidebarHeader from './SidebarHeader'
import FileList from './FileList'

export default function FileSidebar() {
  const sidebarOpen = useViewStore(selectSidebarOpen)
  const activeView = useViewStore(selectActiveView)

  // FS-13: Sidebar only available in Markdown and Split views
  if (activeView === 'render') {
    return null
  }

  return (
    <div
      className={`
        fixed top-topbar left-0 h-[calc(100vh-44px)] z-20
        bg-[#F8F8F8] dark:bg-[#181818]
        border-r border-gray-200 dark:border-gray-700
        flex flex-col
        transform transition-transform
        ${sidebarOpen 
          ? 'translate-x-0 duration-200 ease-out'  // FS-03: 200ms ease-out in
          : '-translate-x-full duration-150 ease-in' // FS-03: 150ms ease-in out
        }
      `}
      style={{ width: '240px' }} // FS-02: 240px fixed width
      aria-hidden={!sidebarOpen}
    >
      <SidebarHeader />
      <FileList />
    </div>
  )
}
```

---

## 8. Update Preload Types

### 8.1 electron/preload/types.ts (additions)

```typescript
// Update existing FileResult to include name
export interface OpenFileResult {
  path: string | null
  name: string
  content: string
  error?: string
}

export interface SaveFileResult {
  success: boolean
  path?: string
  name?: string
  error?: string
}
```

### 8.2 Global Type Declaration (src/types/electron.d.ts)

Ensure the global `Window` interface includes the updated file methods:

```typescript
declare global {
  interface Window {
    electron: {
      file: {
        open: () => Promise<OpenFileResult>
        save: (path: string, content: string) => Promise<SaveFileResult>
        saveAs: (content: string) => Promise<SaveFileResult>
        drop: (path: string) => Promise<OpenFileResult>
        getRecent: () => Promise<RecentFile[]>
      }
      // ... other methods from Stage 1
    }
  }
}
```

---

## 9. Update IPC Handlers

### 9.1 electron/main/ipc/file-handlers.ts

```typescript
import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { basename } from 'path'

export function registerFileHandlers(): void {
  // FO-02: Open file dialog
  ipcMain.handle('file:open', async () => {
    const window = BrowserWindow.getFocusedWindow()
    
    const result = await dialog.showOpenDialog(window!, {
      properties: ['openFile'],
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown'] },
        { name: 'Text', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { path: null, name: '', content: '' }
    }

    const filePath = result.filePaths[0]
    const content = await readFile(filePath, 'utf-8')
    const name = basename(filePath)

    return { path: filePath, name, content }
  })

  // FO-04: Save file to existing path
  ipcMain.handle('file:save', async (_, path: string, content: string) => {
    try {
      await writeFile(path, content, 'utf-8')
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // FO-05: Save As dialog
  ipcMain.handle('file:save-as', async (_, content: string) => {
    const window = BrowserWindow.getFocusedWindow()
    
    const result = await dialog.showSaveDialog(window!, {
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'Text', extensions: ['txt'] },
      ],
      properties: ['createDirectory', 'showOverwriteConfirmation'],
    })

    if (result.canceled || !result.filePath) {
      return { path: null }
    }

    try {
      await writeFile(result.filePath, content, 'utf-8')
      return { path: result.filePath, name: basename(result.filePath) }
    } catch (error) {
      return { path: null, error: (error as Error).message }
    }
  })

  // FO-03: Open dropped file
  ipcMain.handle('file:drop', async (_, filePath: string) => {
    try {
      const content = await readFile(filePath, 'utf-8')
      const name = basename(filePath)
      return { path: filePath, name, content }
    } catch (error) {
      return { path: null, name: '', content: '', error: (error as Error).message }
    }
  })

  // Get recent files from settings
  ipcMain.handle('file:get-recent', async () => {
    // This is managed by settings store
    return []
  })

  // Open external URL
  ipcMain.handle('file:open-external', async (_, url: string) => {
    try {
      const parsedUrl = new URL(url)
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error('Invalid URL protocol')
      }
      await shell.openExternal(url)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
}
```

---

## 10. Update MainContent Layout

**Important:** The `MarkdownEditor` component and `useCodeMirror` hook from Stage 2 must support tab switching. When `activeTabId` changes:
1. Save current editor state (scroll position, cursor) to the outgoing tab
2. Load new content into the editor
3. Restore scroll position and cursor for the incoming tab

The `useCodeMirror` hook should accept an optional `initialScrollPosition` and `initialCursorPosition` prop to restore state on tab switch.

### 10.1 src/components/Layout/MainContent.tsx

```typescript
import { useRef, useEffect } from 'react'
import { useViewStore, selectActiveView, selectAiPanelOpen, selectSidebarOpen } from '@/stores/viewStore'
import { useEditorStore, selectActiveTab } from '@/stores/editorStore'
import EditorPanel from '@/components/Editor/EditorPanel'
import PreviewPanel from '@/components/Preview/PreviewPanel'
import SplitView from '@/components/SplitView/SplitView'
import FileSidebar from '@/components/Sidebar/FileSidebar'
import type { EditorRef } from '@/types/editor'

interface MainContentProps {
  isDark: boolean
  fontSize?: number
  lineNumbers?: boolean
  wordWrap?: boolean
  editorRef?: React.MutableRefObject<EditorRef | null>
}

export default function MainContent({
  isDark,
  fontSize = 14,
  lineNumbers = false,
  wordWrap = true,
  editorRef,
}: MainContentProps) {
  const activeView = useViewStore(selectActiveView)
  const aiPanelOpen = useViewStore(selectAiPanelOpen)
  const sidebarOpen = useViewStore(selectSidebarOpen)
  const activeTab = useEditorStore(selectActiveTab)
  const updateTabContent = useEditorStore((state) => state.updateTabContent)
  const updateTabEditorState = useEditorStore((state) => state.updateTabEditorState)

  const content = activeTab?.content || ''
  
  const handleContentChange = (newContent: string) => {
    if (activeTab) {
      updateTabContent(activeTab.tabId, newContent)
    }
  }

  // Save editor state when tab changes
  const previousTabIdRef = useRef<string | null>(null)
  
  useEffect(() => {
    const currentTabId = activeTab?.tabId || null
    
    // Save previous tab's editor state
    if (previousTabIdRef.current && previousTabIdRef.current !== currentTabId && editorRef?.current) {
      const snapshot = editorRef.current.getSnapshot()
      updateTabEditorState(
        previousTabIdRef.current,
        null, // EditorState will be managed separately
        snapshot.scrollTop,
        snapshot.selection.anchor
      )
    }

    // Restore current tab's editor state
    if (currentTabId && activeTab?.editorState && editorRef?.current) {
      // This would restore scroll/cursor position
      // Full EditorState restoration handled in MarkdownEditor
    }

    previousTabIdRef.current = currentTabId
  }, [activeTab?.tabId])

  // FS-02: Calculate sidebar offset for content
  const sidebarOffset = sidebarOpen && activeView !== 'render' ? 240 : 0

  const renderContent = () => {
    if (!activeTab) {
      return (
        <div className="h-full flex items-center justify-center text-text-secondary-light dark:text-text-secondary-dark">
          No file open. Press ⌘N to create a new file.
        </div>
      )
    }

    switch (activeView) {
      case 'markdown':
        return (
          <EditorPanel
            content={content}
            onChange={handleContentChange}
            isDark={isDark}
            fontSize={fontSize}
            lineNumbers={lineNumbers}
            wordWrap={wordWrap}
            editorRef={editorRef}
          />
        )

      case 'split':
        return (
          <SplitView
            leftPanel={
              <EditorPanel
                content={content}
                onChange={handleContentChange}
                isDark={isDark}
                fontSize={fontSize}
                lineNumbers={lineNumbers}
                wordWrap={wordWrap}
                editorRef={editorRef}
              />
            }
            rightPanel={
              <PreviewPanel
                content={content}
                isDark={isDark}
              />
            }
          />
        )

      case 'render':
        return (
          <PreviewPanel
            content={content}
            isDark={isDark}
            fullWidth
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="h-full relative">
      {/* File Sidebar */}
      <FileSidebar />
      
      {/* Main content area with sidebar offset */}
      <div
        className="h-full transition-[margin-left] duration-200 ease-out"
        style={{
          marginLeft: `${sidebarOffset}px`,
          paddingRight: aiPanelOpen ? '360px' : 0,
        }}
      >
        {renderContent()}
      </div>
    </div>
  )
}
```

---

## 11. Update App.tsx

### 11.1 src/App.tsx

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
  const createTab = useEditorStore((state) => state.createTab)
  const loadRecentFiles = useFileStore((state) => state.loadRecentFiles)
  
  const { createNewFile, openFile, saveFile, saveFileAs } = useFileOperations()
  
  useWindowSize()
  useViewKeyboardShortcuts()
  useDragAndDrop()

  useEffect(() => {
    // Load settings and recent files
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

      // Load recent files
      if (loadedSettings.recentFiles) {
        loadRecentFiles(loadedSettings.recentFiles)
      }
    })

    // Create initial tab if none exists
    const tabs = useEditorStore.getState().tabs
    if (tabs.size === 0) {
      createTab(null, '')
    }

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

### 12.1 tests/unit/editorStore.test.ts

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from '@/stores/editorStore'

describe('editorStore', () => {
  beforeEach(() => {
    // Reset store
    useEditorStore.setState({
      tabs: new Map(),
      activeTabId: null,
      wordCount: 0,
      letterCount: 0,
      untitledCounter: 0,
    })
  })

  describe('createTab', () => {
    it('creates untitled tab with correct naming (TB-02)', () => {
      const tabId1 = useEditorStore.getState().createTab()
      const tab1 = useEditorStore.getState().tabs.get(tabId1)
      expect(tab1?.fileName).toBe('Untitled')

      const tabId2 = useEditorStore.getState().createTab()
      const tab2 = useEditorStore.getState().tabs.get(tabId2)
      expect(tab2?.fileName).toBe('Untitled 2')

      const tabId3 = useEditorStore.getState().createTab()
      const tab3 = useEditorStore.getState().tabs.get(tabId3)
      expect(tab3?.fileName).toBe('Untitled 3')
    })

    it('creates tab with file path', () => {
      const tabId = useEditorStore.getState().createTab('/path/to/readme.md', '# Hello')
      const tab = useEditorStore.getState().tabs.get(tabId)
      
      expect(tab?.filePath).toBe('/path/to/readme.md')
      expect(tab?.fileName).toBe('readme.md')
      expect(tab?.content).toBe('# Hello')
      expect(tab?.isDirty).toBe(false)
    })

    it('sets new tab as active', () => {
      const tabId = useEditorStore.getState().createTab()
      expect(useEditorStore.getState().activeTabId).toBe(tabId)
    })

    it('limits tabs to 20 (FS-05)', () => {
      // Create 20 tabs
      for (let i = 0; i < 20; i++) {
        useEditorStore.getState().createTab()
      }
      expect(useEditorStore.getState().tabs.size).toBe(20)

      // Creating 21st should close oldest non-dirty
      useEditorStore.getState().createTab()
      expect(useEditorStore.getState().tabs.size).toBe(20)
    })
  })

  describe('updateTabContent', () => {
    it('marks tab as dirty when content changes (FS-11)', () => {
      const tabId = useEditorStore.getState().createTab('/path/test.md', 'original')
      
      // Mark as saved first
      useEditorStore.getState().markTabSaved(tabId)
      expect(useEditorStore.getState().tabs.get(tabId)?.isDirty).toBe(false)

      // Update content
      useEditorStore.getState().updateTabContent(tabId, 'modified')
      expect(useEditorStore.getState().tabs.get(tabId)?.isDirty).toBe(true)
    })

    it('updates word and letter counts for active tab', () => {
      const tabId = useEditorStore.getState().createTab(null, '')
      useEditorStore.getState().updateTabContent(tabId, 'one two three')
      
      expect(useEditorStore.getState().wordCount).toBe(3)
      expect(useEditorStore.getState().letterCount).toBe(11)
    })
  })

  describe('markTabSaved', () => {
    it('clears dirty flag', () => {
      const tabId = useEditorStore.getState().createTab(null, 'content')
      useEditorStore.getState().updateTabContent(tabId, 'modified')
      expect(useEditorStore.getState().tabs.get(tabId)?.isDirty).toBe(true)

      useEditorStore.getState().markTabSaved(tabId)
      expect(useEditorStore.getState().tabs.get(tabId)?.isDirty).toBe(false)
    })

    it('updates file path on Save As', () => {
      const tabId = useEditorStore.getState().createTab(null, 'content')
      useEditorStore.getState().markTabSaved(tabId, '/new/path.md', 'path.md')
      
      const tab = useEditorStore.getState().tabs.get(tabId)
      expect(tab?.filePath).toBe('/new/path.md')
      expect(tab?.fileName).toBe('path.md')
    })
  })

  describe('getTabByPath', () => {
    it('finds existing tab by path (FO-09)', () => {
      const tabId = useEditorStore.getState().createTab('/path/to/file.md', 'content')
      
      const found = useEditorStore.getState().getTabByPath('/path/to/file.md')
      expect(found?.tabId).toBe(tabId)
    })

    it('returns null for non-existent path', () => {
      useEditorStore.getState().createTab('/path/to/file.md', 'content')
      
      const found = useEditorStore.getState().getTabByPath('/other/path.md')
      expect(found).toBeNull()
    })
  })

  describe('closeTab', () => {
    it('removes tab from store', () => {
      const tabId = useEditorStore.getState().createTab()
      expect(useEditorStore.getState().tabs.has(tabId)).toBe(true)

      useEditorStore.getState().closeTab(tabId)
      expect(useEditorStore.getState().tabs.has(tabId)).toBe(false)
    })

    it('switches to another tab when closing active', () => {
      const tabId1 = useEditorStore.getState().createTab()
      const tabId2 = useEditorStore.getState().createTab()
      
      expect(useEditorStore.getState().activeTabId).toBe(tabId2)
      
      useEditorStore.getState().closeTab(tabId2)
      expect(useEditorStore.getState().activeTabId).toBe(tabId1)
    })
  })
})
```

### 12.2 tests/components/FileSidebar.test.tsx

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FileSidebar from '@/components/Sidebar/FileSidebar'
import { useViewStore } from '@/stores/viewStore'
import { useEditorStore } from '@/stores/editorStore'

describe('FileSidebar', () => {
  beforeEach(() => {
    useViewStore.setState({ sidebarOpen: true, activeView: 'split' })
    useEditorStore.setState({
      tabs: new Map(),
      activeTabId: null,
      untitledCounter: 0,
    })
  })

  it('renders when sidebar is open', () => {
    useEditorStore.getState().createTab(null, 'test')
    render(<FileSidebar />)
    
    expect(screen.getByText('Recent Files')).toBeInTheDocument()
  })

  it('does not render in Render view (FS-13)', () => {
    useViewStore.setState({ activeView: 'render' })
    render(<FileSidebar />)
    
    expect(screen.queryByText('Recent Files')).not.toBeInTheDocument()
  })

  it('shows file tabs with names (FS-07)', () => {
    useEditorStore.getState().createTab('/path/readme.md', 'content')
    render(<FileSidebar />)
    
    expect(screen.getByText('readme.md')).toBeInTheDocument()
  })

  it('shows green dot for saved files (FS-08)', () => {
    const tabId = useEditorStore.getState().createTab('/path/test.md', 'content')
    useEditorStore.getState().markTabSaved(tabId)
    
    render(<FileSidebar />)
    
    const dot = screen.getByLabelText('Saved')
    // Light mode uses #4CAF50 at 60%, dark mode uses #66BB6A at 50%
    expect(dot).toHaveClass('bg-[#4CAF50]/60')
  })

  it('shows red dot for unsaved files (FS-09)', () => {
    const tabId = useEditorStore.getState().createTab('/path/test.md', 'original')
    useEditorStore.getState().markTabSaved(tabId)
    useEditorStore.getState().updateTabContent(tabId, 'modified')
    
    render(<FileSidebar />)
    
    const dot = screen.getByLabelText('Unsaved changes')
    // Light mode uses #F44336 at 60%, dark mode uses #EF5350 at 50%
    expect(dot).toHaveClass('bg-[#F44336]/60')
  })

  it('highlights active tab (FS-10)', () => {
    useEditorStore.getState().createTab(null, 'tab1')
    useEditorStore.getState().createTab(null, 'tab2')
    
    render(<FileSidebar />)
    
    // Active tab should have accent background
    const activeItem = screen.getByText('Untitled 2').closest('button')
    expect(activeItem).toHaveClass('bg-accent/10')
  })

  it('switches tabs on click (FS-06)', () => {
    const tabId1 = useEditorStore.getState().createTab(null, 'content1')
    const tabId2 = useEditorStore.getState().createTab(null, 'content2')
    
    render(<FileSidebar />)
    
    expect(useEditorStore.getState().activeTabId).toBe(tabId2)
    
    fireEvent.click(screen.getByText('Untitled'))
    
    expect(useEditorStore.getState().activeTabId).toBe(tabId1)
  })

  it('closes sidebar on X click', () => {
    useEditorStore.getState().createTab(null, 'test')
    render(<FileSidebar />)
    
    fireEvent.click(screen.getByLabelText('Close sidebar'))
    
    expect(useViewStore.getState().sidebarOpen).toBe(false)
  })
})
```

### 12.3 tests/e2e/files.spec.ts

```typescript
import { test, expect, _electron as electron } from '@playwright/test'
import { resolve } from 'path'

test.describe('File Operations', () => {
  test('⌘N creates new file (FO-01)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('.cm-editor')

    // Create new file
    await window.keyboard.press('Meta+n')
    await window.waitForTimeout(100)

    // Check for new tab in sidebar
    await window.keyboard.press('Meta+\\') // Open sidebar
    await window.waitForSelector('text=Untitled')

    await electronApp.close()
  })

  test('sidebar toggle with ⌘\\ (FS-01)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('.cm-editor')

    // Toggle sidebar open
    await window.keyboard.press('Meta+\\')
    await expect(window.locator('text=Recent Files')).toBeVisible()

    // Toggle sidebar closed
    await window.keyboard.press('Meta+\\')
    await expect(window.locator('text=Recent Files')).not.toBeVisible()

    await electronApp.close()
  })

  test('tab switching is instant, no prompts (FS-06)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('.cm-editor')

    // Create two tabs with content
    await window.keyboard.press('Meta+n')
    await window.click('.cm-content')
    await window.keyboard.type('Tab 1 content')

    await window.keyboard.press('Meta+n')
    await window.click('.cm-content')
    await window.keyboard.type('Tab 2 content')

    // Open sidebar
    await window.keyboard.press('Meta+\\')
    
    // Click first tab
    await window.click('text=Untitled')
    
    // Verify content switched instantly
    await expect(window.locator('.cm-content')).toContainText('Tab 1 content')

    await electronApp.close()
  })

  test('dirty indicator shows dot (TB-03)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('.cm-editor')

    // Type content to make dirty
    await window.click('.cm-content')
    await window.keyboard.type('some content')

    // Check for dirty indicator (• prefix)
    const docName = await window.locator('header').textContent()
    expect(docName).toContain('•')

    await electronApp.close()
  })

  test('sidebar has 240px width (FS-02)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.keyboard.press('Meta+\\')
    
    await window.waitForSelector('text=Recent Files')
    
    const sidebar = await window.$('[aria-hidden="false"]')
    const box = await sidebar?.boundingBox()
    
    expect(box?.width).toBe(240)

    await electronApp.close()
  })
})
```

---

## 13. Acceptance Criteria

### 13.1 P0 Requirements Checklist

**File Sidebar:**
- [ ] Toggled by burger icon or ⌘\ (FS-01)
- [ ] Width is 240px, slides in from left (FS-02)
- [ ] Header shows "Recent Files" with close X (FS-04)
- [ ] Shows up to 20 files (FS-05)
- [ ] Tab switching is instant, no save prompts (FS-06)
- [ ] Each item shows file name + save status dot (FS-07)
- [ ] Green dot (60% opacity) for saved (FS-08)
- [ ] Red dot (60% opacity) for unsaved (FS-09)
- [ ] Unsaved files retain content, cursor, dirty flag (FS-11)
- [ ] ⌘N creates new tab (FS-12)
- [ ] Sidebar not available in Render view (FS-13)

**File Operations:**
- [ ] ⌘N creates new tab (FO-01)
- [ ] ⌘O opens native file dialog (FO-02)
- [ ] Drag-and-drop .md files work (FO-03)
- [ ] ⌘S saves or triggers Save As (FO-04)
- [ ] ⌘⇧S triggers Save As dialog (FO-05)
- [ ] No auto-save (FO-06)
- [ ] Files saved as plain .md (FO-08)
- [ ] Already-open files switch to existing tab (FO-09)

### 13.2 P1 Requirements Checklist

- [ ] Animation: 200ms ease-out in, 150ms ease-in out (FS-03)
- [ ] Active file has highlight or left border (FS-10)

### 13.3 Visual Verification

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Sidebar width | 240px fixed | 240px fixed |
| Sidebar background | `#F8F8F8` | `#181818` |
| Item height | 36px | 36px |
| Save dot size | 6px diameter | 6px diameter |
| Green dot (saved) | `#4CAF50` at 60% | `#66BB6A` at 50% |
| Red dot (unsaved) | `#F44336` at 60% | `#EF5350` at 50% |
| Active item | Left border `#2962FF` | Left border `#448AFF` |

---

## 14. Output for Next Stage

This stage produces:

1. **editorStore** - Multi-tab document state with full tab lifecycle
2. **fileStore** - Recent files list management
3. **FileSidebar** - Tab list with visual states
4. **useFileOperations** - New, Open, Save, Save As hooks
5. **useDragAndDrop** - Drag-and-drop file handling
6. **IPC handlers** - Complete file dialog and save operations

Stage 07 will consume:
- editorStore tab state for draft persistence
- File paths for session state saving
- Tab content for crash recovery

---

## 15. Implementation Notes

### 15.1 IPC Handler Consolidation

The `file:open-external` handler was introduced in Stage 5 for preview link handling. It is included in this stage's file-handlers.ts for completeness. Ensure it is not duplicated during implementation.

### 15.2 EditorState Serialization

CodeMirror 6's `EditorState` objects are complex and not JSON-serializable. For tab switching:
- **In-memory**: Store full `EditorState` reference for instant switching
- **Persistence (Stage 7)**: Only serialize `scrollPosition` and `cursorPosition`

### 15.3 Keyboard Shortcuts Reference

| Shortcut | Action | Menu Event |
|----------|--------|------------|
| ⌘N | New file | `menu:new-file` |
| ⌘O | Open file | `menu:open-file` |
| ⌘S | Save | `menu:save` |
| ⌘⇧S | Save As | `menu:save-as` |
| ⌘\ | Toggle sidebar | `menu:toggle-sidebar` |

All shortcuts are defined in Stage 1's menu.ts and handled via IPC menu events.
