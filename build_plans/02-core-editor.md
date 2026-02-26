# Stage 02: Core Editor

## Overview

Implement the CodeMirror 6-based Markdown editor with custom syntax highlighting themes, GFM support, find/replace, and the foundational editor infrastructure that all editing features build upon.

## Requirements Covered

| ID | Requirement | Priority |
|----|-------------|----------|
| ED-01 | Built on CodeMirror 6 with `@codemirror/lang-markdown` and GFM | P0 |
| ED-02 | Custom syntax highlight theme with distinct colors per token type | P0 |
| ED-03 | Token coloring: headings, bold, italic, strikethrough, links, code, blockquotes, lists, HTML, YAML | P0 |
| ED-04 | Separate light and dark highlight themes | P0 |
| ED-05 | Standard keyboard shortcuts: ⌘B bold, ⌘I italic, ⌘E inline code | P0 |
| ED-06 | Find and replace: ⌘F opens CodeMirror's built-in search panel | P0 |
| ED-07 | Line numbers: off by default, configurable in settings | P1 |
| ED-08 | Word wrap: on by default, configurable in settings | P0 |
| VM-01 | Full-width CodeMirror 6 editor | P0 |
| VM-02 | Syntax-highlighted Markdown with custom color theme (light + dark) | P0 |
| VM-03 | Font: IBM Plex Mono, default 14px, configurable in settings | P0 |

## Dependencies from Stage 01

- React app shell with Tailwind CSS
- Theme detection (light/dark) in App.tsx
- Font files bundled in `/assets/fonts/`
- Settings store structure (for font size, line numbers, word wrap)
- IPC bridge for settings access

---

## 1. Install CodeMirror Dependencies

```bash
# Core CodeMirror packages
npm install @codemirror/state @codemirror/view @codemirror/commands

# Language support
npm install @codemirror/lang-markdown @codemirror/language @codemirror/language-data

# Search functionality
npm install @codemirror/search

# Autocomplete (for code blocks)
npm install @codemirror/autocomplete

# Additional utilities
npm install @lezer/highlight
```

---

## 2. Project Structure for Editor

```
src/
├── components/
│   └── Editor/
│       ├── MarkdownEditor.tsx      # Main CodeMirror wrapper
│       ├── EditorPanel.tsx         # Container with corner icons
│       ├── extensions/
│       │   ├── index.ts            # Extension bundle
│       │   ├── markdown.ts         # Markdown language config
│       │   ├── keybindings.ts      # Custom keybindings
│       │   └── formatting.ts       # Formatting commands
│       └── themes/
│           ├── index.ts            # Theme exports
│           ├── lightTheme.ts       # Light mode highlight theme
│           ├── darkTheme.ts        # Dark mode highlight theme
│           └── editorTheme.ts      # Base editor styling
├── hooks/
│   └── useCodeMirror.ts            # CodeMirror React integration hook
└── types/
    └── editor.ts                   # Editor-related types
```

---

## 3. Core Editor Implementation

### 3.1 src/types/editor.ts

```typescript
import type { EditorState } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

export interface EditorConfig {
  fontSize: number
  lineNumbers: boolean
  wordWrap: boolean
  theme: 'light' | 'dark'
}

export interface EditorSnapshot {
  content: string
  selection: { anchor: number; head: number }
  scrollTop: number
  scrollLeft: number
}

export interface EditorRef {
  view: EditorView | null
  getContent: () => string
  setContent: (content: string) => void
  getSnapshot: () => EditorSnapshot
  restoreSnapshot: (snapshot: EditorSnapshot) => void
  focus: () => void
  setReadOnly: (readOnly: boolean) => void
}

export type FormattingAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'inlineCode'
  | 'codeBlock'
  | 'link'
  | 'image'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'bulletList'
  | 'numberList'
  | 'checklist'
  | 'blockquote'
  | 'horizontalRule'
  | 'table'
  | 'indent'
  | 'outdent'
```

### 3.2 src/components/Editor/themes/lightTheme.ts

Based on exact colors from 04-technical-architecture.md:

```typescript
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

export const lightHighlightStyle = HighlightStyle.define([
  // Headings
  { tag: tags.heading1, color: '#D32F2F', fontWeight: 'bold' },
  { tag: tags.heading2, color: '#D32F2F', fontWeight: 'bold' },
  { tag: tags.heading3, color: '#D32F2F', fontWeight: 'bold' },
  { tag: tags.heading4, color: '#D32F2F', fontWeight: 'bold' },
  { tag: tags.heading5, color: '#D32F2F', fontWeight: 'bold' },
  { tag: tags.heading6, color: '#D32F2F', fontWeight: 'bold' },
  
  // Heading markers (#)
  { tag: tags.processingInstruction, color: '#D32F2F' },
  
  // Bold and italic
  { tag: tags.strong, color: '#6A1B9A', fontWeight: 'bold' },
  { tag: tags.emphasis, color: '#6A1B9A', fontStyle: 'italic' },
  
  // Strikethrough
  { tag: tags.strikethrough, color: '#795548', textDecoration: 'line-through' },
  
  // Links
  { tag: tags.link, color: '#1565C0', textDecoration: 'underline' },
  { tag: tags.url, color: '#7B8794' },
  
  // Code
  { tag: tags.monospace, color: '#E65100', backgroundColor: 'rgba(0,0,0,0.04)' },
  
  // Code block fence (```)
  { tag: tags.meta, color: '#546E7A' },
  
  // Code block content
  { tag: tags.content, color: '#37474F' },
  
  // Blockquote marker (>)
  { tag: tags.quote, color: '#43A047', fontStyle: 'italic' },
  
  // List markers (-, *, 1.)
  { tag: tags.list, color: '#F57F17' },
  
  // Horizontal rule (---)
  { tag: tags.contentSeparator, color: '#BDBDBD' },
  
  // HTML tags
  { tag: tags.angleBracket, color: '#00838F' },
  { tag: tags.tagName, color: '#00838F' },
  { tag: tags.attributeName, color: '#00838F' },
  { tag: tags.attributeValue, color: '#00838F' },
  
  // YAML frontmatter
  { tag: tags.documentMeta, color: '#5C6BC0' },
  
  // Special characters and punctuation
  { tag: tags.punctuation, color: '#6B6B6B' },
  
  // Task list checkboxes
  { tag: tags.atom, color: '#F57F17' },
])

export const lightSyntaxHighlighting = syntaxHighlighting(lightHighlightStyle)
```

### 3.3 src/components/Editor/themes/darkTheme.ts

```typescript
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

export const darkHighlightStyle = HighlightStyle.define([
  // Headings
  { tag: tags.heading1, color: '#EF5350', fontWeight: 'bold' },
  { tag: tags.heading2, color: '#EF5350', fontWeight: 'bold' },
  { tag: tags.heading3, color: '#EF5350', fontWeight: 'bold' },
  { tag: tags.heading4, color: '#EF5350', fontWeight: 'bold' },
  { tag: tags.heading5, color: '#EF5350', fontWeight: 'bold' },
  { tag: tags.heading6, color: '#EF5350', fontWeight: 'bold' },
  
  // Heading markers (#)
  { tag: tags.processingInstruction, color: '#EF5350' },
  
  // Bold and italic
  { tag: tags.strong, color: '#CE93D8', fontWeight: 'bold' },
  { tag: tags.emphasis, color: '#CE93D8', fontStyle: 'italic' },
  
  // Strikethrough
  { tag: tags.strikethrough, color: '#A1887F', textDecoration: 'line-through' },
  
  // Links
  { tag: tags.link, color: '#64B5F6', textDecoration: 'underline' },
  { tag: tags.url, color: '#78909C' },
  
  // Code
  { tag: tags.monospace, color: '#FFB74D', backgroundColor: 'rgba(255,255,255,0.04)' },
  
  // Code block fence (```)
  { tag: tags.meta, color: '#78909C' },
  
  // Code block content
  { tag: tags.content, color: '#B0BEC5' },
  
  // Blockquote marker (>)
  { tag: tags.quote, color: '#81C784', fontStyle: 'italic' },
  
  // List markers (-, *, 1.)
  { tag: tags.list, color: '#FFD54F' },
  
  // Horizontal rule (---)
  { tag: tags.contentSeparator, color: '#616161' },
  
  // HTML tags
  { tag: tags.angleBracket, color: '#4DD0E1' },
  { tag: tags.tagName, color: '#4DD0E1' },
  { tag: tags.attributeName, color: '#4DD0E1' },
  { tag: tags.attributeValue, color: '#4DD0E1' },
  
  // YAML frontmatter
  { tag: tags.documentMeta, color: '#9FA8DA' },
  
  // Special characters and punctuation
  { tag: tags.punctuation, color: '#888888' },
  
  // Task list checkboxes
  { tag: tags.atom, color: '#FFD54F' },
])

export const darkSyntaxHighlighting = syntaxHighlighting(darkHighlightStyle)
```

### 3.4 src/components/Editor/themes/editorTheme.ts

```typescript
import { EditorView } from '@codemirror/view'

export const createEditorTheme = (isDark: boolean, fontSize: number) => {
  const colors = isDark
    ? {
        background: '#141414',
        foreground: '#E0E0E0',
        cursor: '#E0E0E0',
        selection: 'rgba(68, 138, 255, 0.3)',
        selectionMatch: 'rgba(68, 138, 255, 0.15)',
        lineHighlight: 'rgba(255, 255, 255, 0.03)',
        gutterBackground: '#141414',
        gutterForeground: '#555555',
        gutterBorder: '#333333',
        searchMatch: 'rgba(255, 183, 77, 0.3)',
        searchMatchSelected: 'rgba(255, 183, 77, 0.5)',
      }
    : {
        background: '#F5F5F0',
        foreground: '#1A1A1A',
        cursor: '#1A1A1A',
        selection: 'rgba(41, 98, 255, 0.2)',
        selectionMatch: 'rgba(41, 98, 255, 0.1)',
        lineHighlight: 'rgba(0, 0, 0, 0.02)',
        gutterBackground: '#F5F5F0',
        gutterForeground: '#999999',
        gutterBorder: '#E5E5E5',
        searchMatch: 'rgba(255, 152, 0, 0.3)',
        searchMatchSelected: 'rgba(255, 152, 0, 0.5)',
      }

  return EditorView.theme(
    {
      '&': {
        backgroundColor: colors.background,
        color: colors.foreground,
        fontSize: `${fontSize}px`,
        fontFamily: "'IBM Plex Mono', monospace",
        height: '100%',
      },
      '.cm-content': {
        caretColor: colors.cursor,
        padding: '16px 0',
        fontFamily: "'IBM Plex Mono', monospace",
        lineHeight: '1.6',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: colors.cursor,
        borderLeftWidth: '2px',
      },
      '.cm-selectionBackground, ::selection': {
        backgroundColor: colors.selection,
      },
      '.cm-focused .cm-selectionBackground': {
        backgroundColor: colors.selection,
      },
      '.cm-selectionMatch': {
        backgroundColor: colors.selectionMatch,
      },
      '.cm-activeLine': {
        backgroundColor: colors.lineHighlight,
      },
      '.cm-gutters': {
        backgroundColor: colors.gutterBackground,
        color: colors.gutterForeground,
        border: 'none',
        borderRight: `1px solid ${colors.gutterBorder}`,
      },
      '.cm-activeLineGutter': {
        backgroundColor: colors.lineHighlight,
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 8px 0 16px',
        minWidth: '40px',
      },
      // Search panel styling
      '.cm-panels': {
        backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
        color: colors.foreground,
        borderBottom: `1px solid ${colors.gutterBorder}`,
      },
      '.cm-panel.cm-search': {
        padding: '8px 16px',
      },
      '.cm-searchMatch': {
        backgroundColor: colors.searchMatch,
        borderRadius: '2px',
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: colors.searchMatchSelected,
      },
      '.cm-panel input, .cm-panel button': {
        fontFamily: "'Google Sans Flex', sans-serif",
        fontSize: '13px',
      },
      '.cm-panel input': {
        backgroundColor: isDark ? '#333333' : '#F5F5F5',
        color: colors.foreground,
        border: `1px solid ${colors.gutterBorder}`,
        borderRadius: '4px',
        padding: '4px 8px',
        outline: 'none',
      },
      '.cm-panel input:focus': {
        borderColor: isDark ? '#448AFF' : '#2962FF',
      },
      '.cm-panel button': {
        backgroundColor: 'transparent',
        color: colors.foreground,
        border: `1px solid ${colors.gutterBorder}`,
        borderRadius: '4px',
        padding: '4px 12px',
        cursor: 'pointer',
      },
      '.cm-panel button:hover': {
        backgroundColor: isDark ? '#333333' : '#E5E5E5',
      },
      // Tooltip styling
      '.cm-tooltip': {
        backgroundColor: isDark ? '#2D2D2D' : '#FFFFFF',
        border: `1px solid ${colors.gutterBorder}`,
        borderRadius: '4px',
      },
      // Scrollbar
      '&::-webkit-scrollbar': {
        width: '8px',
        height: '8px',
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: isDark ? '#444444' : '#CCCCCC',
        borderRadius: '4px',
      },
      '&::-webkit-scrollbar-thumb:hover': {
        backgroundColor: isDark ? '#555555' : '#BBBBBB',
      },
    },
    { dark: isDark }
  )
}
```

### 3.5 src/components/Editor/themes/index.ts

```typescript
export { lightSyntaxHighlighting, lightHighlightStyle } from './lightTheme'
export { darkSyntaxHighlighting, darkHighlightStyle } from './darkTheme'
export { createEditorTheme } from './editorTheme'
```

### 3.6 src/components/Editor/extensions/markdown.ts

```typescript
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'

export const markdownExtension = markdown({
  base: markdownLanguage,
  codeLanguages: languages,
  addKeymap: true,
})
```

### 3.7 src/components/Editor/extensions/formatting.ts

Formatting commands for ⌘B, ⌘I, ⌘E and toolbar actions:

```typescript
import { EditorView } from '@codemirror/view'
import { EditorSelection, StateCommand } from '@codemirror/state'

type WrapConfig = {
  before: string
  after: string
  placeholder: string
}

const wrapConfigs: Record<string, WrapConfig> = {
  bold: { before: '**', after: '**', placeholder: 'bold text' },
  italic: { before: '_', after: '_', placeholder: 'italic text' },
  underline: { before: '<u>', after: '</u>', placeholder: 'underlined text' },
  strikethrough: { before: '~~', after: '~~', placeholder: 'strikethrough text' },
  inlineCode: { before: '`', after: '`', placeholder: 'code' },
  link: { before: '[', after: '](url)', placeholder: 'link text' },
  image: { before: '![', after: '](url)', placeholder: 'alt text' },
}

export const wrapSelection = (type: keyof typeof wrapConfigs): StateCommand => {
  return ({ state, dispatch }) => {
    const config = wrapConfigs[type]
    if (!config) return false

    const changes = state.changeByRange((range) => {
      const hasSelection = range.from !== range.to
      const selectedText = hasSelection
        ? state.sliceDoc(range.from, range.to)
        : config.placeholder

      const newText = `${config.before}${selectedText}${config.after}`
      
      // Position cursor: if no selection, select the placeholder text
      const newFrom = range.from + config.before.length
      const newTo = newFrom + selectedText.length

      return {
        changes: { from: range.from, to: range.to, insert: newText },
        range: EditorSelection.range(newFrom, newTo),
      }
    })

    dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input.format' }))
    return true
  }
}

type LinePrefix = {
  prefix: string
  toggle: boolean
}

const linePrefixes: Record<string, LinePrefix> = {
  heading1: { prefix: '# ', toggle: true },
  heading2: { prefix: '## ', toggle: true },
  heading3: { prefix: '### ', toggle: true },
  heading4: { prefix: '#### ', toggle: true },
  bulletList: { prefix: '- ', toggle: false },
  numberList: { prefix: '1. ', toggle: false },
  checklist: { prefix: '- [ ] ', toggle: false },
  blockquote: { prefix: '> ', toggle: true },
}

export const toggleLinePrefix = (type: keyof typeof linePrefixes): StateCommand => {
  return ({ state, dispatch }) => {
    const config = linePrefixes[type]
    if (!config) return false

    const changes = state.changeByRange((range) => {
      const line = state.doc.lineAt(range.from)
      const lineText = line.text
      
      // Check if line already has this prefix
      const hasPrefix = lineText.startsWith(config.prefix)
      
      // For headings, also check for other heading levels to replace
      const headingMatch = lineText.match(/^#{1,6}\s/)
      const isHeading = type.startsWith('heading')
      
      let newText: string
      let newFrom: number
      let newTo: number

      if (hasPrefix && config.toggle) {
        // Remove prefix
        newText = lineText.slice(config.prefix.length)
        newFrom = line.from
        newTo = line.to
      } else if (isHeading && headingMatch) {
        // Replace existing heading level
        newText = config.prefix + lineText.slice(headingMatch[0].length)
        newFrom = line.from
        newTo = line.to
      } else {
        // Add prefix
        newText = config.prefix + lineText
        newFrom = line.from
        newTo = line.to
      }

      // Keep cursor at same relative position in the line
      const cursorOffset = range.from - line.from
      const newCursorPos = line.from + Math.min(cursorOffset + (newText.length - lineText.length), newText.length)

      return {
        changes: { from: newFrom, to: newTo, insert: newText },
        range: EditorSelection.cursor(Math.max(line.from, newCursorPos)),
      }
    })

    dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input.format' }))
    return true
  }
}

export const insertCodeBlock: StateCommand = ({ state, dispatch }) => {
  const changes = state.changeByRange((range) => {
    const hasSelection = range.from !== range.to
    const selectedText = hasSelection ? state.sliceDoc(range.from, range.to) : ''
    
    const newText = hasSelection
      ? `\`\`\`\n${selectedText}\n\`\`\``
      : '```\n\n```'
    
    // Position cursor inside the code block
    const cursorPos = range.from + 4 + (hasSelection ? selectedText.length : 0)

    return {
      changes: { from: range.from, to: range.to, insert: newText },
      range: EditorSelection.cursor(hasSelection ? cursorPos : range.from + 4),
    }
  })

  dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input.format' }))
  return true
}

export const insertHorizontalRule: StateCommand = ({ state, dispatch }) => {
  const changes = state.changeByRange((range) => {
    const line = state.doc.lineAt(range.from)
    const isEmptyLine = line.text.trim() === ''
    
    // Insert on new line if current line isn't empty
    const prefix = isEmptyLine ? '' : '\n'
    const newText = `${prefix}---\n`
    
    return {
      changes: { from: range.from, to: range.to, insert: newText },
      range: EditorSelection.cursor(range.from + newText.length),
    }
  })

  dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input.format' }))
  return true
}

export const insertTable: StateCommand = ({ state, dispatch }) => {
  const tableTemplate = `| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
| Cell 7   | Cell 8   | Cell 9   |`

  const changes = state.changeByRange((range) => {
    const line = state.doc.lineAt(range.from)
    const isEmptyLine = line.text.trim() === ''
    const prefix = isEmptyLine ? '' : '\n\n'
    const newText = `${prefix}${tableTemplate}\n`

    return {
      changes: { from: range.from, to: range.to, insert: newText },
      range: EditorSelection.cursor(range.from + prefix.length + 2), // Position at "Header 1"
    }
  })

  dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input.format' }))
  return true
}

export const indentLine: StateCommand = ({ state, dispatch }) => {
  const indentStr = '  ' // 2 spaces

  const changes = state.changeByRange((range) => {
    const fromLine = state.doc.lineAt(range.from)
    const toLine = state.doc.lineAt(range.to)
    
    const linesToIndent: Array<{ from: number; insert: string }> = []
    
    for (let lineNum = fromLine.number; lineNum <= toLine.number; lineNum++) {
      const line = state.doc.line(lineNum)
      linesToIndent.push({ from: line.from, insert: indentStr })
    }

    return {
      changes: linesToIndent,
      range: EditorSelection.range(
        range.from + indentStr.length,
        range.to + indentStr.length * (toLine.number - fromLine.number + 1)
      ),
    }
  })

  dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input.format' }))
  return true
}

export const outdentLine: StateCommand = ({ state, dispatch }) => {
  const changes = state.changeByRange((range) => {
    const fromLine = state.doc.lineAt(range.from)
    const toLine = state.doc.lineAt(range.to)
    
    const linesToOutdent: Array<{ from: number; to: number }> = []
    let totalRemoved = 0
    
    for (let lineNum = fromLine.number; lineNum <= toLine.number; lineNum++) {
      const line = state.doc.line(lineNum)
      const match = line.text.match(/^(\t|  )/)
      
      if (match) {
        linesToOutdent.push({
          from: line.from,
          to: line.from + match[1].length,
        })
        if (lineNum === fromLine.number) {
          totalRemoved = match[1].length
        }
      }
    }

    if (linesToOutdent.length === 0) {
      return { range }
    }

    return {
      changes: linesToOutdent.map((c) => ({ from: c.from, to: c.to })),
      range: EditorSelection.range(
        Math.max(fromLine.from, range.from - totalRemoved),
        Math.max(fromLine.from, range.to - totalRemoved * (toLine.number - fromLine.number + 1))
      ),
    }
  })

  dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input.format' }))
  return true
}

// Export formatting commands map for use with toolbar
export const formattingCommands = {
  bold: wrapSelection('bold'),
  italic: wrapSelection('italic'),
  underline: wrapSelection('underline'),
  strikethrough: wrapSelection('strikethrough'),
  inlineCode: wrapSelection('inlineCode'),
  link: wrapSelection('link'),
  image: wrapSelection('image'),
  heading1: toggleLinePrefix('heading1'),
  heading2: toggleLinePrefix('heading2'),
  heading3: toggleLinePrefix('heading3'),
  heading4: toggleLinePrefix('heading4'),
  bulletList: toggleLinePrefix('bulletList'),
  numberList: toggleLinePrefix('numberList'),
  checklist: toggleLinePrefix('checklist'),
  blockquote: toggleLinePrefix('blockquote'),
  codeBlock: insertCodeBlock,
  horizontalRule: insertHorizontalRule,
  table: insertTable,
  indent: indentLine,
  outdent: outdentLine,
} as const

export type FormattingCommandName = keyof typeof formattingCommands
```

### 3.8 src/components/Editor/extensions/keybindings.ts

```typescript
import { keymap } from '@codemirror/view'
import { defaultKeymap, historyKeymap } from '@codemirror/commands'
import { searchKeymap } from '@codemirror/search'
import { formattingCommands } from './formatting'

export const customKeymap = keymap.of([
  // Formatting shortcuts (ED-05)
  { key: 'Mod-b', run: formattingCommands.bold },
  { key: 'Mod-i', run: formattingCommands.italic },
  { key: 'Mod-e', run: formattingCommands.inlineCode },
  
  // Additional useful shortcuts
  { key: 'Mod-Shift-s', run: formattingCommands.strikethrough },
  { key: 'Mod-k', run: formattingCommands.link },
])

export const allKeymaps = [
  customKeymap,
  keymap.of(searchKeymap), // ED-06: ⌘F for find/replace
  keymap.of(historyKeymap), // Undo/redo
  keymap.of(defaultKeymap), // Default text editing
]
```

### 3.9 src/components/Editor/extensions/index.ts

```typescript
import { EditorState, Extension } from '@codemirror/state'
import { EditorView, lineNumbers, drawSelection, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { history } from '@codemirror/commands'
import { search, highlightSelectionMatches } from '@codemirror/search'
import { bracketMatching } from '@codemirror/language'
import { markdownExtension } from './markdown'
import { allKeymaps } from './keybindings'
import { createEditorTheme, lightSyntaxHighlighting, darkSyntaxHighlighting } from '../themes'

export interface ExtensionConfig {
  isDark: boolean
  fontSize: number
  showLineNumbers: boolean
  wordWrap: boolean
  readOnly?: boolean
  onUpdate?: (content: string) => void
}

export function createExtensions(config: ExtensionConfig): Extension[] {
  const extensions: Extension[] = [
    // Core functionality
    history(),
    drawSelection(),
    bracketMatching(),
    highlightSelectionMatches(),
    highlightActiveLine(),
    
    // Markdown support
    markdownExtension,
    
    // Keybindings
    ...allKeymaps,
    
    // Search (ED-06)
    search({
      top: true, // Show search panel at top
    }),
    
    // Theme - visual styling
    createEditorTheme(config.isDark, config.fontSize),
    
    // Syntax highlighting - colors
    config.isDark ? darkSyntaxHighlighting : lightSyntaxHighlighting,
  ]

  // Line numbers (ED-07: off by default)
  if (config.showLineNumbers) {
    extensions.push(lineNumbers())
    extensions.push(highlightActiveLineGutter())
  }

  // Word wrap (ED-08: on by default)
  if (config.wordWrap) {
    extensions.push(EditorView.lineWrapping)
  }

  // Read-only mode (ED-10: for AI editing)
  if (config.readOnly) {
    extensions.push(EditorState.readOnly.of(true))
  }

  // Content change listener
  if (config.onUpdate) {
    extensions.push(
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          config.onUpdate!(update.state.doc.toString())
        }
      })
    )
  }

  return extensions
}
```

### 3.10 src/hooks/useCodeMirror.ts

```typescript
import { useRef, useEffect, useCallback } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { createExtensions, ExtensionConfig } from '@/components/Editor/extensions'
import type { EditorRef, EditorSnapshot } from '@/types/editor'

interface UseCodeMirrorOptions extends Omit<ExtensionConfig, 'onUpdate'> {
  initialContent?: string
  onChange?: (content: string) => void
}

export function useCodeMirror(
  containerRef: React.RefObject<HTMLDivElement>,
  options: UseCodeMirrorOptions
): EditorRef {
  const viewRef = useRef<EditorView | null>(null)
  const optionsRef = useRef(options)
  
  // Keep options ref updated
  optionsRef.current = options

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) return

    const extensions = createExtensions({
      isDark: options.isDark,
      fontSize: options.fontSize,
      showLineNumbers: options.showLineNumbers,
      wordWrap: options.wordWrap,
      readOnly: options.readOnly,
      onUpdate: options.onChange,
    })

    const state = EditorState.create({
      doc: options.initialContent || '',
      extensions,
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [containerRef]) // Only re-create on container change

  // Update extensions when config changes
  useEffect(() => {
    if (!viewRef.current) return

    const extensions = createExtensions({
      isDark: options.isDark,
      fontSize: options.fontSize,
      showLineNumbers: options.showLineNumbers,
      wordWrap: options.wordWrap,
      readOnly: options.readOnly,
      onUpdate: options.onChange,
    })

    viewRef.current.dispatch({
      effects: EditorView.reconfigure.of(extensions),
    })
  }, [options.isDark, options.fontSize, options.showLineNumbers, options.wordWrap, options.readOnly])

  // API methods
  const getContent = useCallback((): string => {
    return viewRef.current?.state.doc.toString() || ''
  }, [])

  const setContent = useCallback((content: string): void => {
    if (!viewRef.current) return

    viewRef.current.dispatch({
      changes: {
        from: 0,
        to: viewRef.current.state.doc.length,
        insert: content,
      },
    })
  }, [])

  const getSnapshot = useCallback((): EditorSnapshot => {
    const view = viewRef.current
    if (!view) {
      return { content: '', selection: { anchor: 0, head: 0 }, scrollTop: 0, scrollLeft: 0 }
    }

    const selection = view.state.selection.main
    return {
      content: view.state.doc.toString(),
      selection: { anchor: selection.anchor, head: selection.head },
      scrollTop: view.scrollDOM.scrollTop,
      scrollLeft: view.scrollDOM.scrollLeft,
    }
  }, [])

  const restoreSnapshot = useCallback((snapshot: EditorSnapshot): void => {
    const view = viewRef.current
    if (!view) return

    // Restore content
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: snapshot.content,
      },
      selection: {
        anchor: Math.min(snapshot.selection.anchor, snapshot.content.length),
        head: Math.min(snapshot.selection.head, snapshot.content.length),
      },
    })

    // Restore scroll position (after content is updated)
    requestAnimationFrame(() => {
      view.scrollDOM.scrollTop = snapshot.scrollTop
      view.scrollDOM.scrollLeft = snapshot.scrollLeft
    })
  }, [])

  const focus = useCallback((): void => {
    viewRef.current?.focus()
  }, [])

  const setReadOnly = useCallback((readOnly: boolean): void => {
    if (!viewRef.current) return

    const currentExtensions = createExtensions({
      ...optionsRef.current,
      readOnly,
      onUpdate: optionsRef.current.onChange,
    })

    viewRef.current.dispatch({
      effects: EditorView.reconfigure.of(currentExtensions),
    })
  }, [])

  return {
    view: viewRef.current,
    getContent,
    setContent,
    getSnapshot,
    restoreSnapshot,
    focus,
    setReadOnly,
  }
}
```

### 3.11 src/components/Editor/MarkdownEditor.tsx

```typescript
import { useRef, useEffect } from 'react'
import { useCodeMirror } from '@/hooks/useCodeMirror'
import type { EditorRef } from '@/types/editor'

interface MarkdownEditorProps {
  content: string
  onChange: (content: string) => void
  isDark: boolean
  fontSize?: number
  lineNumbers?: boolean
  wordWrap?: boolean
  readOnly?: boolean
  editorRef?: React.MutableRefObject<EditorRef | null>
}

export default function MarkdownEditor({
  content,
  onChange,
  isDark,
  fontSize = 14,
  lineNumbers = false,
  wordWrap = true,
  readOnly = false,
  editorRef,
}: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const editor = useCodeMirror(containerRef, {
    initialContent: content,
    onChange,
    isDark,
    fontSize,
    showLineNumbers: lineNumbers,
    wordWrap,
    readOnly,
  })

  // Expose editor ref to parent
  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor
    }
  }, [editor, editorRef])

  // Sync content from props (for external updates like AI edits)
  useEffect(() => {
    const currentContent = editor.getContent()
    if (content !== currentContent) {
      editor.setContent(content)
    }
  }, [content, editor])

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden"
      data-testid="markdown-editor"
    />
  )
}
```

### 3.12 src/components/Editor/EditorPanel.tsx

Shell component - corner icons added in later stages:

```typescript
import { useRef } from 'react'
import MarkdownEditor from './MarkdownEditor'
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
}: EditorPanelProps) {
  return (
    <div className="relative h-full w-full bg-editor-light dark:bg-editor-dark">
      {/* Burger icon - Stage 06 */}
      {/* Copy icon - Stage 04 */}
      {/* AI icon - Stage 09 */}
      
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

## 4. Update App.tsx

```typescript
import { useEffect, useState, useRef } from 'react'
import TopBar from './components/TopBar/TopBar'
import EditorPanel from './components/Editor/EditorPanel'
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

  useEffect(() => {
    // Load theme and settings on mount
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

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      window.electron.settings.get().then((s) => {
        if (s.theme === 'system') {
          setTheme(e.matches ? 'dark' : 'light')
        }
      })
    }
    mediaQuery.addEventListener('change', handleChange)

    // Listen for menu events
    const unsubFind = window.electron.onMenuEvent('menu:find', () => {
      // Focus editor and trigger search
      editorRef.current?.focus()
      // Search panel is triggered by ⌘F which is handled by CodeMirror
    })

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
      unsubFind()
    }
  }, [])

  const isDark = theme === 'dark'

  return (
    <div className={`h-screen flex flex-col ${isDark ? 'dark' : ''}`}>
      <TopBar />
      <main className="flex-1 overflow-hidden">
        <EditorPanel
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

## 5. Testing

### 5.1 tests/unit/formatting.test.ts

```typescript
import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import { formattingCommands } from '@/components/Editor/extensions/formatting'

function createState(doc: string, selection?: { anchor: number; head: number }) {
  return EditorState.create({
    doc,
    selection: selection ? { anchor: selection.anchor, head: selection.head } : undefined,
  })
}

describe('Formatting Commands', () => {
  describe('wrapSelection', () => {
    it('wraps selected text with bold markers', () => {
      const state = createState('hello world', { anchor: 0, head: 5 })
      let newState = state
      
      formattingCommands.bold({
        state,
        dispatch: (tr) => { newState = tr.state },
      })
      
      expect(newState.doc.toString()).toBe('**hello** world')
    })

    it('inserts placeholder when no selection', () => {
      const state = createState('hello world', { anchor: 6, head: 6 })
      let newState = state
      
      formattingCommands.bold({
        state,
        dispatch: (tr) => { newState = tr.state },
      })
      
      expect(newState.doc.toString()).toBe('hello **bold text**world')
    })

    it('wraps with italic markers', () => {
      const state = createState('hello world', { anchor: 0, head: 5 })
      let newState = state
      
      formattingCommands.italic({
        state,
        dispatch: (tr) => { newState = tr.state },
      })
      
      expect(newState.doc.toString()).toBe('_hello_ world')
    })

    it('wraps with inline code markers', () => {
      const state = createState('const x = 1', { anchor: 6, head: 7 })
      let newState = state
      
      formattingCommands.inlineCode({
        state,
        dispatch: (tr) => { newState = tr.state },
      })
      
      expect(newState.doc.toString()).toBe('const `x` = 1')
    })
  })

  describe('toggleLinePrefix', () => {
    it('adds heading prefix', () => {
      const state = createState('Hello', { anchor: 0, head: 0 })
      let newState = state
      
      formattingCommands.heading1({
        state,
        dispatch: (tr) => { newState = tr.state },
      })
      
      expect(newState.doc.toString()).toBe('# Hello')
    })

    it('removes heading prefix when toggled', () => {
      const state = createState('# Hello', { anchor: 2, head: 2 })
      let newState = state
      
      formattingCommands.heading1({
        state,
        dispatch: (tr) => { newState = tr.state },
      })
      
      expect(newState.doc.toString()).toBe('Hello')
    })

    it('replaces heading level', () => {
      const state = createState('## Hello', { anchor: 3, head: 3 })
      let newState = state
      
      formattingCommands.heading1({
        state,
        dispatch: (tr) => { newState = tr.state },
      })
      
      expect(newState.doc.toString()).toBe('# Hello')
    })

    it('adds bullet list prefix', () => {
      const state = createState('Item', { anchor: 0, head: 0 })
      let newState = state
      
      formattingCommands.bulletList({
        state,
        dispatch: (tr) => { newState = tr.state },
      })
      
      expect(newState.doc.toString()).toBe('- Item')
    })
  })

  describe('insertCodeBlock', () => {
    it('inserts empty code block', () => {
      const state = createState('', { anchor: 0, head: 0 })
      let newState = state
      
      formattingCommands.codeBlock({
        state,
        dispatch: (tr) => { newState = tr.state },
      })
      
      expect(newState.doc.toString()).toBe('```\n\n```')
    })

    it('wraps selection in code block', () => {
      const state = createState('const x = 1', { anchor: 0, head: 11 })
      let newState = state
      
      formattingCommands.codeBlock({
        state,
        dispatch: (tr) => { newState = tr.state },
      })
      
      expect(newState.doc.toString()).toBe('```\nconst x = 1\n```')
    })
  })

  describe('insertTable', () => {
    it('inserts 3x3 table template', () => {
      const state = createState('', { anchor: 0, head: 0 })
      let newState = state
      
      formattingCommands.table({
        state,
        dispatch: (tr) => { newState = tr.state },
      })
      
      expect(newState.doc.toString()).toContain('| Header 1 |')
      expect(newState.doc.toString()).toContain('|----------|')
      expect(newState.doc.toString()).toContain('| Cell 1   |')
    })
  })

  describe('indent/outdent', () => {
    it('indents line with 2 spaces', () => {
      const state = createState('Hello', { anchor: 0, head: 0 })
      let newState = state
      
      formattingCommands.indent({
        state,
        dispatch: (tr) => { newState = tr.state },
      })
      
      expect(newState.doc.toString()).toBe('  Hello')
    })

    it('outdents line by removing spaces', () => {
      const state = createState('  Hello', { anchor: 2, head: 2 })
      let newState = state
      
      formattingCommands.outdent({
        state,
        dispatch: (tr) => { newState = tr.state },
      })
      
      expect(newState.doc.toString()).toBe('Hello')
    })
  })
})
```

### 5.2 tests/components/MarkdownEditor.test.tsx

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import MarkdownEditor from '@/components/Editor/MarkdownEditor'

describe('MarkdownEditor', () => {
  it('renders editor container', () => {
    render(
      <MarkdownEditor
        content="# Test"
        onChange={vi.fn()}
        isDark={false}
      />
    )
    
    expect(screen.getByTestId('markdown-editor')).toBeInTheDocument()
  })

  it('renders with initial content', async () => {
    render(
      <MarkdownEditor
        content="# Hello World"
        onChange={vi.fn()}
        isDark={false}
      />
    )
    
    await waitFor(() => {
      const editor = screen.getByTestId('markdown-editor')
      expect(editor.querySelector('.cm-content')).toBeInTheDocument()
    })
  })

  it('applies dark theme class', async () => {
    render(
      <MarkdownEditor
        content="Test"
        onChange={vi.fn()}
        isDark={true}
      />
    )
    
    await waitFor(() => {
      const editor = screen.getByTestId('markdown-editor')
      const cmEditor = editor.querySelector('.cm-editor')
      expect(cmEditor).toHaveClass('cm-theme-dark')
    })
  })

  it('applies light theme class', async () => {
    render(
      <MarkdownEditor
        content="Test"
        onChange={vi.fn()}
        isDark={false}
      />
    )
    
    await waitFor(() => {
      const editor = screen.getByTestId('markdown-editor')
      const cmEditor = editor.querySelector('.cm-editor')
      expect(cmEditor).toHaveClass('cm-theme-light')
    })
  })

  it('applies custom font size', async () => {
    render(
      <MarkdownEditor
        content="Test"
        onChange={vi.fn()}
        isDark={false}
        fontSize={18}
      />
    )
    
    await waitFor(() => {
      const editor = screen.getByTestId('markdown-editor')
      const cmEditor = editor.querySelector('.cm-editor')
      expect(cmEditor).toHaveStyle({ fontSize: '18px' })
    })
  })
})
```

### 5.3 tests/e2e/editor.spec.ts

```typescript
import { test, expect, _electron as electron } from '@playwright/test'
import { resolve } from 'path'

test.describe('Editor Functionality', () => {
  test('editor accepts keyboard input', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    
    // Wait for editor to load
    await window.waitForSelector('.cm-editor')
    
    // Focus editor and type
    await window.click('.cm-content')
    await window.keyboard.type('# Test Heading')
    
    // Verify content
    const content = await window.locator('.cm-content').textContent()
    expect(content).toContain('# Test Heading')

    await electronApp.close()
  })

  test('⌘F opens search panel (ED-06)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('.cm-editor')
    
    // Focus and open search
    await window.click('.cm-content')
    await window.keyboard.press('Meta+f')
    
    // Verify search panel is visible
    await expect(window.locator('.cm-panel.cm-search')).toBeVisible()

    await electronApp.close()
  })

  test('⌘B applies bold formatting (ED-05)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('.cm-editor')
    
    // Type and select text
    await window.click('.cm-content')
    await window.keyboard.type('test')
    await window.keyboard.press('Meta+a') // Select all
    await window.keyboard.press('Meta+b') // Bold
    
    // Verify bold markers applied
    const content = await window.locator('.cm-content').textContent()
    expect(content).toContain('**')

    await electronApp.close()
  })

  test('syntax highlighting shows correct colors', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('.cm-editor')
    
    // Type markdown content
    await window.click('.cm-content')
    await window.keyboard.type('# Heading\n**bold** _italic_')
    
    // Verify syntax highlighting is applied (classes exist)
    await expect(window.locator('.cm-content')).toBeVisible()
    
    // Check that heading has styling
    const headingStyle = await window.evaluate(() => {
      const heading = document.querySelector('.cm-header')
      return heading ? window.getComputedStyle(heading).fontWeight : null
    })
    expect(headingStyle).toBe('700') // bold

    await electronApp.close()
  })
})
```

---

## 6. Acceptance Criteria

### 6.1 P0 Requirements Checklist

- [ ] CodeMirror 6 editor loads and accepts input (ED-01, VM-01)
- [ ] Markdown syntax is highlighted with custom theme colors (ED-02, ED-03, VM-02)
- [ ] Light and dark themes both work correctly (ED-04)
- [ ] ⌘B wraps selection in bold markers (ED-05)
- [ ] ⌘I wraps selection in italic markers (ED-05)
- [ ] ⌘E wraps selection in inline code markers (ED-05)
- [ ] ⌘F opens CodeMirror search panel (ED-06)
- [ ] Word wrap is enabled by default (ED-08)
- [ ] Editor uses IBM Plex Mono font (VM-03)
- [ ] Font size defaults to 14px (VM-03)

### 6.2 P1 Requirements Checklist

- [ ] Line numbers can be enabled via settings (ED-07)
- [ ] Line numbers are off by default (ED-07)

### 6.3 Syntax Highlighting Color Verification

Verify all 15 token types have correct colors:

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| Heading markers (#) | #D32F2F | #EF5350 |
| Heading text | #1A1A1A bold | #E0E0E0 bold |
| Bold | #6A1B9A | #CE93D8 |
| Italic | #6A1B9A | #CE93D8 |
| Strikethrough | #795548 | #A1887F |
| Link text | #1565C0 | #64B5F6 |
| Link URL | #7B8794 | #78909C |
| Inline code | #E65100 | #FFB74D |
| Code block fence | #546E7A | #78909C |
| Code block content | #37474F | #B0BEC5 |
| Blockquote | #43A047 | #81C784 |
| List markers | #F57F17 | #FFD54F |
| HR (---) | #BDBDBD | #616161 |
| HTML tags | #00838F | #4DD0E1 |
| YAML frontmatter | #5C6BC0 | #9FA8DA |

---

## 7. Output for Next Stage

This stage produces:

1. **Fully functional CodeMirror 6 editor** with Markdown support
2. **Custom syntax highlighting themes** for light and dark modes
3. **Formatting commands** for all 19 toolbar actions
4. **Keyboard shortcuts** for common formatting (⌘B, ⌘I, ⌘E)
5. **Find/replace** functionality via ⌘F
6. **Editor ref API** for external control (getContent, setContent, setReadOnly)
7. **useCodeMirror hook** for React integration

Stage 03 will consume:
- EditorPanel component for the left panel in split view
- Editor ref API for formatting toolbar integration
- Theme coordination between App and Editor
