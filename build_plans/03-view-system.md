# Stage 03: View System

## Overview

Implement the three-view system (Markdown, Split, Render) with the view toggle component, draggable split divider, and the Zustand viewStore for state management. This stage establishes the core layout architecture that all panels integrate with.

## Requirements Covered

| ID | Requirement | Priority |
|----|-------------|----------|
| SV-01 | Left panel: Markdown editor. Right panel: rendered preview | P0 |
| SV-02 | Editor panel uses a darker background than the preview panel | P0 |
| SV-03 | Vertical divider line (1px) with centered pill handle (4×32px, radius 2px) | P0 |
| SV-04 | Divider default state: muted grey pill and line | P0 |
| SV-05 | Divider hover/drag state: pill and line turn blue | P0 |
| SV-06 | Divider is draggable to resize panels (min 20%, max 80%) | P0 |
| SV-07 | Double-click divider resets to 50/50 split | P1 |
| SV-08 | Default split ratio: 50/50 | P0 |
| SV-10 | When AI panel opens, both editor and preview shrink equally | P0 |
| RV-01 | Full-width rendered Markdown preview | P0 |
| TB-04 | Center zone: three-segment pill toggle — Markdown / Split / Render | P0 |
| TB-05 | Toggle uses 150ms ease transition, filled active segment | P0 |
| TB-10 | Formatting toolbar hidden in Render-only view | P0 |
| TB-11 | Keyboard shortcuts: ⌘1 (Markdown), ⌘2 (Split), ⌘3 (Render) | P0 |
| WIN-06 | If window width < 600px, auto-switch from split to markdown view | P1 |

**Deferred to later stages:**
- SV-09: Preview updates on content change, debounced 200ms → Stage 05 (Markdown Rendering)
- SV-11: Scroll sync between editor and preview → P2, Stage 05
- RV-02: AI robot icon in preview → Stage 09
- RV-03: Clickable links → Stage 05

## Dependencies from Stage 02

- EditorPanel component
- Theme coordination (isDark)
- Editor ref API

---

## 1. Project Structure for View System

```
src/
├── components/
│   ├── TopBar/
│   │   ├── TopBar.tsx              # Update with ViewToggle
│   │   └── ViewToggle.tsx          # NEW: Three-segment toggle
│   ├── SplitView/
│   │   ├── SplitView.tsx           # NEW: Split layout container
│   │   └── Divider.tsx             # NEW: Draggable divider
│   ├── Preview/
│   │   ├── PreviewPanel.tsx        # NEW: Preview container
│   │   └── MarkdownPreview.tsx     # NEW: Placeholder for Stage 05
│   └── Layout/
│       └── MainContent.tsx         # NEW: View switching logic
├── stores/
│   └── viewStore.ts                # NEW: View state management
└── hooks/
    └── useWindowSize.ts            # NEW: Window resize detection
```

---

## 2. Zustand View Store

### 2.1 src/stores/viewStore.ts

```typescript
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export type ViewMode = 'markdown' | 'split' | 'render'

interface ViewState {
  // View mode
  activeView: ViewMode
  previousView: ViewMode | null  // For restoring after narrow window
  
  // Split view
  splitRatio: number  // 0.0 - 1.0, default 0.5
  
  // Panels
  sidebarOpen: boolean
  aiPanelOpen: boolean
  
  // Window
  windowWidth: number
  isNarrowWindow: boolean  // < 600px
  
  // Actions
  setActiveView: (view: ViewMode) => void
  setSplitRatio: (ratio: number) => void
  resetSplitRatio: () => void
  toggleSidebar: () => void
  toggleAiPanel: () => void
  setWindowWidth: (width: number) => void
}

const MIN_SPLIT_RATIO = 0.2
const MAX_SPLIT_RATIO = 0.8
const DEFAULT_SPLIT_RATIO = 0.5
const NARROW_WINDOW_THRESHOLD = 600

export const useViewStore = create<ViewState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    activeView: 'split',  // Default on launch (TB-04)
    previousView: null,
    splitRatio: DEFAULT_SPLIT_RATIO,  // SV-08
    sidebarOpen: false,
    aiPanelOpen: false,
    windowWidth: typeof window !== 'undefined' ? window.innerWidth : 1200,
    isNarrowWindow: false,

    // Actions
    setActiveView: (view) => {
      const { isNarrowWindow, activeView } = get()
      
      // WIN-06: Prevent split view in narrow windows
      if (view === 'split' && isNarrowWindow) {
        return  // Silently ignore
      }
      
      set({ activeView: view, previousView: activeView })
    },

    setSplitRatio: (ratio) => {
      // SV-06: Clamp to min 20%, max 80%
      const clampedRatio = Math.max(MIN_SPLIT_RATIO, Math.min(MAX_SPLIT_RATIO, ratio))
      set({ splitRatio: clampedRatio })
    },

    resetSplitRatio: () => {
      // SV-07: Reset to 50/50
      set({ splitRatio: DEFAULT_SPLIT_RATIO })
    },

    toggleSidebar: () => {
      set((state) => ({ sidebarOpen: !state.sidebarOpen }))
    },

    toggleAiPanel: () => {
      set((state) => ({ aiPanelOpen: !state.aiPanelOpen }))
    },

    setWindowWidth: (width) => {
      const isNarrow = width < NARROW_WINDOW_THRESHOLD
      const { activeView, previousView, isNarrowWindow } = get()
      
      set({ windowWidth: width, isNarrowWindow: isNarrow })
      
      // WIN-06: Auto-switch from split to markdown when window becomes narrow
      if (isNarrow && !isNarrowWindow && activeView === 'split') {
        set({ activeView: 'markdown', previousView: 'split' })
      }
      
      // Restore split view when window becomes wide enough again
      if (!isNarrow && isNarrowWindow && previousView === 'split') {
        set({ activeView: 'split', previousView: null })
      }
    },
  }))
)

// Selectors for optimized re-renders
export const selectActiveView = (state: ViewState) => state.activeView
export const selectSplitRatio = (state: ViewState) => state.splitRatio
export const selectSidebarOpen = (state: ViewState) => state.sidebarOpen
export const selectAiPanelOpen = (state: ViewState) => state.aiPanelOpen
export const selectIsNarrowWindow = (state: ViewState) => state.isNarrowWindow
```

---

## 3. Window Size Hook

### 3.1 src/hooks/useWindowSize.ts

```typescript
import { useEffect } from 'react'
import { useViewStore } from '@/stores/viewStore'

export function useWindowSize() {
  const setWindowWidth = useViewStore((state) => state.setWindowWidth)

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    // Set initial size
    handleResize()

    // Listen for resize events
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [setWindowWidth])
}
```

---

## 4. View Toggle Component

### 4.1 src/components/TopBar/ViewToggle.tsx

```typescript
import { useViewStore, ViewMode, selectActiveView, selectIsNarrowWindow } from '@/stores/viewStore'

const views: { id: ViewMode; label: string }[] = [
  { id: 'markdown', label: 'Markdown' },
  { id: 'split', label: 'Split' },
  { id: 'render', label: 'Render' },
]

export default function ViewToggle() {
  const activeView = useViewStore(selectActiveView)
  const isNarrowWindow = useViewStore(selectIsNarrowWindow)
  const setActiveView = useViewStore((state) => state.setActiveView)

  return (
    <div
      className="relative flex items-center h-7 bg-gray-100 dark:bg-gray-800 rounded-full p-0.5"
      style={{ width: '240px' }}
      role="tablist"
      aria-label="View mode"
    >
      {/* Sliding background indicator */}
      <div
        className="absolute h-6 bg-accent dark:bg-accent-dark rounded-full transition-transform duration-150 ease-out"
        style={{
          width: 'calc((100% - 4px) / 3)',
          transform: `translateX(calc(${views.findIndex(v => v.id === activeView)} * 100%))`,
        }}
        aria-hidden="true"
      />
      
      {views.map((view) => {
        const isActive = activeView === view.id
        const isDisabled = view.id === 'split' && isNarrowWindow
        
        return (
          <button
            key={view.id}
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            onClick={() => setActiveView(view.id)}
            className={`
              relative z-10 flex-1 h-6 flex items-center justify-center
              font-sans font-medium text-xs rounded-full
              transition-colors duration-150
              ${isActive 
                ? 'text-white' 
                : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark'
              }
              ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            {view.label}
          </button>
        )
      })}
    </div>
  )
}
```

### 4.2 Update src/components/TopBar/TopBar.tsx

```typescript
import ViewToggle from './ViewToggle'
import { useViewStore, selectActiveView } from '@/stores/viewStore'

interface TopBarProps {
  documentName?: string
  isDirty?: boolean
  wordCount?: number
  letterCount?: number
}

export default function TopBar({
  documentName = 'Untitled',
  isDirty = false,
  wordCount = 0,
  letterCount = 0,
}: TopBarProps) {
  const activeView = useViewStore(selectActiveView)
  const showFormattingToolbar = activeView !== 'render'  // TB-10

  return (
    <header 
      className="h-topbar bg-white dark:bg-topbar-dark border-b border-gray-200 dark:border-gray-700 flex items-center"
      style={{ 
        paddingLeft: '80px',
        paddingRight: '16px',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* Left zone - Document name */}
      <div 
        className="flex-shrink-0 font-sans font-medium text-sm text-text-primary-light dark:text-text-primary-dark truncate"
        style={{ maxWidth: '200px' }}
      >
        {isDirty && <span className="text-text-secondary-light dark:text-text-secondary-dark mr-1">•</span>}
        {documentName}
      </div>

      {/* Center zone - View toggle */}
      <div className="flex-1 flex justify-center">
        <ViewToggle />
      </div>

      {/* Right zone - Toolbar & counts */}
      <div 
        className="flex-shrink-0 flex items-center gap-4"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Formatting toolbar placeholder - Stage 04 */}
        {showFormattingToolbar && (
          <div className="text-text-secondary-light dark:text-text-secondary-dark text-xs">
            [Toolbar - Stage 04]
          </div>
        )}
        
        {/* Divider */}
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
        
        {/* Word and letter counts */}
        <div className="flex items-center gap-3 text-text-secondary-light dark:text-text-secondary-dark text-xs font-sans">
          <span>W: {wordCount.toLocaleString()}</span>
          <span>L: {letterCount.toLocaleString()}</span>
        </div>
      </div>
    </header>
  )
}
```

---

## 5. Split View Divider

### 5.1 src/components/SplitView/Divider.tsx

```typescript
import { useState, useCallback, useEffect, useRef } from 'react'
import { useViewStore, selectSplitRatio } from '@/stores/viewStore'

interface DividerProps {
  containerRef: React.RefObject<HTMLDivElement>
}

export default function Divider({ containerRef }: DividerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const splitRatio = useViewStore(selectSplitRatio)
  const setSplitRatio = useViewStore((state) => state.setSplitRatio)
  const resetSplitRatio = useViewStore((state) => state.resetSplitRatio)
  const lastClickTime = useRef(0)

  // Handle mouse move during drag
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return

    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    const newRatio = (e.clientX - rect.left) / rect.width
    
    setSplitRatio(newRatio)
  }, [isDragging, containerRef, setSplitRatio])

  // Handle mouse up to stop dragging
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Attach global mouse listeners when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Handle mouse down to start dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    
    // SV-07: Double-click detection for reset
    const now = Date.now()
    if (now - lastClickTime.current < 300) {
      resetSplitRatio()
      lastClickTime.current = 0
      return
    }
    lastClickTime.current = now
    
    setIsDragging(true)
  }

  const isActive = isDragging || isHovering

  return (
    <div
      className="relative flex items-center justify-center cursor-col-resize"
      style={{ width: '9px', marginLeft: '-4px', marginRight: '-4px' }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={Math.round(splitRatio * 100)}
      aria-valuemin={20}
      aria-valuemax={80}
      aria-label="Resize panels"
    >
      {/* Vertical line - SV-03 */}
      <div 
        className={`
          absolute inset-y-0 w-px transition-colors duration-150
          ${isActive 
            ? 'bg-accent dark:bg-accent-dark' 
            : 'bg-gray-200 dark:bg-gray-700'
          }
        `}
        style={{ left: '4px' }}
      />
      
      {/* Pill handle - SV-03: 4px × 32px, radius 2px */}
      <div 
        className={`
          relative z-10 w-1 h-8 rounded-sm transition-colors duration-150
          ${isActive 
            ? 'bg-accent dark:bg-accent-dark'  // SV-05: Blue on hover/drag
            : 'bg-gray-300 dark:bg-gray-600'   // SV-04: Muted grey default
          }
        `}
      />
    </div>
  )
}
```

### 5.2 src/components/SplitView/SplitView.tsx

```typescript
import { useRef, useMemo } from 'react'
import { useViewStore, selectSplitRatio, selectAiPanelOpen } from '@/stores/viewStore'
import Divider from './Divider'

interface SplitViewProps {
  leftPanel: React.ReactNode
  rightPanel: React.ReactNode
}

// Minimum panel width in pixels (SV-06: represented as percentage)
const MIN_PANEL_WIDTH = 280

export default function SplitView({ leftPanel, rightPanel }: SplitViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const splitRatio = useViewStore(selectSplitRatio)
  const aiPanelOpen = useViewStore(selectAiPanelOpen)

  // SV-10: When AI panel is open, both panels shrink equally
  // AI panel is 360px, so we calculate available space
  const aiPanelWidth = aiPanelOpen ? 360 : 0

  // Calculate panel widths as percentages
  const { leftWidth, rightWidth } = useMemo(() => {
    // These are percentages of the available space (excluding AI panel)
    const left = `${splitRatio * 100}%`
    const right = `${(1 - splitRatio) * 100}%`
    return { leftWidth: left, rightWidth: right }
  }, [splitRatio])

  return (
    <div 
      ref={containerRef}
      className="flex h-full"
      style={{ 
        paddingRight: aiPanelOpen ? `${aiPanelWidth}px` : 0,
        transition: 'padding-right 200ms ease-out',
      }}
    >
      {/* Left panel - Editor (SV-01, SV-02: darker background) */}
      <div 
        className="h-full overflow-hidden bg-editor-light dark:bg-editor-dark"
        style={{ 
          width: leftWidth,
          minWidth: `${MIN_PANEL_WIDTH}px`,
          transition: aiPanelOpen ? 'none' : undefined,
        }}
      >
        {leftPanel}
      </div>

      {/* Divider */}
      <Divider containerRef={containerRef} />

      {/* Right panel - Preview (SV-01, SV-02: lighter background) */}
      <div 
        className="h-full overflow-hidden bg-preview-light dark:bg-preview-dark"
        style={{ 
          width: rightWidth,
          minWidth: `${MIN_PANEL_WIDTH}px`,
          transition: aiPanelOpen ? 'none' : undefined,
        }}
      >
        {rightPanel}
      </div>
    </div>
  )
}
```

---

## 6. Preview Panel (Placeholder)

### 6.1 src/components/Preview/MarkdownPreview.tsx

Placeholder - full implementation in Stage 05:

```typescript
interface MarkdownPreviewProps {
  content: string
  isDark: boolean
  fontSize?: number
}

export default function MarkdownPreview({
  content,
  isDark,
  fontSize = 16,
}: MarkdownPreviewProps) {
  return (
    <div 
      className={`
        h-full w-full overflow-auto p-6
        ${isDark ? 'prose-invert' : ''}
      `}
      style={{ fontSize: `${fontSize}px` }}
    >
      {/* Placeholder - Stage 05 will implement unified/remark rendering */}
      <div className="text-text-secondary-light dark:text-text-secondary-dark text-center py-12">
        <p className="text-sm mb-2">[Preview - Stage 05]</p>
        <pre className="text-xs text-left bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto max-h-96">
          {content || 'No content to preview'}
        </pre>
      </div>
    </div>
  )
}
```

### 6.2 src/components/Preview/PreviewPanel.tsx

```typescript
import MarkdownPreview from './MarkdownPreview'

interface PreviewPanelProps {
  content: string
  isDark: boolean
  fontSize?: number
  fullWidth?: boolean
}

export default function PreviewPanel({
  content,
  isDark,
  fontSize = 16,
  fullWidth = false,
}: PreviewPanelProps) {
  return (
    <div 
      className={`
        relative h-full bg-preview-light dark:bg-preview-dark
        ${fullWidth ? 'w-full' : ''}
      `}
    >
      {/* AI robot icon - Stage 09 */}
      {/* Only shown in Render view (RV-02) */}
      
      <MarkdownPreview
        content={content}
        isDark={isDark}
        fontSize={fontSize}
      />
    </div>
  )
}
```

---

## 7. Main Content Layout

### 7.1 src/components/Layout/MainContent.tsx

```typescript
import { useRef } from 'react'
import { useViewStore, selectActiveView, selectAiPanelOpen } from '@/stores/viewStore'
import EditorPanel from '@/components/Editor/EditorPanel'
import PreviewPanel from '@/components/Preview/PreviewPanel'
import SplitView from '@/components/SplitView/SplitView'
import type { EditorRef } from '@/types/editor'

interface MainContentProps {
  content: string
  onChange: (content: string) => void
  isDark: boolean
  fontSize?: number
  lineNumbers?: boolean
  wordWrap?: boolean
  editorRef?: React.MutableRefObject<EditorRef | null>
}

export default function MainContent({
  content,
  onChange,
  isDark,
  fontSize = 14,
  lineNumbers = false,
  wordWrap = true,
  editorRef,
}: MainContentProps) {
  const activeView = useViewStore(selectActiveView)
  const aiPanelOpen = useViewStore(selectAiPanelOpen)

  // Render based on active view
  switch (activeView) {
    case 'markdown':
      return (
        <div 
          className="h-full"
          style={{ 
            paddingRight: aiPanelOpen ? '360px' : 0,
            transition: 'padding-right 200ms ease-out',
          }}
        >
          <EditorPanel
            content={content}
            onChange={onChange}
            isDark={isDark}
            fontSize={fontSize}
            lineNumbers={lineNumbers}
            wordWrap={wordWrap}
            editorRef={editorRef}
          />
        </div>
      )

    case 'split':
      return (
        <SplitView
          leftPanel={
            <EditorPanel
              content={content}
              onChange={onChange}
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
        <div 
          className="h-full"
          style={{ 
            paddingRight: aiPanelOpen ? '360px' : 0,
            transition: 'padding-right 200ms ease-out',
          }}
        >
          <PreviewPanel
            content={content}
            isDark={isDark}
            fullWidth
          />
        </div>
      )

    default:
      return null
  }
}
```

---

## 8. Update App.tsx

```typescript
import { useEffect, useState, useRef } from 'react'
import TopBar from './components/TopBar/TopBar'
import MainContent from './components/Layout/MainContent'
import { useViewStore, selectActiveView } from './stores/viewStore'
import { useWindowSize } from './hooks/useWindowSize'
import type { EditorRef } from './types/editor'

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [content, setContent] = useState('# Welcome to Marxist\n\nStart writing your Markdown here...\n')
  const [settings, setSettings] = useState({
    fontSize: 14,
    lineNumbers: false,
    wordWrap: true,
  })
  const editorRef = useRef<EditorRef | null>(null)
  const activeView = useViewStore(selectActiveView)
  
  // WIN-06: Track window size for auto-switching
  useWindowSize()

  // Calculate word and letter counts
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const letterCount = content.replace(/\s/g, '').length

  useEffect(() => {
    // Load theme and settings
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

    // Menu event listeners for view switching
    const unsubMarkdown = window.electron.onMenuEvent('menu:view-markdown', () => {
      useViewStore.getState().setActiveView('markdown')
    })
    const unsubSplit = window.electron.onMenuEvent('menu:view-split', () => {
      useViewStore.getState().setActiveView('split')
    })
    const unsubRender = window.electron.onMenuEvent('menu:view-render', () => {
      useViewStore.getState().setActiveView('render')
    })
    const unsubFind = window.electron.onMenuEvent('menu:find', () => {
      editorRef.current?.focus()
    })

    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange)
      unsubMarkdown()
      unsubSplit()
      unsubRender()
      unsubFind()
    }
  }, [])

  const isDark = theme === 'dark'

  return (
    <div className={`h-screen flex flex-col ${isDark ? 'dark' : ''}`}>
      <TopBar
        documentName="Untitled"
        isDirty={false}
        wordCount={wordCount}
        letterCount={letterCount}
      />
      <main className="flex-1 overflow-hidden">
        <MainContent
          content={content}
          onChange={setContent}
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

## 9. Keyboard Shortcut Integration

Update the menu in electron/main/menu.ts to send proper events for ⌘1, ⌘2, ⌘3 (already done in Stage 01). The renderer listens for these events and calls `useViewStore.getState().setActiveView()`.

For direct keyboard handling without menu (optional enhancement):

### 9.1 src/hooks/useViewKeyboardShortcuts.ts

```typescript
import { useEffect } from 'react'
import { useViewStore } from '@/stores/viewStore'

export function useViewKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Cmd+1/2/3 (or Ctrl on Windows/Linux)
      if (!e.metaKey && !e.ctrlKey) return

      const { setActiveView, isNarrowWindow } = useViewStore.getState()

      switch (e.key) {
        case '1':
          e.preventDefault()
          setActiveView('markdown')
          break
        case '2':
          e.preventDefault()
          if (!isNarrowWindow) {
            setActiveView('split')
          }
          break
        case '3':
          e.preventDefault()
          setActiveView('render')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
```

Add to App.tsx:

```typescript
import { useViewKeyboardShortcuts } from './hooks/useViewKeyboardShortcuts'

function App() {
  useViewKeyboardShortcuts()
  // ... rest of component
}
```

---

## 10. Testing

### 10.1 tests/unit/viewStore.test.ts

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useViewStore } from '@/stores/viewStore'

describe('viewStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useViewStore.setState({
      activeView: 'split',
      previousView: null,
      splitRatio: 0.5,
      sidebarOpen: false,
      aiPanelOpen: false,
      windowWidth: 1200,
      isNarrowWindow: false,
    })
  })

  describe('setActiveView', () => {
    it('changes view to markdown', () => {
      useViewStore.getState().setActiveView('markdown')
      expect(useViewStore.getState().activeView).toBe('markdown')
    })

    it('changes view to render', () => {
      useViewStore.getState().setActiveView('render')
      expect(useViewStore.getState().activeView).toBe('render')
    })

    it('saves previous view', () => {
      useViewStore.getState().setActiveView('markdown')
      expect(useViewStore.getState().previousView).toBe('split')
    })

    it('prevents split view in narrow window (WIN-06)', () => {
      useViewStore.setState({ isNarrowWindow: true, activeView: 'markdown' })
      useViewStore.getState().setActiveView('split')
      expect(useViewStore.getState().activeView).toBe('markdown')
    })
  })

  describe('setSplitRatio', () => {
    it('sets ratio within bounds', () => {
      useViewStore.getState().setSplitRatio(0.7)
      expect(useViewStore.getState().splitRatio).toBe(0.7)
    })

    it('clamps ratio to minimum 20% (SV-06)', () => {
      useViewStore.getState().setSplitRatio(0.1)
      expect(useViewStore.getState().splitRatio).toBe(0.2)
    })

    it('clamps ratio to maximum 80% (SV-06)', () => {
      useViewStore.getState().setSplitRatio(0.95)
      expect(useViewStore.getState().splitRatio).toBe(0.8)
    })
  })

  describe('resetSplitRatio', () => {
    it('resets to 50/50 (SV-07)', () => {
      useViewStore.getState().setSplitRatio(0.7)
      useViewStore.getState().resetSplitRatio()
      expect(useViewStore.getState().splitRatio).toBe(0.5)
    })
  })

  describe('setWindowWidth', () => {
    it('auto-switches from split to markdown when window becomes narrow (WIN-06)', () => {
      useViewStore.setState({ activeView: 'split', windowWidth: 800, isNarrowWindow: false })
      useViewStore.getState().setWindowWidth(500)
      
      expect(useViewStore.getState().activeView).toBe('markdown')
      expect(useViewStore.getState().previousView).toBe('split')
      expect(useViewStore.getState().isNarrowWindow).toBe(true)
    })

    it('restores split view when window becomes wide enough', () => {
      useViewStore.setState({ 
        activeView: 'markdown', 
        previousView: 'split',
        windowWidth: 500, 
        isNarrowWindow: true 
      })
      useViewStore.getState().setWindowWidth(800)
      
      expect(useViewStore.getState().activeView).toBe('split')
      expect(useViewStore.getState().previousView).toBe(null)
    })

    it('does not auto-switch if already in markdown view', () => {
      useViewStore.setState({ activeView: 'markdown', previousView: null })
      useViewStore.getState().setWindowWidth(500)
      
      expect(useViewStore.getState().activeView).toBe('markdown')
      expect(useViewStore.getState().previousView).toBe(null)
    })
  })

  describe('toggleSidebar', () => {
    it('toggles sidebar state', () => {
      expect(useViewStore.getState().sidebarOpen).toBe(false)
      useViewStore.getState().toggleSidebar()
      expect(useViewStore.getState().sidebarOpen).toBe(true)
      useViewStore.getState().toggleSidebar()
      expect(useViewStore.getState().sidebarOpen).toBe(false)
    })
  })

  describe('toggleAiPanel', () => {
    it('toggles AI panel state', () => {
      expect(useViewStore.getState().aiPanelOpen).toBe(false)
      useViewStore.getState().toggleAiPanel()
      expect(useViewStore.getState().aiPanelOpen).toBe(true)
    })
  })
})
```

### 10.2 tests/components/ViewToggle.test.tsx

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ViewToggle from '@/components/TopBar/ViewToggle'
import { useViewStore } from '@/stores/viewStore'

describe('ViewToggle', () => {
  beforeEach(() => {
    useViewStore.setState({
      activeView: 'split',
      isNarrowWindow: false,
    })
  })

  it('renders three view options', () => {
    render(<ViewToggle />)
    
    expect(screen.getByText('Markdown')).toBeInTheDocument()
    expect(screen.getByText('Split')).toBeInTheDocument()
    expect(screen.getByText('Render')).toBeInTheDocument()
  })

  it('highlights active view', () => {
    render(<ViewToggle />)
    
    const splitButton = screen.getByRole('tab', { name: 'Split' })
    expect(splitButton).toHaveAttribute('aria-selected', 'true')
  })

  it('changes view on click', () => {
    render(<ViewToggle />)
    
    fireEvent.click(screen.getByText('Markdown'))
    expect(useViewStore.getState().activeView).toBe('markdown')
  })

  it('disables split option in narrow window', () => {
    useViewStore.setState({ isNarrowWindow: true })
    render(<ViewToggle />)
    
    const splitButton = screen.getByRole('tab', { name: 'Split' })
    expect(splitButton).toHaveAttribute('aria-disabled', 'true')
    expect(splitButton).toBeDisabled()
  })
})
```

### 10.3 tests/components/Divider.test.tsx

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Divider from '@/components/SplitView/Divider'
import { useViewStore } from '@/stores/viewStore'
import { useRef } from 'react'

// Wrapper component to provide containerRef
function DividerWrapper() {
  const containerRef = useRef<HTMLDivElement>(null)
  return (
    <div ref={containerRef} style={{ width: '1000px', height: '500px' }}>
      <Divider containerRef={containerRef} />
    </div>
  )
}

describe('Divider', () => {
  beforeEach(() => {
    useViewStore.setState({ splitRatio: 0.5 })
  })

  it('renders divider with correct accessibility attributes', () => {
    render(<DividerWrapper />)
    
    const divider = screen.getByRole('separator')
    expect(divider).toHaveAttribute('aria-orientation', 'vertical')
    expect(divider).toHaveAttribute('aria-valuenow', '50')
  })

  it('has col-resize cursor', () => {
    render(<DividerWrapper />)
    
    const divider = screen.getByRole('separator')
    expect(divider).toHaveClass('cursor-col-resize')
  })

  it('resets to 50/50 on double-click (SV-07)', () => {
    useViewStore.setState({ splitRatio: 0.7 })
    render(<DividerWrapper />)
    
    const divider = screen.getByRole('separator')
    
    // Simulate double-click (two clicks within 300ms)
    fireEvent.mouseDown(divider)
    fireEvent.mouseDown(divider)
    
    expect(useViewStore.getState().splitRatio).toBe(0.5)
  })
})
```

### 10.4 tests/e2e/views.spec.ts

```typescript
import { test, expect, _electron as electron } from '@playwright/test'
import { resolve } from 'path'

test.describe('View System', () => {
  test('default view is Split (TB-04)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('[role="tablist"]')
    
    // Check Split is selected
    const splitTab = await window.$('[role="tab"][aria-selected="true"]')
    const text = await splitTab?.textContent()
    expect(text).toBe('Split')

    await electronApp.close()
  })

  test('⌘1 switches to Markdown view (TB-11)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('[role="tablist"]')
    
    await window.keyboard.press('Meta+1')
    
    // Verify Markdown is now selected
    const markdownTab = await window.$('[role="tab"]:has-text("Markdown")')
    const isSelected = await markdownTab?.getAttribute('aria-selected')
    expect(isSelected).toBe('true')

    await electronApp.close()
  })

  test('⌘2 switches to Split view', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('[role="tablist"]')
    
    // First switch to markdown
    await window.keyboard.press('Meta+1')
    // Then to split
    await window.keyboard.press('Meta+2')
    
    const splitTab = await window.$('[role="tab"]:has-text("Split")')
    const isSelected = await splitTab?.getAttribute('aria-selected')
    expect(isSelected).toBe('true')

    await electronApp.close()
  })

  test('⌘3 switches to Render view', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('[role="tablist"]')
    
    await window.keyboard.press('Meta+3')
    
    const renderTab = await window.$('[role="tab"]:has-text("Render")')
    const isSelected = await renderTab?.getAttribute('aria-selected')
    expect(isSelected).toBe('true')

    await electronApp.close()
  })

  test('split divider is visible in Split view', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('[role="separator"]')
    
    const divider = await window.$('[role="separator"]')
    expect(divider).not.toBeNull()

    await electronApp.close()
  })

  test('formatting toolbar hidden in Render view (TB-10)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('[role="tablist"]')
    
    // Switch to Render view
    await window.keyboard.press('Meta+3')
    await window.waitForTimeout(200) // Wait for transition
    
    // Toolbar placeholder should not be visible
    // (In Stage 04, this will check for actual toolbar)
    const toolbar = await window.$('text=[Toolbar')
    expect(toolbar).toBeNull()

    await electronApp.close()
  })
})
```

---

## 11. Acceptance Criteria

### 11.1 P0 Requirements Checklist

- [ ] Split view shows editor on left, preview on right (SV-01)
- [ ] Editor has darker background than preview (SV-02)
- [ ] Divider is 1px line with 4×32px pill handle (SV-03)
- [ ] Divider default state is muted grey (SV-04)
- [ ] Divider turns blue on hover/drag (SV-05)
- [ ] Divider dragging respects 20%/80% limits (SV-06)
- [ ] Default split ratio is 50/50 (SV-08)
- [ ] AI panel opening shrinks both panels equally (SV-10)
- [ ] Render view shows full-width preview (RV-01)
- [ ] View toggle is pill-shaped with 3 segments (TB-04)
- [ ] Toggle has 150ms slide animation (TB-05)
- [ ] Formatting toolbar hidden in Render view (TB-10)
- [ ] ⌘1/2/3 switch views correctly (TB-11)

### 11.2 P1 Requirements Checklist

- [ ] Double-click divider resets to 50/50 (SV-07)
- [ ] Window <600px auto-switches from split to markdown (WIN-06)
- [ ] View restores when window becomes wide again

### 11.3 Visual Verification

| State | Expected Behavior |
|-------|-------------------|
| Divider default | Grey pill (#CCCCCC light / #444444 dark), grey line |
| Divider hover | Blue pill and line (#2962FF / #448AFF) |
| Divider drag | Blue pill and line, col-resize cursor |
| Toggle active | Filled background, white text |
| Toggle inactive | Transparent background, muted text |
| Split disabled | 50% opacity, cursor-not-allowed |

---

## 12. Output for Next Stage

This stage produces:

1. **viewStore** - Zustand store for view state management
2. **ViewToggle** - Three-segment pill toggle component
3. **SplitView** - Split layout with draggable divider
4. **Divider** - Draggable divider with hover states and double-click reset
5. **PreviewPanel** - Preview container (placeholder rendering)
6. **MainContent** - View switching logic component
7. **Window size tracking** - Auto-switch for narrow windows

Stage 04 will consume:
- viewStore for checking active view (hide toolbar in render)
- MainContent for integrating formatting toolbar actions
- EditorRef API for toolbar button handlers
