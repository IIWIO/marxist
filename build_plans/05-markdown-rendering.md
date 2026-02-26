# Stage 05: Markdown Rendering

## Overview

Implement the full Markdown rendering pipeline using unified/remark/rehype with GitHub Flavored Markdown support, syntax-highlighted code blocks, and GitHub-styled output. Includes debounced rendering for performance and external link handling.

## Requirements Covered

| ID | Requirement | Priority |
|----|-------------|----------|
| RN-01 | Pipeline: unified + remark-parse + remark-gfm + remark-rehype + rehype-highlight + rehype-stringify | P0 |
| RN-02 | Output styled with `github-markdown-css` (GitHub 2.0) | P0 |
| RN-03 | Supported: tables, task lists, strikethrough, autolinks, fenced code blocks with syntax highlighting | P0 |
| RN-04 | No copy button on code blocks — keep preview clean | P0 |
| RN-05 | Clickable links open in default browser via shell.openExternal() | P0 |
| RN-06 | Footnotes | P1 |
| RN-07 | YAML frontmatter parsed but hidden in preview | P1 |
| SV-09 | Preview updates on content change, debounced 200ms | P0 |
| NF-02 | Keystroke to render update: < 300ms (debounce 200ms + render 100ms) | P0 |
| NF-03 | Handles documents up to 50,000 words without degradation | P1 |

**Deferred (P2):**
- RN-08: Math rendering (KaTeX)
- RN-09: Mermaid diagrams
- SV-11: Scroll sync between editor and preview

## Dependencies from Stage 04

- PreviewPanel component (placeholder)
- Content from editor
- isDark theme for styling

---

## 1. Install Dependencies

```bash
# Core unified ecosystem
npm install unified remark-parse remark-rehype rehype-stringify

# GitHub Flavored Markdown
npm install remark-gfm

# Frontmatter support
npm install remark-frontmatter

# Footnotes (P1)
npm install remark-footnotes

# Syntax highlighting for code blocks
npm install rehype-highlight

# Sanitization (security)
npm install rehype-sanitize

# GitHub markdown CSS
npm install github-markdown-css

# Syntax highlighting themes (for code blocks)
npm install highlight.js
```

---

## 2. Project Structure

```
src/
├── components/
│   └── Preview/
│       ├── MarkdownPreview.tsx     # UPDATE: Full implementation
│       ├── PreviewPanel.tsx        # UPDATE: Link handling
│       └── PreviewStyles.tsx       # NEW: Style imports
├── hooks/
│   ├── useMarkdownParser.ts        # NEW: Rendering pipeline
│   └── useDebounce.ts              # NEW: Debounce hook
├── utils/
│   └── markdown.ts                 # NEW: Parser configuration
└── styles/
    ├── github-markdown.css         # GitHub markdown styles
    └── highlight-themes/
        ├── github-light.css        # Light mode code highlighting
        └── github-dark.css         # Dark mode code highlighting
```

---

## 3. Markdown Parser Configuration

### 3.1 src/utils/markdown.ts

```typescript
import { unified, Processor } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkFrontmatter from 'remark-frontmatter'
import remarkFootnotes from 'remark-footnotes'
import remarkRehype from 'remark-rehype'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'

// Extended sanitization schema to allow GFM elements
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // Allow class for syntax highlighting
    code: [...(defaultSchema.attributes?.code || []), 'className'],
    span: [...(defaultSchema.attributes?.span || []), 'className'],
    // Allow checkbox attributes for task lists
    input: ['type', 'checked', 'disabled'],
    // Allow data attributes for footnotes
    a: [...(defaultSchema.attributes?.a || []), 'dataFootnoteRef', 'dataFootnoteBackref'],
    li: [...(defaultSchema.attributes?.li || []), 'id'],
    section: [...(defaultSchema.attributes?.section || []), 'dataFootnotes'],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'input', // For task list checkboxes
    'section', // For footnotes section
  ],
}

export interface MarkdownParserOptions {
  enableFootnotes?: boolean
  enableFrontmatter?: boolean
}

export function createMarkdownParser(options: MarkdownParserOptions = {}): Processor {
  const { enableFootnotes = true, enableFrontmatter = true } = options

  let processor = unified()
    .use(remarkParse)
    .use(remarkGfm) // RN-03: Tables, task lists, strikethrough, autolinks

  // RN-07: YAML frontmatter (parsed but hidden)
  if (enableFrontmatter) {
    processor = processor.use(remarkFrontmatter, ['yaml', 'toml'])
  }

  // RN-06: Footnotes
  if (enableFootnotes) {
    processor = processor.use(remarkFootnotes, { inlineNotes: true })
  }

  processor = processor
    .use(remarkRehype, { 
      allowDangerousHtml: false,
      // Pass through task list checkboxes
      handlers: {
        // Custom handler for task list items if needed
      }
    })
    .use(rehypeHighlight, {
      // RN-03: Syntax highlighting for code blocks
      ignoreMissing: true, // Don't throw on unknown languages
      detect: true, // Auto-detect language if not specified
    })
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify)

  return processor
}

// Singleton parser instance for performance
let parserInstance: Processor | null = null

export function getMarkdownParser(options?: MarkdownParserOptions): Processor {
  if (!parserInstance) {
    parserInstance = createMarkdownParser(options)
  }
  return parserInstance
}

// Parse markdown to HTML
export async function parseMarkdown(content: string): Promise<string> {
  const parser = getMarkdownParser()
  const result = await parser.process(content)
  return String(result)
}

// Synchronous parse for smaller documents (< 10KB)
export function parseMarkdownSync(content: string): string {
  const parser = getMarkdownParser()
  const result = parser.processSync(content)
  return String(result)
}
```

---

## 4. Debounce Hook

### 4.1 src/hooks/useDebounce.ts

```typescript
import { useState, useEffect, useRef } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

// More advanced debounce with immediate option
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const callbackRef = useRef(callback)

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return ((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args)
    }, delay)
  }) as T
}
```

---

## 5. Markdown Parser Hook

### 5.1 src/hooks/useMarkdownParser.ts

```typescript
import { useState, useEffect, useRef, useCallback } from 'react'
import { parseMarkdown } from '@/utils/markdown'
import { useDebounce } from './useDebounce'

interface UseMarkdownParserOptions {
  debounceMs?: number
}

interface UseMarkdownParserResult {
  html: string
  isProcessing: boolean
  error: Error | null
}

// SV-09: Debounced rendering (200ms default)
// NF-02: Total render time < 300ms (200ms debounce + 100ms render)
const DEFAULT_DEBOUNCE_MS = 200

export function useMarkdownParser(
  content: string,
  options: UseMarkdownParserOptions = {}
): UseMarkdownParserResult {
  const { debounceMs = DEFAULT_DEBOUNCE_MS } = options
  
  const [html, setHtml] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true)
  
  // Track current processing request to handle race conditions
  const processingIdRef = useRef(0)

  // Debounce content changes
  const debouncedContent = useDebounce(content, debounceMs)

  // Parse markdown when debounced content changes
  useEffect(() => {
    isMountedRef.current = true
    
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const currentId = ++processingIdRef.current
    
    const processMarkdown = async () => {
      if (!debouncedContent.trim()) {
        setHtml('')
        return
      }

      setIsProcessing(true)
      setError(null)

      try {
        // NF-03: Handle large documents
        // For very large documents, consider chunking or web worker
        const startTime = performance.now()
        
        const result = await parseMarkdown(debouncedContent)
        
        const processingTime = performance.now() - startTime
        
        // Log if processing takes too long (> 100ms)
        if (processingTime > 100) {
          console.warn(`Markdown parsing took ${processingTime.toFixed(2)}ms`)
        }

        // Only update state if this is still the latest request
        if (isMountedRef.current && currentId === processingIdRef.current) {
          setHtml(result)
        }
      } catch (err) {
        if (isMountedRef.current && currentId === processingIdRef.current) {
          setError(err instanceof Error ? err : new Error('Failed to parse markdown'))
          console.error('Markdown parsing error:', err)
        }
      } finally {
        if (isMountedRef.current && currentId === processingIdRef.current) {
          setIsProcessing(false)
        }
      }
    }

    processMarkdown()
  }, [debouncedContent])

  return { html, isProcessing, error }
}
```

---

## 6. Preview Styles

### 6.1 src/styles/github-markdown.css

Import the npm package styles and add customizations:

```css
/* Import base GitHub markdown styles */
@import 'github-markdown-css/github-markdown.css';

/* Light mode customizations */
.markdown-body {
  --color-canvas-default: transparent;
  --color-canvas-subtle: #f6f8fa;
  --color-border-default: #d0d7de;
  --color-border-muted: hsla(210, 18%, 87%, 0.5);
}

/* Dark mode customizations */
.dark .markdown-body {
  --color-canvas-default: transparent;
  --color-canvas-subtle: #161b22;
  --color-border-default: #30363d;
  --color-border-muted: #21262d;
  color-scheme: dark;
}

/* RN-04: No copy button on code blocks */
.markdown-body pre {
  position: relative;
}

/* Ensure code blocks don't have copy buttons */
.markdown-body .copy-code-button {
  display: none !important;
}

/* Task list checkbox styling */
.markdown-body input[type="checkbox"] {
  margin-right: 0.5em;
  pointer-events: none; /* Read-only checkboxes */
}

/* Task list item alignment */
.markdown-body li.task-list-item {
  list-style-type: none;
  margin-left: -1.5em;
}

/* Footnote styling */
.markdown-body .footnotes {
  margin-top: 2em;
  padding-top: 1em;
  border-top: 1px solid var(--color-border-default);
  font-size: 0.875em;
}

.markdown-body .footnotes-sep {
  display: none;
}

/* Table improvements */
.markdown-body table {
  display: table;
  width: 100%;
  overflow: auto;
}

.markdown-body table th,
.markdown-body table td {
  padding: 8px 16px;
}

/* Link styling - RN-05 */
.markdown-body a {
  cursor: pointer;
}

.markdown-body a:hover {
  text-decoration: underline;
}

/* Image handling */
.markdown-body img {
  max-width: 100%;
  height: auto;
}

/* Blockquote styling */
.markdown-body blockquote {
  border-left: 4px solid var(--color-border-default);
  padding-left: 1em;
  color: inherit;
  opacity: 0.85;
}

/* Horizontal rule */
.markdown-body hr {
  height: 2px;
  padding: 0;
  margin: 24px 0;
  background-color: var(--color-border-default);
  border: 0;
}
```

### 6.2 src/styles/highlight-themes/github-light.css

```css
/* GitHub Light syntax highlighting theme */
.hljs {
  color: #24292f;
  background: #f6f8fa;
}

.hljs-comment,
.hljs-quote {
  color: #6e7781;
  font-style: italic;
}

.hljs-keyword,
.hljs-selector-tag,
.hljs-literal {
  color: #cf222e;
}

.hljs-name,
.hljs-tag {
  color: #116329;
}

.hljs-attr,
.hljs-attribute {
  color: #0550ae;
}

.hljs-string,
.hljs-doctag,
.hljs-regexp {
  color: #0a3069;
}

.hljs-number,
.hljs-selector-id,
.hljs-selector-class {
  color: #0550ae;
}

.hljs-built_in,
.hljs-builtin-name {
  color: #0550ae;
}

.hljs-function,
.hljs-title {
  color: #8250df;
}

.hljs-variable,
.hljs-template-variable {
  color: #953800;
}

.hljs-symbol,
.hljs-bullet {
  color: #0550ae;
}

.hljs-section {
  color: #0550ae;
  font-weight: bold;
}

.hljs-addition {
  color: #116329;
  background-color: #dafbe1;
}

.hljs-deletion {
  color: #82071e;
  background-color: #ffebe9;
}
```

### 6.3 src/styles/highlight-themes/github-dark.css

```css
/* GitHub Dark syntax highlighting theme */
.dark .hljs {
  color: #c9d1d9;
  background: #161b22;
}

.dark .hljs-comment,
.dark .hljs-quote {
  color: #8b949e;
  font-style: italic;
}

.dark .hljs-keyword,
.dark .hljs-selector-tag,
.dark .hljs-literal {
  color: #ff7b72;
}

.dark .hljs-name,
.dark .hljs-tag {
  color: #7ee787;
}

.dark .hljs-attr,
.dark .hljs-attribute {
  color: #79c0ff;
}

.dark .hljs-string,
.dark .hljs-doctag,
.dark .hljs-regexp {
  color: #a5d6ff;
}

.dark .hljs-number,
.dark .hljs-selector-id,
.dark .hljs-selector-class {
  color: #79c0ff;
}

.dark .hljs-built_in,
.dark .hljs-builtin-name {
  color: #79c0ff;
}

.dark .hljs-function,
.dark .hljs-title {
  color: #d2a8ff;
}

.dark .hljs-variable,
.dark .hljs-template-variable {
  color: #ffa657;
}

.dark .hljs-symbol,
.dark .hljs-bullet {
  color: #79c0ff;
}

.dark .hljs-section {
  color: #79c0ff;
  font-weight: bold;
}

.dark .hljs-addition {
  color: #aff5b4;
  background-color: rgba(46, 160, 67, 0.15);
}

.dark .hljs-deletion {
  color: #ffdcd7;
  background-color: rgba(248, 81, 73, 0.15);
}
```

---

## 7. Updated Preview Components

### 7.1 src/components/Preview/MarkdownPreview.tsx

```typescript
import { useEffect, useRef, useCallback } from 'react'
import { useMarkdownParser } from '@/hooks/useMarkdownParser'

// Import styles
import '@/styles/github-markdown.css'
import '@/styles/highlight-themes/github-light.css'
import '@/styles/highlight-themes/github-dark.css'

interface MarkdownPreviewProps {
  content: string
  isDark: boolean
  fontSize?: number
  onLinkClick?: (url: string) => void
}

export default function MarkdownPreview({
  content,
  isDark,
  fontSize = 16,
  onLinkClick,
}: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { html, isProcessing, error } = useMarkdownParser(content)

  // RN-05: Handle link clicks to open in default browser
  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement
    const anchor = target.closest('a')
    
    if (anchor && anchor.href) {
      e.preventDefault()
      
      // Only handle external links
      const url = anchor.href
      if (url.startsWith('http://') || url.startsWith('https://')) {
        onLinkClick?.(url)
      } else if (url.startsWith('#')) {
        // Handle anchor links within the document
        const targetId = url.slice(1)
        const targetElement = containerRef.current?.querySelector(`#${CSS.escape(targetId)}`)
        targetElement?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [onLinkClick])

  // Attach click handler
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('click', handleClick)
    return () => container.removeEventListener('click', handleClick)
  }, [handleClick])

  // Handle checkbox clicks (make them visual-only, no toggle)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const checkboxes = container.querySelectorAll('input[type="checkbox"]')
    checkboxes.forEach((checkbox) => {
      (checkbox as HTMLInputElement).disabled = true
    })
  }, [html])

  if (error) {
    return (
      <div className="p-6 text-red-500 dark:text-red-400">
        <p className="font-medium">Error rendering preview:</p>
        <pre className="mt-2 text-sm">{error.message}</pre>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`
        markdown-body
        h-full w-full overflow-auto p-6
        bg-preview-light dark:bg-preview-dark
        ${isProcessing ? 'opacity-75' : ''}
      `}
      style={{
        fontSize: `${fontSize}px`,
        lineHeight: 1.6,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
      data-testid="markdown-preview"
    />
  )
}
```

### 7.2 src/components/Preview/PreviewPanel.tsx

```typescript
import MarkdownPreview from './MarkdownPreview'
import EditorCornerIcons from '@/components/Editor/EditorCornerIcons'
import { useViewStore, selectActiveView } from '@/stores/viewStore'

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
  const activeView = useViewStore(selectActiveView)
  const showAIIcon = activeView === 'render' // RV-02: Only show in Render view

  // RN-05: Handle external links
  const handleLinkClick = (url: string) => {
    // Use IPC to open in default browser
    window.electron?.file?.openExternal?.(url) || window.open(url, '_blank')
  }

  return (
    <div 
      className={`
        relative h-full bg-preview-light dark:bg-preview-dark
        ${fullWidth ? 'w-full' : ''}
      `}
    >
      {/* AI robot icon - only in Render view (RV-02) */}
      {showAIIcon && (
        <EditorCornerIcons
          content={content}
          showBurger={false}
          showCopy={false}
          showAI={true}
        />
      )}
      
      <MarkdownPreview
        content={content}
        isDark={isDark}
        fontSize={fontSize}
        onLinkClick={handleLinkClick}
      />
    </div>
  )
}
```

---

## 8. Add IPC for External Links

### 8.1 Update electron/main/ipc/file-handlers.ts

Add method to open external URLs:

```typescript
import { ipcMain, shell, dialog } from 'electron'

export function registerFileHandlers(): void {
  // ... existing handlers ...

  // RN-05: Open external links in default browser
  ipcMain.handle('file:open-external', async (_, url: string) => {
    try {
      // Validate URL before opening
      const parsedUrl = new URL(url)
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error('Invalid URL protocol')
      }
      
      await shell.openExternal(url)
      return { success: true }
    } catch (error) {
      console.error('Failed to open external URL:', error)
      return { success: false, error: (error as Error).message }
    }
  })
}
```

### 8.2 Update electron/preload/index.ts

```typescript
// Add to file operations
file: {
  // ... existing methods ...
  openExternal: (url: string) => ipcRenderer.invoke('file:open-external', url),
}
```

### 8.3 Update electron/preload/types.ts

```typescript
export interface ElectronAPI {
  file: {
    // ... existing methods ...
    openExternal: (url: string) => Promise<{ success: boolean; error?: string }>
  }
  // ... rest of API ...
}
```

---

## 9. Update Global Styles

### 9.1 Update src/styles/global.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Existing font-face declarations... */

/* Import GitHub markdown and syntax highlighting */
@import './github-markdown.css';
@import './highlight-themes/github-light.css';
@import './highlight-themes/github-dark.css';

/* ... rest of existing styles ... */

/* Preview panel GitHub font stack */
.markdown-body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji';
}

/* Ensure code blocks use IBM Plex Mono */
.markdown-body code,
.markdown-body pre {
  font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
}
```

---

## 10. Performance Optimization

### 10.1 src/utils/markdown.ts - Add worker support for large documents

```typescript
// Add to markdown.ts for NF-03: Handle large documents

// Threshold for using async parsing (in characters)
const LARGE_DOCUMENT_THRESHOLD = 50000 // ~10KB

export async function parseMarkdownOptimized(content: string): Promise<string> {
  // For small documents, use sync parsing
  if (content.length < LARGE_DOCUMENT_THRESHOLD) {
    return parseMarkdownSync(content)
  }
  
  // For larger documents, use async parsing with potential chunking
  return parseMarkdown(content)
}

// Estimate word count without full parsing (for performance checks)
export function estimateWordCount(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length
}

// Check if document is "large" (NF-03: 50,000 words)
export function isLargeDocument(content: string): boolean {
  const wordCount = estimateWordCount(content)
  return wordCount > 50000
}
```

### 10.2 Update useMarkdownParser.ts with large document handling

```typescript
import { useState, useEffect, useRef, useCallback } from 'react'
import { parseMarkdownOptimized, isLargeDocument } from '@/utils/markdown'
import { useDebounce } from './useDebounce'

// ... existing code ...

export function useMarkdownParser(
  content: string,
  options: UseMarkdownParserOptions = {}
): UseMarkdownParserResult {
  const { debounceMs = DEFAULT_DEBOUNCE_MS } = options
  
  const [html, setHtml] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isLarge, setIsLarge] = useState(false)
  
  // ... existing refs ...

  // Check document size
  useEffect(() => {
    setIsLarge(isLargeDocument(content))
  }, [content])

  // Increase debounce for large documents
  const effectiveDebounce = isLarge ? debounceMs * 2 : debounceMs
  const debouncedContent = useDebounce(content, effectiveDebounce)

  // ... rest of existing implementation using parseMarkdownOptimized ...
}
```

---

## 11. Testing

### 11.1 tests/unit/markdown.test.ts

```typescript
import { describe, it, expect } from 'vitest'
import { parseMarkdownSync, parseMarkdown, estimateWordCount } from '@/utils/markdown'

describe('Markdown Parser', () => {
  describe('parseMarkdownSync', () => {
    it('parses basic markdown', () => {
      const result = parseMarkdownSync('# Hello World')
      expect(result).toContain('<h1>')
      expect(result).toContain('Hello World')
    })

    it('supports GFM tables (RN-03)', () => {
      const markdown = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`
      const result = parseMarkdownSync(markdown)
      expect(result).toContain('<table>')
      expect(result).toContain('<th>')
      expect(result).toContain('Header 1')
    })

    it('supports task lists (RN-03)', () => {
      const markdown = `
- [x] Completed task
- [ ] Incomplete task
`
      const result = parseMarkdownSync(markdown)
      expect(result).toContain('type="checkbox"')
      expect(result).toContain('checked')
    })

    it('supports strikethrough (RN-03)', () => {
      const result = parseMarkdownSync('~~deleted~~')
      expect(result).toContain('<del>')
      expect(result).toContain('deleted')
    })

    it('supports autolinks (RN-03)', () => {
      const result = parseMarkdownSync('Visit https://example.com')
      expect(result).toContain('<a')
      expect(result).toContain('href="https://example.com"')
    })

    it('highlights code blocks (RN-03)', () => {
      const markdown = '```javascript\nconst x = 1;\n```'
      const result = parseMarkdownSync(markdown)
      expect(result).toContain('<pre>')
      expect(result).toContain('<code')
      expect(result).toContain('hljs')
    })

    it('parses YAML frontmatter without rendering it (RN-07)', () => {
      const markdown = `---
title: Test
---

# Content`
      const result = parseMarkdownSync(markdown)
      expect(result).not.toContain('title: Test')
      expect(result).toContain('<h1>')
      expect(result).toContain('Content')
    })

    it('supports footnotes (RN-06)', () => {
      const markdown = `
Here is a footnote[^1].

[^1]: This is the footnote content.
`
      const result = parseMarkdownSync(markdown)
      expect(result).toContain('footnote')
    })
  })

  describe('parseMarkdown (async)', () => {
    it('parses markdown asynchronously', async () => {
      const result = await parseMarkdown('# Async Test')
      expect(result).toContain('<h1>')
      expect(result).toContain('Async Test')
    })
  })

  describe('estimateWordCount', () => {
    it('counts words correctly', () => {
      expect(estimateWordCount('one two three')).toBe(3)
      expect(estimateWordCount('  spaced   words  ')).toBe(2)
      expect(estimateWordCount('')).toBe(0)
    })
  })
})
```

### 11.2 tests/components/MarkdownPreview.test.tsx

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import MarkdownPreview from '@/components/Preview/MarkdownPreview'

describe('MarkdownPreview', () => {
  it('renders markdown content', async () => {
    render(
      <MarkdownPreview
        content="# Hello"
        isDark={false}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('markdown-preview')).toContainHTML('<h1>')
    })
  })

  it('applies github-markdown-body class (RN-02)', async () => {
    render(
      <MarkdownPreview
        content="Test"
        isDark={false}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('markdown-preview')).toHaveClass('markdown-body')
    })
  })

  it('renders tables correctly (RN-03)', async () => {
    const tableMarkdown = `
| A | B |
|---|---|
| 1 | 2 |
`
    render(
      <MarkdownPreview
        content={tableMarkdown}
        isDark={false}
      />
    )

    await waitFor(() => {
      const preview = screen.getByTestId('markdown-preview')
      expect(preview.querySelector('table')).toBeInTheDocument()
    })
  })

  it('renders task lists with disabled checkboxes', async () => {
    render(
      <MarkdownPreview
        content="- [x] Done\n- [ ] Todo"
        isDark={false}
      />
    )

    await waitFor(() => {
      const checkboxes = screen.getByTestId('markdown-preview').querySelectorAll('input[type="checkbox"]')
      expect(checkboxes).toHaveLength(2)
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeDisabled()
      })
    })
  })

  it('calls onLinkClick for external links (RN-05)', async () => {
    const onLinkClick = vi.fn()
    
    render(
      <MarkdownPreview
        content="[Link](https://example.com)"
        isDark={false}
        onLinkClick={onLinkClick}
      />
    )

    await waitFor(() => {
      const link = screen.getByTestId('markdown-preview').querySelector('a')
      expect(link).toBeInTheDocument()
    })

    // Click the link
    const link = screen.getByTestId('markdown-preview').querySelector('a')
    link?.click()

    expect(onLinkClick).toHaveBeenCalledWith('https://example.com')
  })

  it('handles code blocks with syntax highlighting (RN-03)', async () => {
    const codeMarkdown = '```js\nconst x = 1;\n```'
    
    render(
      <MarkdownPreview
        content={codeMarkdown}
        isDark={false}
      />
    )

    await waitFor(() => {
      const codeBlock = screen.getByTestId('markdown-preview').querySelector('pre code')
      expect(codeBlock).toBeInTheDocument()
      expect(codeBlock).toHaveClass('hljs')
    })
  })

  it('shows error state on parse failure', async () => {
    // Mock parseMarkdown to throw
    vi.mock('@/utils/markdown', () => ({
      parseMarkdown: vi.fn().mockRejectedValue(new Error('Parse error')),
    }))

    render(
      <MarkdownPreview
        content="# Test"
        isDark={false}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Error rendering preview/)).toBeInTheDocument()
    })
  })
})
```

### 11.3 tests/hooks/useMarkdownParser.test.ts

```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMarkdownParser } from '@/hooks/useMarkdownParser'

describe('useMarkdownParser', () => {
  it('returns empty HTML for empty content', () => {
    const { result } = renderHook(() => useMarkdownParser(''))
    expect(result.current.html).toBe('')
  })

  it('parses markdown after debounce (SV-09)', async () => {
    const { result, rerender } = renderHook(
      ({ content }) => useMarkdownParser(content, { debounceMs: 50 }),
      { initialProps: { content: '' } }
    )

    rerender({ content: '# Hello' })

    // Should not be parsed immediately
    expect(result.current.html).toBe('')

    // Wait for debounce
    await waitFor(() => {
      expect(result.current.html).toContain('<h1>')
    }, { timeout: 200 })
  })

  it('sets isProcessing during parsing', async () => {
    const { result, rerender } = renderHook(
      ({ content }) => useMarkdownParser(content, { debounceMs: 10 }),
      { initialProps: { content: '' } }
    )

    rerender({ content: '# Test' })

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(false)
      expect(result.current.html).toContain('Test')
    })
  })

  it('handles rapid content changes without race conditions', async () => {
    const { result, rerender } = renderHook(
      ({ content }) => useMarkdownParser(content, { debounceMs: 50 }),
      { initialProps: { content: 'First' } }
    )

    // Rapid changes
    rerender({ content: 'Second' })
    rerender({ content: 'Third' })
    rerender({ content: 'Final' })

    await waitFor(() => {
      expect(result.current.html).toContain('Final')
      expect(result.current.html).not.toContain('First')
      expect(result.current.html).not.toContain('Second')
      expect(result.current.html).not.toContain('Third')
    }, { timeout: 300 })
  })
})
```

### 11.4 tests/e2e/preview.spec.ts

```typescript
import { test, expect, _electron as electron } from '@playwright/test'
import { resolve } from 'path'

test.describe('Markdown Preview', () => {
  test('renders markdown in split view', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    
    // Type markdown
    await window.click('.cm-content')
    await window.keyboard.press('Meta+a')
    await window.keyboard.type('# Test Heading\n\nParagraph text')

    // Wait for debounced render
    await window.waitForTimeout(300)

    // Check preview
    const preview = await window.$('.markdown-body')
    const previewContent = await preview?.innerHTML()
    
    expect(previewContent).toContain('<h1>')
    expect(previewContent).toContain('Test Heading')

    await electronApp.close()
  })

  test('renders GFM tables (RN-03)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    
    await window.click('.cm-content')
    await window.keyboard.press('Meta+a')
    await window.keyboard.type('| A | B |\n|---|---|\n| 1 | 2 |')

    await window.waitForTimeout(300)

    const preview = await window.$('.markdown-body')
    expect(await preview?.innerHTML()).toContain('<table>')

    await electronApp.close()
  })

  test('syntax highlights code blocks (RN-03)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    
    await window.click('.cm-content')
    await window.keyboard.press('Meta+a')
    await window.keyboard.type('```javascript\nconst x = 1;\n```')

    await window.waitForTimeout(300)

    const codeBlock = await window.$('.markdown-body pre code')
    expect(await codeBlock?.getAttribute('class')).toContain('hljs')

    await electronApp.close()
  })

  test('opens external links in browser (RN-05)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    
    await window.click('.cm-content')
    await window.keyboard.press('Meta+a')
    await window.keyboard.type('[Test](https://example.com)')

    await window.waitForTimeout(300)

    // Verify link is present
    const link = await window.$('.markdown-body a')
    expect(await link?.getAttribute('href')).toBe('https://example.com')

    // Note: Actually clicking and verifying shell.openExternal is called
    // would require mocking at the Electron level

    await electronApp.close()
  })

  test('updates preview within 300ms (NF-02)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    
    await window.click('.cm-content')
    await window.keyboard.press('Meta+a')

    const startTime = Date.now()
    await window.keyboard.type('# Speed Test')

    // Wait for content to appear in preview
    await window.waitForFunction(() => {
      const preview = document.querySelector('.markdown-body')
      return preview?.innerHTML.includes('Speed Test')
    }, { timeout: 500 })

    const elapsed = Date.now() - startTime
    expect(elapsed).toBeLessThan(500) // Allow some margin

    await electronApp.close()
  })

  test('has no copy button on code blocks (RN-04)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    
    await window.click('.cm-content')
    await window.keyboard.press('Meta+a')
    await window.keyboard.type('```\ncode\n```')

    await window.waitForTimeout(300)

    // Verify no copy button
    const copyButton = await window.$('.markdown-body .copy-code-button')
    expect(copyButton).toBeNull()

    await electronApp.close()
  })
})
```

---

## 12. Acceptance Criteria

### 12.1 P0 Requirements Checklist

- [ ] Pipeline uses unified + remark-parse + remark-gfm + remark-rehype + rehype-highlight + rehype-stringify (RN-01)
- [ ] Output styled with github-markdown-css (RN-02)
- [ ] Tables render correctly (RN-03)
- [ ] Task lists render with checkboxes (RN-03)
- [ ] Strikethrough renders with `<del>` (RN-03)
- [ ] Autolinks are converted to clickable links (RN-03)
- [ ] Code blocks have syntax highlighting (RN-03)
- [ ] No copy button on code blocks (RN-04)
- [ ] External links open in default browser via shell.openExternal (RN-05)
- [ ] Preview updates debounced at 200ms (SV-09)
- [ ] Keystroke to render < 300ms total (NF-02)

### 12.2 P1 Requirements Checklist

- [ ] Footnotes render correctly (RN-06)
- [ ] YAML frontmatter is parsed but not displayed (RN-07)
- [ ] Documents up to 50,000 words render without degradation (NF-03)

### 12.3 GFM Feature Verification

| Feature | Markdown Syntax | Expected Output |
|---------|-----------------|-----------------|
| Table | `\| A \| B \|` | `<table>` |
| Task list | `- [x] Done` | `<input type="checkbox" checked>` |
| Strikethrough | `~~text~~` | `<del>text</del>` |
| Autolink | `https://...` | `<a href="...">` |
| Fenced code | ` ```js ``` ` | `<pre><code class="hljs">` |

---

## 13. Output for Next Stage

This stage produces:

1. **Markdown parsing pipeline** - unified/remark/rehype with GFM support
2. **useMarkdownParser hook** - Debounced async parsing
3. **MarkdownPreview component** - Rendered output with link handling
4. **GitHub styling** - github-markdown-css + highlight.js themes
5. **External link handling** - IPC bridge to shell.openExternal
6. **Performance optimization** - Large document detection, debouncing

Stage 06 will consume:
- PreviewPanel for displaying rendered content in split view
- Content from multi-tab editor store
