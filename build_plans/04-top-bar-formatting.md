# Stage 04: Top Bar & Formatting Toolbar

## Overview

Implement the complete top bar with document name display, 19 formatting toolbar icons with overflow menu, live word/letter counts, and the editor panel corner icons (burger for sidebar, copy for clipboard). This stage integrates with the formatting commands created in Stage 02.

## Requirements Covered

### Top Bar Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| TB-01 | Left zone: document filename only in Google Sans Flex Medium 14px | P0 |
| TB-02 | Untitled files display as `Untitled`, `Untitled 2`, `Untitled 3`... | P0 |
| TB-03 | Unsaved indicator: dot prefix before filename (e.g. `• readme.md`) | P0 |
| TB-06 | Right zone: 19 formatting icons (Google Material Symbols Outlined) | P0 |
| TB-07 | Overflow: when window is narrow, 11 less common icons collapse behind `…` menu | P0 |
| TB-08 | 8 priority icons always visible: Bold, Italic, H1, H2, Bullet list, Number list, Code block, Link | P0 |
| TB-09 | Far right: word count (`W: N`) and letter count (`L: N`), live-updating | P0 |

### Formatting Toolbar Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FT-01 | Bold — wraps selection in `**`, or inserts `**bold text**` placeholder | P0 |
| FT-02 | Italic — wraps selection in `_`, or inserts `_italic text_` placeholder | P0 |
| FT-03 | Underline — wraps selection in `<u></u>` | P0 |
| FT-04 | Strikethrough — wraps selection in `~~` | P0 |
| FT-05 | Indent — adds leading spaces/tab to current line(s) | P0 |
| FT-06 | Outdent — removes leading spaces/tab from current line(s) | P0 |
| FT-07 | H1 — inserts/toggles `# ` at line start | P0 |
| FT-08 | H2 — inserts/toggles `## ` at line start | P0 |
| FT-09 | H3 — inserts/toggles `### ` at line start | P0 |
| FT-10 | H4 — inserts/toggles `#### ` at line start | P0 |
| FT-11 | Bullet list — inserts `- ` at line start | P0 |
| FT-12 | Number list — inserts `1. ` at line start | P0 |
| FT-13 | Checklist — inserts `- [ ] ` at line start | P0 |
| FT-14 | Blockquote — inserts `> ` at line start | P0 |
| FT-15 | Code block — inserts fenced code block markers | P0 |
| FT-16 | Link — wraps selection in `[text](url)` or inserts placeholder | P0 |
| FT-17 | Image — inserts `![alt](url)` placeholder | P0 |
| FT-18 | Table — inserts basic 3×3 Markdown table template | P0 |
| FT-19 | Horizontal rule — inserts `---` on new line | P0 |
| FT-20 | All toolbar actions: if text selected → wrap; if no selection → insert placeholder | P0 |

### Editor Panel Icons

| ID | Requirement | Priority |
|----|-------------|----------|
| VM-04 | Burger icon (top-left of editor) toggles file sidebar | P0 |
| VM-05 | Copy icon (top-right of editor, left of AI icon) copies all raw Markdown | P0 |
| VM-07 | Copy action shows brief "Copied!" feedback | P1 |

## Dependencies from Stage 03

- viewStore for checking active view (hide toolbar in render)
- formattingCommands from Stage 02
- EditorRef API for executing commands

---

## 1. Install Material Symbols

```bash
# Install Material Symbols as a package (for bundling)
npm install material-symbols
```

Or download the icon font for local bundling in `assets/fonts/`.

---

## 2. Project Structure

```
src/
├── components/
│   ├── TopBar/
│   │   ├── TopBar.tsx              # UPDATE: Full implementation
│   │   ├── ViewToggle.tsx          # From Stage 03
│   │   ├── DocumentName.tsx        # NEW: Document title display
│   │   ├── FormattingToolbar.tsx   # NEW: 19 icons with grouping
│   │   ├── OverflowMenu.tsx        # NEW: Dropdown for overflow icons
│   │   ├── ToolbarButton.tsx       # NEW: Reusable icon button
│   │   ├── HeadingButton.tsx       # NEW: Text label buttons (H1-H4)
│   │   └── WordCount.tsx           # NEW: Live word/letter counts
│   ├── Editor/
│   │   ├── EditorPanel.tsx         # UPDATE: Add corner icons
│   │   └── EditorCornerIcons.tsx   # NEW: Burger, Copy, AI icons
│   └── common/
│       ├── Icon.tsx                # NEW: Material Symbol wrapper
│       └── Tooltip.tsx             # NEW: Tooltip component
├── hooks/
│   ├── useFormattingAction.ts      # NEW: Hook to execute formatting
│   └── useClipboard.ts             # NEW: Copy to clipboard hook
└── styles/
    └── material-symbols.css        # NEW: Icon font styles
```

---

## 3. Material Symbols Icon Component

### 3.1 src/styles/material-symbols.css

```css
/* Material Symbols Outlined - bundled locally */
@font-face {
  font-family: 'Material Symbols Outlined';
  font-style: normal;
  font-weight: 100 700;
  src: url('/assets/fonts/MaterialSymbolsOutlined.woff2') format('woff2');
}

.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
}
```

### 3.2 src/components/common/Icon.tsx

```typescript
import { CSSProperties } from 'react'

interface IconProps {
  name: string
  size?: number
  className?: string
  style?: CSSProperties
}

export default function Icon({ name, size = 20, className = '', style }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined select-none ${className}`}
      style={{
        fontSize: `${size}px`,
        width: `${size}px`,
        height: `${size}px`,
        ...style,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
```

### 3.3 src/components/common/Tooltip.tsx

```typescript
import { useState, useRef, ReactNode } from 'react'

interface TooltipProps {
  content: string
  children: ReactNode
  position?: 'top' | 'bottom'
  delay?: number
}

export default function Tooltip({ 
  content, 
  children, 
  position = 'bottom',
  delay = 500 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  return (
    <div 
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          className={`
            absolute z-50 px-2 py-1 text-xs font-sans whitespace-nowrap
            bg-gray-900 dark:bg-gray-700 text-white rounded shadow-lg
            ${position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'}
            left-1/2 -translate-x-1/2
          `}
          role="tooltip"
        >
          {content}
          {/* Arrow */}
          <div
            className={`
              absolute left-1/2 -translate-x-1/2 w-0 h-0
              border-x-4 border-x-transparent
              ${position === 'top' 
                ? 'top-full border-t-4 border-t-gray-900 dark:border-t-gray-700' 
                : 'bottom-full border-b-4 border-b-gray-900 dark:border-b-gray-700'
              }
            `}
          />
        </div>
      )}
    </div>
  )
}
```

---

## 4. Toolbar Button Components

### 4.1 src/components/TopBar/ToolbarButton.tsx

```typescript
import Icon from '@/components/common/Icon'
import Tooltip from '@/components/common/Tooltip'

interface ToolbarButtonProps {
  icon: string
  label: string
  onClick: () => void
  disabled?: boolean
  shortcut?: string
}

export default function ToolbarButton({
  icon,
  label,
  onClick,
  disabled = false,
  shortcut,
}: ToolbarButtonProps) {
  const tooltipContent = shortcut ? `${label} (${shortcut})` : label

  return (
    <Tooltip content={tooltipContent}>
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`
          flex items-center justify-center w-6 h-6 rounded
          transition-colors duration-150
          ${disabled
            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
            : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark hover:bg-gray-100 dark:hover:bg-gray-700'
          }
        `}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <Icon name={icon} size={20} />
      </button>
    </Tooltip>
  )
}
```

### 4.2 src/components/TopBar/HeadingButton.tsx

H1-H4 use text labels instead of icons (per spec):

```typescript
import Tooltip from '@/components/common/Tooltip'

interface HeadingButtonProps {
  level: 1 | 2 | 3 | 4
  onClick: () => void
  disabled?: boolean
}

export default function HeadingButton({
  level,
  onClick,
  disabled = false,
}: HeadingButtonProps) {
  const label = `Heading ${level}`
  const shortcut = level <= 2 ? `⌘⌥${level}` : undefined

  return (
    <Tooltip content={shortcut ? `${label} (${shortcut})` : label}>
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`
          flex items-center justify-center w-6 h-6 rounded
          font-sans font-bold text-xs
          transition-colors duration-150
          ${disabled
            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
            : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark hover:bg-gray-100 dark:hover:bg-gray-700'
          }
        `}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        H{level}
      </button>
    </Tooltip>
  )
}
```

---

## 5. Formatting Action Hook

### 5.1 src/hooks/useFormattingAction.ts

```typescript
import { useCallback } from 'react'
import type { EditorRef } from '@/types/editor'
import { formattingCommands, FormattingCommandName } from '@/components/Editor/extensions/formatting'

export function useFormattingAction(editorRef: React.RefObject<EditorRef | null>) {
  const executeAction = useCallback((action: FormattingCommandName) => {
    const editor = editorRef.current
    if (!editor?.view) return

    const command = formattingCommands[action]
    if (command) {
      command({
        state: editor.view.state,
        dispatch: editor.view.dispatch,
      })
      editor.focus()
    }
  }, [editorRef])

  return executeAction
}
```

---

## 6. Overflow Menu

### 6.1 src/components/TopBar/OverflowMenu.tsx

```typescript
import { useState, useRef, useEffect } from 'react'
import Icon from '@/components/common/Icon'
import ToolbarButton from './ToolbarButton'
import HeadingButton from './HeadingButton'
import type { FormattingCommandName } from '@/components/Editor/extensions/formatting'

interface OverflowItem {
  id: FormattingCommandName
  icon?: string
  label: string
  isHeading?: boolean
  headingLevel?: 1 | 2 | 3 | 4
}

interface OverflowMenuProps {
  items: OverflowItem[]
  onAction: (action: FormattingCommandName) => void
  disabled?: boolean
}

export default function OverflowMenu({ items, onAction, disabled }: OverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleItemClick = (action: FormattingCommandName) => {
    onAction(action)
    setIsOpen(false)
  }

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        aria-label="More formatting options"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={`
          flex items-center justify-center w-6 h-6 rounded
          transition-colors duration-150
          ${disabled
            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
            : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark hover:bg-gray-100 dark:hover:bg-gray-700'
          }
          ${isOpen ? 'bg-gray-100 dark:bg-gray-700' : ''}
        `}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <Icon name="more_horiz" size={20} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          role="menu"
          className="
            absolute right-0 top-full mt-1 z-50
            min-w-[180px] py-1
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            rounded-lg shadow-lg
          "
        >
          {items.map((item) => (
            <button
              key={item.id}
              role="menuitem"
              onClick={() => handleItemClick(item.id)}
              className="
                w-full flex items-center gap-3 px-3 py-2
                text-sm font-sans text-left
                text-text-primary-light dark:text-text-primary-dark
                hover:bg-gray-100 dark:hover:bg-gray-700
                transition-colors duration-150
              "
            >
              {item.isHeading ? (
                <span className="w-5 h-5 flex items-center justify-center font-bold text-xs">
                  H{item.headingLevel}
                </span>
              ) : (
                <Icon name={item.icon!} size={20} />
              )}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## 7. Formatting Toolbar

### 7.1 src/components/TopBar/FormattingToolbar.tsx

```typescript
import { useMemo } from 'react'
import ToolbarButton from './ToolbarButton'
import HeadingButton from './HeadingButton'
import OverflowMenu from './OverflowMenu'
import { useViewStore } from '@/stores/viewStore'
import type { FormattingCommandName } from '@/components/Editor/extensions/formatting'

interface FormattingToolbarProps {
  onAction: (action: FormattingCommandName) => void
  windowWidth: number
  disabled?: boolean
}

// Toolbar configuration with grouping
const toolbarGroups = [
  // Group 1: Text formatting
  {
    id: 'text',
    items: [
      { id: 'bold' as const, icon: 'format_bold', label: 'Bold', shortcut: '⌘B', priority: true },
      { id: 'italic' as const, icon: 'format_italic', label: 'Italic', shortcut: '⌘I', priority: true },
      { id: 'underline' as const, icon: 'format_underline', label: 'Underline', priority: false },
      { id: 'strikethrough' as const, icon: 'strikethrough_s', label: 'Strikethrough', priority: false },
    ],
  },
  // Group 2: Indentation
  {
    id: 'indent',
    items: [
      { id: 'indent' as const, icon: 'format_indent_increase', label: 'Indent', priority: false },
      { id: 'outdent' as const, icon: 'format_indent_decrease', label: 'Outdent', priority: false },
    ],
  },
  // Group 3: Headings
  {
    id: 'headings',
    items: [
      { id: 'heading1' as const, label: 'Heading 1', isHeading: true, headingLevel: 1 as const, priority: true },
      { id: 'heading2' as const, label: 'Heading 2', isHeading: true, headingLevel: 2 as const, priority: true },
      { id: 'heading3' as const, label: 'Heading 3', isHeading: true, headingLevel: 3 as const, priority: false },
      { id: 'heading4' as const, label: 'Heading 4', isHeading: true, headingLevel: 4 as const, priority: false },
    ],
  },
  // Group 4: Lists
  {
    id: 'lists',
    items: [
      { id: 'bulletList' as const, icon: 'format_list_bulleted', label: 'Bullet list', priority: true },
      { id: 'numberList' as const, icon: 'format_list_numbered', label: 'Number list', priority: true },
      { id: 'checklist' as const, icon: 'checklist', label: 'Checklist', priority: false },
    ],
  },
  // Group 5: Blocks
  {
    id: 'blocks',
    items: [
      { id: 'blockquote' as const, icon: 'format_quote', label: 'Blockquote', priority: false },
      { id: 'codeBlock' as const, icon: 'code_blocks', label: 'Code block', priority: true },
    ],
  },
  // Group 6: Insert
  {
    id: 'insert',
    items: [
      { id: 'link' as const, icon: 'link', label: 'Link', shortcut: '⌘K', priority: true },
      { id: 'image' as const, icon: 'image', label: 'Image', priority: false },
      { id: 'table' as const, icon: 'table_chart', label: 'Table', priority: false },
      { id: 'horizontalRule' as const, icon: 'horizontal_rule', label: 'Horizontal rule', priority: false },
    ],
  },
]

// Breakpoint for showing overflow menu (approximate width where all icons don't fit)
const OVERFLOW_BREAKPOINT = 900

export default function FormattingToolbar({
  onAction,
  windowWidth,
  disabled = false,
}: FormattingToolbarProps) {
  const showOverflow = windowWidth < OVERFLOW_BREAKPOINT

  // Separate priority and overflow items
  const { priorityItems, overflowItems } = useMemo(() => {
    const priority: typeof toolbarGroups = []
    const overflow: Array<{
      id: FormattingCommandName
      icon?: string
      label: string
      isHeading?: boolean
      headingLevel?: 1 | 2 | 3 | 4
    }> = []

    toolbarGroups.forEach((group) => {
      const priorityGroupItems = group.items.filter((item) => item.priority)
      const overflowGroupItems = group.items.filter((item) => !item.priority)

      if (priorityGroupItems.length > 0) {
        priority.push({ ...group, items: priorityGroupItems })
      }

      overflowGroupItems.forEach((item) => {
        overflow.push({
          id: item.id,
          icon: 'icon' in item ? item.icon : undefined,
          label: item.label,
          isHeading: 'isHeading' in item ? item.isHeading : undefined,
          headingLevel: 'headingLevel' in item ? item.headingLevel : undefined,
        })
      })
    })

    return { priorityItems: priority, overflowItems: overflow }
  }, [])

  // Render all items or just priority items
  const groupsToRender = showOverflow ? priorityItems : toolbarGroups

  return (
    <div className="flex items-center">
      {groupsToRender.map((group, groupIndex) => (
        <div key={group.id} className="flex items-center">
          {/* Group separator (16px gap between groups) */}
          {groupIndex > 0 && <div className="w-4" />}
          
          {/* Items within group (8px gap) */}
          <div className="flex items-center gap-2">
            {group.items.map((item) => {
              if ('isHeading' in item && item.isHeading) {
                return (
                  <HeadingButton
                    key={item.id}
                    level={item.headingLevel!}
                    onClick={() => onAction(item.id)}
                    disabled={disabled}
                  />
                )
              }

              return (
                <ToolbarButton
                  key={item.id}
                  icon={item.icon!}
                  label={item.label}
                  onClick={() => onAction(item.id)}
                  disabled={disabled}
                  shortcut={'shortcut' in item ? item.shortcut : undefined}
                />
              )
            })}
          </div>
        </div>
      ))}

      {/* Overflow menu */}
      {showOverflow && overflowItems.length > 0 && (
        <>
          <div className="w-4" />
          <OverflowMenu
            items={overflowItems}
            onAction={onAction}
            disabled={disabled}
          />
        </>
      )}
    </div>
  )
}
```

---

## 8. Document Name & Word Count

### 8.1 src/components/TopBar/DocumentName.tsx

```typescript
interface DocumentNameProps {
  name: string
  isDirty: boolean
}

export default function DocumentName({ name, isDirty }: DocumentNameProps) {
  return (
    <div
      className="font-sans font-medium text-sm text-text-primary-light dark:text-text-primary-dark truncate"
      style={{ maxWidth: '200px' }}
      title={name}
    >
      {/* TB-03: Unsaved indicator dot prefix */}
      {isDirty && (
        <span className="text-text-secondary-light dark:text-text-secondary-dark mr-1">
          •
        </span>
      )}
      {name}
    </div>
  )
}
```

### 8.2 src/components/TopBar/WordCount.tsx

```typescript
interface WordCountProps {
  wordCount: number
  letterCount: number
}

export default function WordCount({ wordCount, letterCount }: WordCountProps) {
  return (
    <div className="flex items-center gap-3 text-text-secondary-light dark:text-text-secondary-dark text-xs font-sans">
      {/* TB-09: Word count format W: N */}
      <span>W: {wordCount.toLocaleString()}</span>
      {/* TB-09: Letter count format L: N */}
      <span>L: {letterCount.toLocaleString()}</span>
    </div>
  )
}
```

---

## 9. Updated TopBar

### 9.1 src/components/TopBar/TopBar.tsx

```typescript
import { useRef } from 'react'
import ViewToggle from './ViewToggle'
import DocumentName from './DocumentName'
import FormattingToolbar from './FormattingToolbar'
import WordCount from './WordCount'
import { useViewStore, selectActiveView } from '@/stores/viewStore'
import { useFormattingAction } from '@/hooks/useFormattingAction'
import type { EditorRef } from '@/types/editor'

interface TopBarProps {
  documentName: string
  isDirty: boolean
  wordCount: number
  letterCount: number
  windowWidth: number
  editorRef: React.RefObject<EditorRef | null>
}

export default function TopBar({
  documentName,
  isDirty,
  wordCount,
  letterCount,
  windowWidth,
  editorRef,
}: TopBarProps) {
  const activeView = useViewStore(selectActiveView)
  const showFormattingToolbar = activeView !== 'render'  // TB-10
  const executeAction = useFormattingAction(editorRef)

  return (
    <header 
      className="h-topbar bg-white dark:bg-topbar-dark border-b border-gray-200 dark:border-gray-700 flex items-center"
      style={{ 
        paddingLeft: '80px',
        paddingRight: '16px',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* Left zone - Document name (TB-01, TB-02, TB-03) */}
      <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <DocumentName name={documentName} isDirty={isDirty} />
      </div>

      {/* Center zone - View toggle */}
      <div className="flex-1 flex justify-center">
        <ViewToggle />
      </div>

      {/* Right zone - Toolbar & counts */}
      <div 
        className="flex items-center gap-4"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* TB-06, TB-07, TB-08: Formatting toolbar with overflow */}
        {showFormattingToolbar && (
          <FormattingToolbar
            onAction={executeAction}
            windowWidth={windowWidth}
            disabled={activeView === 'render'}
          />
        )}
        
        {/* Divider (1px vertical line, 16px tall) */}
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
        
        {/* Word and letter counts (TB-09) */}
        <WordCount wordCount={wordCount} letterCount={letterCount} />
      </div>
    </header>
  )
}
```

---

## 10. Editor Panel Corner Icons

### 10.1 src/hooks/useClipboard.ts

```typescript
import { useState, useCallback } from 'react'

interface UseClipboardResult {
  copy: (text: string) => Promise<boolean>
  copied: boolean
}

export function useClipboard(resetDelay = 2000): UseClipboardResult {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      
      setTimeout(() => {
        setCopied(false)
      }, resetDelay)
      
      return true
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      return false
    }
  }, [resetDelay])

  return { copy, copied }
}
```

### 10.2 src/components/Editor/EditorCornerIcons.tsx

```typescript
import { useState } from 'react'
import Icon from '@/components/common/Icon'
import Tooltip from '@/components/common/Tooltip'
import { useViewStore } from '@/stores/viewStore'
import { useClipboard } from '@/hooks/useClipboard'

interface EditorCornerIconsProps {
  content: string
  showBurger?: boolean
  showCopy?: boolean
  showAI?: boolean
}

export default function EditorCornerIcons({
  content,
  showBurger = true,
  showCopy = true,
  showAI = true,
}: EditorCornerIconsProps) {
  const toggleSidebar = useViewStore((state) => state.toggleSidebar)
  const toggleAiPanel = useViewStore((state) => state.toggleAiPanel)
  const { copy, copied } = useClipboard()

  const handleCopy = async () => {
    await copy(content)
  }

  return (
    <>
      {/* Top-left: Burger icon for sidebar (VM-04) */}
      {showBurger && (
        <div className="absolute top-3 left-3 z-10">
          <Tooltip content="Toggle sidebar (⌘\)">
            <button
              onClick={toggleSidebar}
              aria-label="Toggle file sidebar"
              className="
                flex items-center justify-center w-8 h-8 rounded
                bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm
                text-text-secondary-light dark:text-text-secondary-dark
                hover:text-text-primary-light dark:hover:text-text-primary-dark
                hover:bg-white dark:hover:bg-gray-800
                transition-colors duration-150
                shadow-sm
              "
            >
              <Icon name="menu" size={20} />
            </button>
          </Tooltip>
        </div>
      )}

      {/* Top-right: Copy and AI icons (VM-05, VM-06) */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {/* Copy icon (VM-05) */}
        {showCopy && (
          <Tooltip content={copied ? 'Copied!' : 'Copy Markdown (⌘⇧C)'}>
            <button
              onClick={handleCopy}
              aria-label="Copy raw Markdown"
              className={`
                flex items-center justify-center w-8 h-8 rounded
                bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm
                transition-colors duration-150
                shadow-sm
                ${copied
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark hover:bg-white dark:hover:bg-gray-800'
                }
              `}
            >
              <Icon name={copied ? 'check' : 'content_copy'} size={20} />
            </button>
          </Tooltip>
        )}

        {/* AI icon (VM-06) - placeholder, full implementation in Stage 09 */}
        {showAI && (
          <Tooltip content="Toggle AI panel (⌘⇧A)">
            <button
              onClick={toggleAiPanel}
              aria-label="Toggle AI assistant"
              className="
                flex items-center justify-center w-8 h-8 rounded
                bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm
                text-text-secondary-light dark:text-text-secondary-dark
                hover:text-text-primary-light dark:hover:text-text-primary-dark
                hover:bg-white dark:hover:bg-gray-800
                transition-colors duration-150
                shadow-sm
              "
            >
              <Icon name="robot" size={20} />
            </button>
          </Tooltip>
        )}
      </div>
    </>
  )
}
```

### 10.3 Update src/components/Editor/EditorPanel.tsx

```typescript
import MarkdownEditor from './MarkdownEditor'
import EditorCornerIcons from './EditorCornerIcons'
import type { EditorRef } from '@/types/editor'

interface EditorPanelProps {
  content: string
  onChange: (content: string) => void
  isDark: boolean
  fontSize?: number
  lineNumbers?: boolean
  wordWrap?: boolean
  readOnly?: boolean
  editorRef?: React.MutableRefObject<EditorRef | null>
  showCornerIcons?: boolean
}

export default function EditorPanel({
  content,
  onChange,
  isDark,
  fontSize = 14,
  lineNumbers = false,
  wordWrap = true,
  readOnly = false,
  editorRef,
  showCornerIcons = true,
}: EditorPanelProps) {
  return (
    <div className="relative h-full w-full bg-editor-light dark:bg-editor-dark">
      {/* Corner icons */}
      {showCornerIcons && (
        <EditorCornerIcons
          content={content}
          showBurger={true}
          showCopy={true}
          showAI={true}
        />
      )}
      
      <MarkdownEditor
        content={content}
        onChange={onChange}
        isDark={isDark}
        fontSize={fontSize}
        lineNumbers={lineNumbers}
        wordWrap={wordWrap}
        readOnly={readOnly}
        editorRef={editorRef}
      />
    </div>
  )
}
```

---

## 11. Update App.tsx

```typescript
import { useEffect, useState, useRef } from 'react'
import TopBar from './components/TopBar/TopBar'
import MainContent from './components/Layout/MainContent'
import { useViewStore, selectActiveView } from './stores/viewStore'
import { useWindowSize } from './hooks/useWindowSize'
import { useViewKeyboardShortcuts } from './hooks/useViewKeyboardShortcuts'
import type { EditorRef } from './types/editor'

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [content, setContent] = useState('# Welcome to Marxist\n\nStart writing your Markdown here...\n')
  const [settings, setSettings] = useState({
    fontSize: 14,
    lineNumbers: false,
    wordWrap: true,
  })
  const [documentName, setDocumentName] = useState('Untitled')
  const [isDirty, setIsDirty] = useState(false)
  const [savedContent, setSavedContent] = useState('')
  
  const editorRef = useRef<EditorRef | null>(null)
  const windowWidth = useViewStore((state) => state.windowWidth)
  
  useWindowSize()
  useViewKeyboardShortcuts()

  // Calculate word and letter counts
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const letterCount = content.replace(/\s/g, '').length

  // Track dirty state
  useEffect(() => {
    setIsDirty(content !== savedContent)
  }, [content, savedContent])

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
        documentName={documentName}
        isDirty={isDirty}
        wordCount={wordCount}
        letterCount={letterCount}
        windowWidth={windowWidth}
        editorRef={editorRef}
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

## 12. Testing

### 12.1 tests/components/FormattingToolbar.test.tsx

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FormattingToolbar from '@/components/TopBar/FormattingToolbar'

describe('FormattingToolbar', () => {
  const mockOnAction = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all 8 priority icons at wide width', () => {
    render(
      <FormattingToolbar
        onAction={mockOnAction}
        windowWidth={1200}
      />
    )

    // Check priority icons are visible
    expect(screen.getByLabelText('Bold')).toBeInTheDocument()
    expect(screen.getByLabelText('Italic')).toBeInTheDocument()
    expect(screen.getByLabelText('Heading 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Heading 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Bullet list')).toBeInTheDocument()
    expect(screen.getByLabelText('Number list')).toBeInTheDocument()
    expect(screen.getByLabelText('Code block')).toBeInTheDocument()
    expect(screen.getByLabelText('Link')).toBeInTheDocument()
  })

  it('shows overflow menu at narrow width (TB-07)', () => {
    render(
      <FormattingToolbar
        onAction={mockOnAction}
        windowWidth={800}
      />
    )

    // Overflow button should be visible
    expect(screen.getByLabelText('More formatting options')).toBeInTheDocument()
    
    // Non-priority icons should not be visible in main toolbar
    expect(screen.queryByLabelText('Underline')).not.toBeInTheDocument()
  })

  it('calls onAction when button clicked', () => {
    render(
      <FormattingToolbar
        onAction={mockOnAction}
        windowWidth={1200}
      />
    )

    fireEvent.click(screen.getByLabelText('Bold'))
    expect(mockOnAction).toHaveBeenCalledWith('bold')
  })

  it('opens overflow menu on click', () => {
    render(
      <FormattingToolbar
        onAction={mockOnAction}
        windowWidth={800}
      />
    )

    const overflowButton = screen.getByLabelText('More formatting options')
    fireEvent.click(overflowButton)

    // Menu should be visible with overflow items
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Underline/i })).toBeInTheDocument()
  })

  it('closes overflow menu after selecting item', () => {
    render(
      <FormattingToolbar
        onAction={mockOnAction}
        windowWidth={800}
      />
    )

    // Open menu
    fireEvent.click(screen.getByLabelText('More formatting options'))
    
    // Click item
    fireEvent.click(screen.getByRole('menuitem', { name: /Underline/i }))
    
    // Menu should close
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(mockOnAction).toHaveBeenCalledWith('underline')
  })

  it('disables buttons when disabled prop is true', () => {
    render(
      <FormattingToolbar
        onAction={mockOnAction}
        windowWidth={1200}
        disabled={true}
      />
    )

    expect(screen.getByLabelText('Bold')).toBeDisabled()
    expect(screen.getByLabelText('Italic')).toBeDisabled()
  })
})
```

### 12.2 tests/components/DocumentName.test.tsx

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DocumentName from '@/components/TopBar/DocumentName'

describe('DocumentName', () => {
  it('renders filename (TB-01)', () => {
    render(<DocumentName name="readme.md" isDirty={false} />)
    expect(screen.getByText('readme.md')).toBeInTheDocument()
  })

  it('shows unsaved indicator when dirty (TB-03)', () => {
    render(<DocumentName name="readme.md" isDirty={true} />)
    expect(screen.getByText('•')).toBeInTheDocument()
  })

  it('does not show indicator when saved', () => {
    render(<DocumentName name="readme.md" isDirty={false} />)
    expect(screen.queryByText('•')).not.toBeInTheDocument()
  })
})
```

### 12.3 tests/components/EditorCornerIcons.test.tsx

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import EditorCornerIcons from '@/components/Editor/EditorCornerIcons'
import { useViewStore } from '@/stores/viewStore'

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
})

describe('EditorCornerIcons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useViewStore.setState({ sidebarOpen: false, aiPanelOpen: false })
  })

  it('renders burger icon (VM-04)', () => {
    render(<EditorCornerIcons content="test" />)
    expect(screen.getByLabelText('Toggle file sidebar')).toBeInTheDocument()
  })

  it('renders copy icon (VM-05)', () => {
    render(<EditorCornerIcons content="test" />)
    expect(screen.getByLabelText('Copy raw Markdown')).toBeInTheDocument()
  })

  it('toggles sidebar on burger click', () => {
    render(<EditorCornerIcons content="test" />)
    
    fireEvent.click(screen.getByLabelText('Toggle file sidebar'))
    expect(useViewStore.getState().sidebarOpen).toBe(true)
  })

  it('copies content to clipboard on copy click', async () => {
    const testContent = '# Test Markdown'
    render(<EditorCornerIcons content={testContent} />)
    
    fireEvent.click(screen.getByLabelText('Copy raw Markdown'))
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testContent)
    })
  })

  it('shows copied feedback after copying (VM-07)', async () => {
    render(<EditorCornerIcons content="test" />)
    
    fireEvent.click(screen.getByLabelText('Copy raw Markdown'))
    
    await waitFor(() => {
      // Check icon changed to checkmark
      const button = screen.getByLabelText('Copy raw Markdown')
      expect(button).toHaveClass('text-green-600')
    })
  })

  it('toggles AI panel on AI icon click', () => {
    render(<EditorCornerIcons content="test" />)
    
    fireEvent.click(screen.getByLabelText('Toggle AI assistant'))
    expect(useViewStore.getState().aiPanelOpen).toBe(true)
  })
})
```

### 12.4 tests/e2e/toolbar.spec.ts

```typescript
import { test, expect, _electron as electron } from '@playwright/test'
import { resolve } from 'path'

test.describe('Formatting Toolbar', () => {
  test('shows 8 priority icons (TB-08)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('[aria-label="Bold"]')

    // Verify priority icons
    await expect(window.locator('[aria-label="Bold"]')).toBeVisible()
    await expect(window.locator('[aria-label="Italic"]')).toBeVisible()
    await expect(window.locator('[aria-label="Heading 1"]')).toBeVisible()
    await expect(window.locator('[aria-label="Heading 2"]')).toBeVisible()
    await expect(window.locator('[aria-label="Bullet list"]')).toBeVisible()
    await expect(window.locator('[aria-label="Number list"]')).toBeVisible()
    await expect(window.locator('[aria-label="Code block"]')).toBeVisible()
    await expect(window.locator('[aria-label="Link"]')).toBeVisible()

    await electronApp.close()
  })

  test('bold button wraps selection (FT-01)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('.cm-editor')

    // Type text and select it
    await window.click('.cm-content')
    await window.keyboard.type('hello')
    await window.keyboard.press('Meta+a')

    // Click bold button
    await window.click('[aria-label="Bold"]')

    // Verify bold markers applied
    const content = await window.locator('.cm-content').textContent()
    expect(content).toContain('**')

    await electronApp.close()
  })

  test('word count updates live (TB-09)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('.cm-editor')

    // Clear and type
    await window.click('.cm-content')
    await window.keyboard.press('Meta+a')
    await window.keyboard.type('one two three')

    // Check word count
    const wordCountText = await window.locator('text=W:').textContent()
    expect(wordCountText).toContain('3')

    await electronApp.close()
  })

  test('toolbar hidden in Render view (TB-10)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    
    // Switch to Render view
    await window.keyboard.press('Meta+3')
    await window.waitForTimeout(200)

    // Toolbar buttons should not be visible
    await expect(window.locator('[aria-label="Bold"]')).not.toBeVisible()

    await electronApp.close()
  })

  test('copy button copies content (VM-05)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('.cm-editor')

    // Type content
    await window.click('.cm-content')
    await window.keyboard.press('Meta+a')
    await window.keyboard.type('# Test Content')

    // Click copy button
    await window.click('[aria-label="Copy raw Markdown"]')

    // Verify clipboard (note: clipboard access in Playwright can be tricky)
    // For this test, we verify the button shows "copied" state
    await expect(window.locator('[aria-label="Copy raw Markdown"]')).toHaveClass(/text-green/)

    await electronApp.close()
  })
})
```

---

## 13. Acceptance Criteria

### 13.1 P0 Requirements Checklist

**Top Bar:**
- [ ] Document name displayed in Google Sans Flex Medium 14px (TB-01)
- [ ] Untitled files show "Untitled", "Untitled 2", etc. (TB-02)
- [ ] Dirty indicator shows dot prefix (TB-03)
- [ ] 19 formatting icons present (TB-06)
- [ ] 11 icons collapse to overflow menu when narrow (TB-07)
- [ ] 8 priority icons always visible (TB-08)
- [ ] Word count shows "W: N" format, live-updating (TB-09)
- [ ] Letter count shows "L: N" format, live-updating (TB-09)

**Formatting Actions (all P0):**
- [ ] FT-01: Bold wraps/inserts `**text**`
- [ ] FT-02: Italic wraps/inserts `_text_`
- [ ] FT-03: Underline wraps/inserts `<u>text</u>`
- [ ] FT-04: Strikethrough wraps/inserts `~~text~~`
- [ ] FT-05: Indent adds leading spaces
- [ ] FT-06: Outdent removes leading spaces
- [ ] FT-07: H1 toggles `# `
- [ ] FT-08: H2 toggles `## `
- [ ] FT-09: H3 toggles `### `
- [ ] FT-10: H4 toggles `#### `
- [ ] FT-11: Bullet list inserts `- `
- [ ] FT-12: Number list inserts `1. `
- [ ] FT-13: Checklist inserts `- [ ] `
- [ ] FT-14: Blockquote inserts `> `
- [ ] FT-15: Code block inserts fenced block
- [ ] FT-16: Link wraps/inserts `[text](url)`
- [ ] FT-17: Image inserts `![alt](url)`
- [ ] FT-18: Table inserts 3×3 template
- [ ] FT-19: Horizontal rule inserts `---`
- [ ] FT-20: Selection → wrap, no selection → insert placeholder

**Editor Panel Icons:**
- [ ] Burger icon toggles sidebar (VM-04)
- [ ] Copy icon copies all raw Markdown (VM-05)

### 13.2 P1 Requirements Checklist

- [ ] Copy action shows "Copied!" feedback (VM-07)

### 13.3 Icon Reference Verification

| Icon | Material Symbol Name | Function |
|------|---------------------|----------|
| Bold | `format_bold` | Wrap in `**` |
| Italic | `format_italic` | Wrap in `_` |
| Underline | `format_underline` | Wrap in `<u>` |
| Strikethrough | `strikethrough_s` | Wrap in `~~` |
| Indent | `format_indent_increase` | Add leading space |
| Outdent | `format_indent_decrease` | Remove leading space |
| Bullet list | `format_list_bulleted` | Insert `- ` |
| Number list | `format_list_numbered` | Insert `1. ` |
| Checklist | `checklist` | Insert `- [ ] ` |
| Blockquote | `format_quote` | Insert `> ` |
| Code block | `code_blocks` | Insert fenced block |
| Link | `link` | Insert `[](url)` |
| Image | `image` | Insert `![]()` |
| Table | `table_chart` | Insert table template |
| Horizontal rule | `horizontal_rule` | Insert `---` |
| Overflow | `more_horiz` | Show overflow menu |
| Burger | `menu` | Toggle sidebar |
| Copy | `content_copy` | Copy to clipboard |
| AI | `robot` | Toggle AI panel |

---

## 14. Output for Next Stage

This stage produces:

1. **FormattingToolbar** - 19 icons with grouping, overflow, tooltips
2. **OverflowMenu** - Dropdown for overflow icons
3. **DocumentName** - Filename with dirty indicator
4. **WordCount** - Live word and letter counts
5. **EditorCornerIcons** - Burger, copy, AI icons
6. **useFormattingAction** - Hook to execute formatting commands
7. **useClipboard** - Copy to clipboard with feedback

Stage 05 will consume:
- Content from editor for Markdown rendering
- isDark theme for preview styling
