# Stage 10: AI Document Editing

## Overview

Implement AI-powered document editing where the AI can directly modify document content with real-time streaming, diff visualization, and accept/revert workflow. This is the core AI feature that distinguishes Marxist from other editors.

## Requirements Covered

### AI Document Editing

| ID | Requirement | Priority |
|----|-------------|----------|
| AE-01 | AI can directly modify the document content (e.g., "fix my table") | P0 |
| AE-02 | AI operates on the **full document** (determines what to change) | P0 |
| AE-03 | Pre-edit snapshot saved for revert capability | P0 |
| AE-04 | Editor locked to **read-only** during AI streaming | P0 |
| AE-05 | Modified document streams in real-time, replacing editor content progressively | P0 |
| AE-06 | After streaming: line-level diff computed (pre-edit vs post-edit) | P0 |
| AE-07 | Added lines highlighted with **green** background | P0 |
| AE-08 | Removed lines highlighted with **red** background | P0 |
| AE-09 | **Banner across top of editor** with persistent Accept and Revert buttons | P0 |
| AE-10 | Editor remains read-only until user clicks Accept or Revert | P0 |
| AE-11 | **Accept**: commits changes, clears diff, unlocks editor, marks doc as dirty | P0 |
| AE-12 | **Revert**: restores pre-edit snapshot, clears diff, unlocks editor | P0 |
| AE-13 | AI stream can be cancelled mid-edit (reverts to pre-edit state) | P1 |

## Dependencies from Previous Stages

**From Stage 6 (TabState):**
- `preEditSnapshot: string | null`
- `isAIEditing: boolean`
- `showDiff: boolean`

**From Stage 9 (AI Chat):**
- `aiStore` for chat history
- `useAIChat` hook structure
- Streaming infrastructure (IPC events)

---

## 1. Project Structure

```
src/
├── components/
│   ├── Editor/
│   │   ├── DiffBanner.tsx           # NEW: Accept/Revert banner
│   │   └── extensions/
│   │       └── diffHighlight.ts     # NEW: CodeMirror diff decoration
│   └── AI/
│       └── ChatInput.tsx            # UPDATE: Add edit mode trigger
├── stores/
│   └── editorStore.ts               # UPDATE: Add AI edit actions
├── hooks/
│   ├── useAIEdit.ts                 # NEW: AI document editing hook
│   └── useDiff.ts                   # NEW: Diff computation hook
└── utils/
    └── diff.ts                      # NEW: Line-level diff algorithm
```

---

## 2. Diff Algorithm Utility

### 2.1 src/utils/diff.ts

Use a line-level diff algorithm based on LCS (Longest Common Subsequence):

```typescript
export interface DiffLine {
  type: 'unchanged' | 'added' | 'removed'
  content: string
  lineNumber: number        // Line number in the respective document
  originalLineNumber?: number // For removed lines: line in original doc
  newLineNumber?: number    // For added lines: line in new doc
}

export interface DiffResult {
  lines: DiffLine[]
  addedCount: number
  removedCount: number
  unchangedCount: number
}

/**
 * Compute line-level diff between two documents
 * Uses Myers diff algorithm for optimal results
 */
export function computeDiff(original: string, modified: string): DiffResult {
  const originalLines = original.split('\n')
  const modifiedLines = modified.split('\n')
  
  // Build LCS matrix
  const lcs = buildLCSMatrix(originalLines, modifiedLines)
  
  // Backtrack to find diff
  const diffLines = backtrackDiff(originalLines, modifiedLines, lcs)
  
  // Count statistics
  const addedCount = diffLines.filter(l => l.type === 'added').length
  const removedCount = diffLines.filter(l => l.type === 'removed').length
  const unchangedCount = diffLines.filter(l => l.type === 'unchanged').length

  return { lines: diffLines, addedCount, removedCount, unchangedCount }
}

function buildLCSMatrix(a: string[], b: string[]): number[][] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  return dp
}

function backtrackDiff(
  original: string[],
  modified: string[],
  lcs: number[][]
): DiffLine[] {
  const result: DiffLine[] = []
  let i = original.length
  let j = modified.length
  let originalLineNum = original.length
  let modifiedLineNum = modified.length

  // Backtrack from bottom-right
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && original[i - 1] === modified[j - 1]) {
      // Unchanged line
      result.unshift({
        type: 'unchanged',
        content: original[i - 1],
        lineNumber: modifiedLineNum,
        originalLineNumber: originalLineNum,
        newLineNumber: modifiedLineNum,
      })
      i--
      j--
      originalLineNum--
      modifiedLineNum--
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      // Added line (in modified, not in original)
      result.unshift({
        type: 'added',
        content: modified[j - 1],
        lineNumber: modifiedLineNum,
        newLineNumber: modifiedLineNum,
      })
      j--
      modifiedLineNum--
    } else if (i > 0) {
      // Removed line (in original, not in modified)
      result.unshift({
        type: 'removed',
        content: original[i - 1],
        lineNumber: originalLineNum,
        originalLineNumber: originalLineNum,
      })
      i--
      originalLineNum--
    }
  }

  return result
}

/**
 * Get line numbers that were added (for highlighting in editor)
 */
export function getAddedLineNumbers(diff: DiffResult): number[] {
  return diff.lines
    .filter(l => l.type === 'added')
    .map(l => l.newLineNumber!)
    .filter(Boolean)
}

/**
 * Get line numbers that were removed (for gutter markers)
 */
export function getRemovedLineNumbers(diff: DiffResult): number[] {
  return diff.lines
    .filter(l => l.type === 'removed')
    .map(l => l.originalLineNumber!)
    .filter(Boolean)
}
```

---

## 3. Diff Highlight Extension for CodeMirror

### 3.1 src/components/Editor/extensions/diffHighlight.ts

```typescript
import { Extension, StateField, StateEffect, RangeSet } from '@codemirror/state'
import { EditorView, Decoration, DecorationSet, WidgetType } from '@codemirror/view'

// Effects to update diff state
export const setDiffHighlights = StateEffect.define<{
  addedLines: number[]
  removedLines: Array<{ afterLine: number; content: string }>
}>()

export const clearDiffHighlights = StateEffect.define<void>()

// Decoration for added lines (AE-07)
const addedLineDecoration = Decoration.line({
  class: 'cm-diff-added',
})

// Widget for removed lines (AE-08)
class RemovedLineWidget extends WidgetType {
  constructor(readonly content: string) {
    super()
  }

  toDOM(): HTMLElement {
    const div = document.createElement('div')
    div.className = 'cm-diff-removed'
    div.textContent = this.content
    return div
  }

  eq(other: RemovedLineWidget): boolean {
    return this.content === other.content
  }
}

// State field to track diff decorations
const diffHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(decorations, tr) {
    // Check for clear effect
    for (const effect of tr.effects) {
      if (effect.is(clearDiffHighlights)) {
        return Decoration.none
      }
      
      if (effect.is(setDiffHighlights)) {
        const { addedLines, removedLines } = effect.value
        const decorationRanges: any[] = []

        // Add line highlights for added lines
        for (const lineNum of addedLines) {
          const line = tr.state.doc.line(lineNum)
          decorationRanges.push(addedLineDecoration.range(line.from))
        }

        // Add widgets for removed lines
        for (const removed of removedLines) {
          // Insert widget after the specified line
          const line = tr.state.doc.line(Math.min(removed.afterLine, tr.state.doc.lines))
          const widget = Decoration.widget({
            widget: new RemovedLineWidget(removed.content),
            side: 1, // After the line
            block: true,
          })
          decorationRanges.push(widget.range(line.to))
        }

        // Sort by position
        decorationRanges.sort((a, b) => a.from - b.from)

        return Decoration.set(decorationRanges)
      }
    }

    // Map through document changes
    return decorations.map(tr.changes)
  },
  provide: (field) => EditorView.decorations.from(field),
})

// Theme for diff highlighting
// Colors from design spec (03-ui-ux-design.md)
export const diffTheme = EditorView.theme({
  // AE-07: Added lines - green background (#E8F5E9)
  '.cm-diff-added': {
    backgroundColor: '#E8F5E9 !important',
  },
  // AE-08: Removed lines - red background (#FFEBEE)
  '.cm-diff-removed': {
    backgroundColor: '#FFEBEE',
    color: '#B71C1C',
    textDecoration: 'line-through',
    opacity: '0.7',
    padding: '2px 4px',
    display: 'block',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: 'inherit',
    lineHeight: '1.5',
    borderLeft: '3px solid #F44336',
    marginLeft: '-3px',
  },
})

// Dark mode theme
// Colors from design spec (03-ui-ux-design.md)
export const diffThemeDark = EditorView.theme({
  // AE-07: Added lines - #1B5E20 at 30% opacity
  '.cm-diff-added': {
    backgroundColor: 'rgba(27, 94, 32, 0.3) !important',
  },
  // AE-08: Removed lines - #B71C1C at 30% opacity
  '.cm-diff-removed': {
    backgroundColor: 'rgba(183, 28, 28, 0.3)',
    color: '#EF5350',
    textDecoration: 'line-through',
    opacity: '0.7',
    padding: '2px 4px',
    display: 'block',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: 'inherit',
    lineHeight: '1.5',
    borderLeft: '3px solid #EF5350',
    marginLeft: '-3px',
  },
})

export function createDiffExtension(isDark: boolean): Extension {
  return [
    diffHighlightField,
    isDark ? diffThemeDark : diffTheme,
  ]
}

/**
 * Note on Diff Display Strategy:
 * 
 * - Added lines: Highlighted with green background in the editor
 * - Removed lines: Shown as inline widgets AFTER the previous unchanged line
 *   (displayed as struck-through text with red background)
 * 
 * This approach allows users to see what was removed in context,
 * without modifying the actual document content.
 */
```

---

## 4. Update Editor Store

### 4.1 src/stores/editorStore.ts (additions)

Add actions for AI editing workflow:

```typescript
// Add to editorStore actions:

interface EditorStoreActions {
  // ... existing actions ...
  
  // AE-03: Save pre-edit snapshot
  startAIEdit: (tabId: string) => void
  
  // AE-05: Update content during streaming
  updateAIEditContent: (tabId: string, content: string) => void
  
  // AE-11: Accept changes
  acceptAIEdit: (tabId: string) => void
  
  // AE-12: Revert changes
  revertAIEdit: (tabId: string) => void
  
  // AE-13: Cancel during streaming
  cancelAIEdit: (tabId: string) => void
  
  // Set showDiff state
  setShowDiff: (tabId: string, show: boolean) => void
}

// Implementation:

startAIEdit: (tabId) => {
  const { tabs } = get()
  const tab = tabs.get(tabId)
  if (!tab) return

  // AE-03: Save pre-edit snapshot
  const updatedTab: TabState = {
    ...tab,
    preEditSnapshot: tab.content,
    isAIEditing: true,
    showDiff: false,
  }

  const newTabs = new Map(tabs)
  newTabs.set(tabId, updatedTab)
  set({ tabs: newTabs })
},

updateAIEditContent: (tabId, content) => {
  const { tabs } = get()
  const tab = tabs.get(tabId)
  if (!tab) return

  // AE-05: Update content progressively
  const updatedTab: TabState = {
    ...tab,
    content,
  }

  const newTabs = new Map(tabs)
  newTabs.set(tabId, updatedTab)
  set({ tabs: newTabs })
},

acceptAIEdit: (tabId) => {
  const { tabs } = get()
  const tab = tabs.get(tabId)
  if (!tab) return

  // AE-11: Commit changes
  const updatedTab: TabState = {
    ...tab,
    preEditSnapshot: null,
    isAIEditing: false,
    showDiff: false,
    isDirty: tab.content !== tab.savedContent, // Mark dirty if changed from saved
  }

  const newTabs = new Map(tabs)
  newTabs.set(tabId, updatedTab)
  set({ tabs: newTabs })
},

revertAIEdit: (tabId) => {
  const { tabs } = get()
  const tab = tabs.get(tabId)
  if (!tab || !tab.preEditSnapshot) return

  // AE-12: Restore snapshot
  const updatedTab: TabState = {
    ...tab,
    content: tab.preEditSnapshot,
    preEditSnapshot: null,
    isAIEditing: false,
    showDiff: false,
  }

  const newTabs = new Map(tabs)
  newTabs.set(tabId, updatedTab)
  set({ tabs: newTabs })
},

cancelAIEdit: (tabId) => {
  const { tabs } = get()
  const tab = tabs.get(tabId)
  if (!tab) return

  // AE-13: Cancel and revert if snapshot exists
  const updatedTab: TabState = {
    ...tab,
    content: tab.preEditSnapshot || tab.content,
    preEditSnapshot: null,
    isAIEditing: false,
    showDiff: false,
  }

  const newTabs = new Map(tabs)
  newTabs.set(tabId, updatedTab)
  set({ tabs: newTabs })
},

setShowDiff: (tabId, show) => {
  const { tabs } = get()
  const tab = tabs.get(tabId)
  if (!tab) return

  const updatedTab: TabState = {
    ...tab,
    showDiff: show,
    isAIEditing: false, // Streaming complete
  }

  const newTabs = new Map(tabs)
  newTabs.set(tabId, updatedTab)
  set({ tabs: newTabs })
},
```

---

## 5. AI Edit Hook

### 5.1 src/hooks/useAIEdit.ts

```typescript
import { useCallback, useEffect, useRef } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { useAIStore } from '@/stores/aiStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { computeDiff, type DiffResult } from '@/utils/diff'

interface UseAIEditReturn {
  startEdit: (instruction: string) => Promise<void>
  acceptEdit: () => void
  revertEdit: () => void
  cancelEdit: () => void
  isEditing: boolean
  showDiff: boolean
  diffResult: DiffResult | null
}

export function useAIEdit(): UseAIEditReturn {
  const activeTabId = useEditorStore((s) => s.activeTabId)
  const getActiveTab = useEditorStore((s) => s.getActiveTab)
  const startAIEdit = useEditorStore((s) => s.startAIEdit)
  const updateAIEditContent = useEditorStore((s) => s.updateAIEditContent)
  const acceptAIEdit = useEditorStore((s) => s.acceptAIEdit)
  const revertAIEdit = useEditorStore((s) => s.revertAIEdit)
  const cancelAIEdit = useEditorStore((s) => s.cancelAIEdit)
  const setShowDiff = useEditorStore((s) => s.setShowDiff)
  
  const addMessage = useAIStore((s) => s.addMessage)
  const setLoading = useAIStore((s) => s.setLoading)
  const setStreaming = useAIStore((s) => s.setStreaming)
  const setError = useAIStore((s) => s.setError)
  
  const selectedModel = useSettingsStore((s) => s.selectedModel)
  const systemPrompt = useSettingsStore((s) => s.systemPrompt)

  const diffResultRef = useRef<DiffResult | null>(null)
  const preEditContentRef = useRef<string>('')

  // Get current tab state
  const activeTab = getActiveTab()
  const isEditing = activeTab?.isAIEditing || false
  const showDiff = activeTab?.showDiff || false

  // Listen for streaming events during edit
  useEffect(() => {
    if (!activeTabId) return

    const unsubChunk = window.electron.onAIEvent('ai:edit-chunk', (data: any) => {
      // AE-05: Update content progressively
      updateAIEditContent(activeTabId, data.fullContent)
    })

    const unsubComplete = window.electron.onAIEvent('ai:edit-complete', (data: any) => {
      // AE-06: Compute diff when streaming ends
      const finalContent = data.content
      const originalContent = preEditContentRef.current

      diffResultRef.current = computeDiff(originalContent, finalContent)
      
      // Show diff and banner
      setShowDiff(activeTabId, true)
      setLoading(false)
      setStreaming(false)
    })

    const unsubError = window.electron.onAIEvent('ai:edit-error', (data: any) => {
      // Cancel and revert on error
      cancelAIEdit(activeTabId)
      setError(data.error)
      setLoading(false)
      setStreaming(false)
    })

    return () => {
      unsubChunk()
      unsubComplete()
      unsubError()
    }
  }, [activeTabId])

  // AE-01, AE-02: Start AI edit
  const startEdit = useCallback(async (instruction: string) => {
    if (!activeTabId) return

    const tab = getActiveTab()
    if (!tab) return

    // Save original content for diff
    preEditContentRef.current = tab.content

    // AE-03: Save pre-edit snapshot
    startAIEdit(activeTabId)

    // Add user message to chat history (marked as edit)
    addMessage(activeTabId, {
      role: 'user',
      content: instruction,
      isEdit: true,
    })

    setLoading(true)
    setStreaming(true)
    setError(null)

    try {
      const result = await window.electron.ai.edit({
        instruction,
        documentContent: tab.content,
        model: selectedModel,
        systemPrompt,
      })

      if (result.error) {
        throw new Error(result.error)
      }
    } catch (error) {
      const errorMessage = (error as Error).message
      if (errorMessage !== 'aborted') {
        setError(errorMessage)
        cancelAIEdit(activeTabId)
      }
      setLoading(false)
      setStreaming(false)
    }
  }, [activeTabId, selectedModel, systemPrompt])

  // AE-11: Accept changes
  const acceptEdit = useCallback(() => {
    if (!activeTabId) return
    
    // Add AI response to chat history
    const tab = getActiveTab()
    if (tab) {
      addMessage(activeTabId, {
        role: 'assistant',
        content: `Changes applied. Modified ${diffResultRef.current?.addedCount || 0} lines, removed ${diffResultRef.current?.removedCount || 0} lines.`,
        isEdit: true,
      })
    }

    acceptAIEdit(activeTabId)
    diffResultRef.current = null
  }, [activeTabId, acceptAIEdit, addMessage, getActiveTab])

  // AE-12: Revert changes
  const revertEdit = useCallback(() => {
    if (!activeTabId) return
    
    // Add revert message to chat history
    addMessage(activeTabId, {
      role: 'assistant',
      content: 'Changes reverted.',
      isEdit: true,
    })

    revertAIEdit(activeTabId)
    diffResultRef.current = null
  }, [activeTabId, revertAIEdit, addMessage])

  // AE-13: Cancel during streaming
  // Reverts to pre-edit snapshot when cancelled mid-stream
  const cancelEdit = useCallback(async () => {
    if (!activeTabId) return
    
    // Cancel the active stream
    await window.electron.ai.cancel()
    
    // Revert to pre-edit snapshot (handled by cancelAIEdit)
    cancelAIEdit(activeTabId)
    diffResultRef.current = null
    setLoading(false)
    setStreaming(false)
    
    // Add cancellation message to chat
    addMessage(activeTabId, {
      role: 'assistant',
      content: 'Edit cancelled. Document restored to original state.',
      isEdit: true,
    })
  }, [activeTabId, cancelAIEdit, setLoading, setStreaming, addMessage])

  return {
    startEdit,
    acceptEdit,
    revertEdit,
    cancelEdit,
    isEditing,
    showDiff,
    diffResult: diffResultRef.current,
  }
}
```

---

## 6. Diff Banner Component

### 6.1 src/components/Editor/DiffBanner.tsx

```typescript
import Icon from '@/components/common/Icon'
import { useAIEdit } from '@/hooks/useAIEdit'
import { useEditorStore } from '@/stores/editorStore'

export default function DiffBanner() {
  const activeTab = useEditorStore((s) => s.getActiveTab())
  const { acceptEdit, revertEdit, cancelEdit, diffResult, isEditing } = useAIEdit()

  // Show streaming banner during edit, or diff banner after
  if (!activeTab?.isAIEditing && !activeTab?.showDiff) return null

  // AE-04: Show streaming state with cancel option
  if (activeTab.isAIEditing) {
    return (
      <div className="
        absolute top-0 left-0 right-0 z-10
        flex items-center justify-between
        px-4 py-2
        bg-blue-50 dark:bg-blue-900/30
        border-b border-blue-200 dark:border-blue-700
      ">
        <div className="flex items-center gap-3 text-sm">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="font-medium text-blue-800 dark:text-blue-200">
            AI is editing your document...
          </span>
        </div>
        {/* AE-13: Cancel button */}
        <button
          onClick={cancelEdit}
          className="
            flex items-center gap-1.5 px-3 py-1.5
            rounded-lg border border-red-300 dark:border-red-600
            text-sm font-medium text-red-600 dark:text-red-400
            hover:bg-red-50 dark:hover:bg-red-900/30
            transition-colors
          "
        >
          <Icon name="close" size={16} />
          Cancel
        </button>
      </div>
    )
  }

  // AE-09: Diff banner after streaming complete
  const addedCount = diffResult?.addedCount || 0
  const removedCount = diffResult?.removedCount || 0

  return (
    <div className="
      absolute top-0 left-0 right-0 z-10
      flex items-center justify-between
      px-4 py-2
      bg-amber-50 dark:bg-amber-900/30
      border-b border-amber-200 dark:border-amber-700
    ">
      {/* Left: Change summary */}
      <div className="flex items-center gap-4 text-sm">
        <span className="font-medium text-amber-800 dark:text-amber-200">
          AI made changes to your document
        </span>
        <div className="flex items-center gap-3 text-amber-700 dark:text-amber-300">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-[#E8F5E9] dark:bg-[#1B5E20]/50" />
            +{addedCount} added
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-[#FFEBEE] dark:bg-[#B71C1C]/50" />
            -{removedCount} removed
          </span>
        </div>
      </div>

      {/* Right: Accept / Revert buttons */}
      <div className="flex items-center gap-2">
        {/* AE-12: Revert button */}
        <button
          onClick={revertEdit}
          className="
            flex items-center gap-1.5 px-3 py-1.5
            rounded-lg border border-gray-300 dark:border-gray-600
            text-sm font-medium
            text-text-primary-light dark:text-text-primary-dark
            hover:bg-gray-100 dark:hover:bg-gray-700
            transition-colors
          "
        >
          <Icon name="undo" size={16} />
          Revert
        </button>

        {/* AE-11: Accept button */}
        <button
          onClick={acceptEdit}
          className="
            flex items-center gap-1.5 px-3 py-1.5
            rounded-lg
            bg-green-600 dark:bg-green-700
            text-sm font-medium text-white
            hover:bg-green-700 dark:hover:bg-green-600
            transition-colors
          "
        >
          <Icon name="check" size={16} />
          Accept
        </button>
      </div>
    </div>
  )
}
```

---

## 7. Update AI Edit Handler

### 7.1 electron/main/ipc/ai-handlers.ts (ai:edit implementation)

```typescript
// Replace the stub in ai-handlers.ts:

// AI Document Edit (AE-01 through AE-13)
ipcMain.handle('ai:edit', async (event, params: {
  instruction: string
  documentContent: string
  model: string
  systemPrompt: string
  streamId?: string
}) => {
  const settings = getSettings()
  const apiKey = settings.openRouterApiKey

  if (!apiKey) {
    return { error: 'No API key configured' }
  }

  const streamId = params.streamId || `edit-${Date.now()}`
  const controller = new AbortController()
  activeStreams.set(streamId, controller)

  try {
    // AE-02: Construct edit-specific system prompt
    const editSystemPrompt = `You are editing a Markdown document. 

INSTRUCTIONS:
1. Return the COMPLETE modified document
2. Only change what the user asked for
3. Return raw Markdown text - NO code fences, NO explanations
4. Preserve all formatting and structure not related to the requested change
5. If you cannot make the requested change, return the original document unchanged

User's system prompt context:
${params.systemPrompt}

CURRENT DOCUMENT:
${params.documentContent}

USER REQUEST: ${params.instruction}

Return the complete modified document below:`

    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://marxist.app',
        'X-Title': 'Marxist',
      },
      body: JSON.stringify({
        model: params.model,
        messages: [
          { role: 'user', content: editSystemPrompt },
        ],
        stream: true,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return { error: error.message || `HTTP ${response.status}` }
    }

    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) {
      return { error: 'Window not found' }
    }

    const reader = response.body?.getReader()
    if (!reader) {
      return { error: 'No response body' }
    }

    const decoder = new TextDecoder()
    let fullContent = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content || ''
              
              if (content) {
                fullContent += content
                // AE-05: Send chunk to renderer for progressive update
                window.webContents.send('ai:edit-chunk', {
                  streamId,
                  content,
                  fullContent,
                })
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    activeStreams.delete(streamId)

    // AE-06: Send completion event
    window.webContents.send('ai:edit-complete', { streamId, content: fullContent })

    return { success: true, content: fullContent }
  } catch (error) {
    activeStreams.delete(streamId)
    
    if ((error as Error).name === 'AbortError') {
      // AE-13: Cancelled
      const window = BrowserWindow.fromWebContents(event.sender)
      window?.webContents.send('ai:edit-error', { streamId, error: 'aborted' })
      return { error: 'aborted' }
    }
    
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.webContents.send('ai:edit-error', { 
      streamId, 
      error: (error as Error).message 
    })
    
    return { error: (error as Error).message }
  }
})
```

---

## 8. Update Preload Types

### 8.1 electron/preload/types.ts (additions)

```typescript
export interface AIEditParams {
  instruction: string
  documentContent: string
  model: string
  systemPrompt: string
  streamId?: string
}

export interface AIEditResult {
  success?: boolean
  content?: string
  error?: string
}

// Update ElectronAPI.ai:
ai: {
  verifyKey: (key: string) => Promise<{ valid: boolean; error?: string }>
  listModels: () => Promise<{ models?: Array<{ id: string; name: string; contextLength: number }>; error?: string }>
  chat: (params: AIChatParams) => Promise<AIChatResult>
  edit: (params: AIEditParams) => Promise<AIEditResult>
  cancel: (streamId?: string) => Promise<{ success: boolean }>
}

// Add to onAIEvent valid channels:
'ai:edit-chunk', 'ai:edit-complete', 'ai:edit-error'
```

### 8.2 electron/preload/index.ts (update onAIEvent)

```typescript
onAIEvent: (channel: string, callback: (data: unknown) => void) => {
  const validChannels = [
    'ai:stream-chunk', 'ai:stream-complete', 'ai:stream-error',
    'ai:edit-chunk', 'ai:edit-complete', 'ai:edit-error',
  ]
  if (validChannels.includes(channel)) {
    const handler = (_: unknown, data: unknown) => callback(data)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  }
  return () => {}
},
```

---

## 9. Update CodeMirror Integration

### 9.1 src/hooks/useCodeMirror.ts (update for read-only during AI edit)

```typescript
// In useCodeMirror, add effect to handle AI editing state:

// Watch for AI editing state changes
useEffect(() => {
  if (!editorView) return
  
  // AE-04, AE-10: Lock editor during AI editing or while showing diff
  const isReadOnly = activeTab?.isAIEditing || activeTab?.showDiff || false
  
  editorView.dispatch({
    effects: EditorView.editable.reconfigure(EditorView.editable.of(!isReadOnly)),
  })
}, [editorView, activeTab?.isAIEditing, activeTab?.showDiff])

// Add diff extension to editor
const extensions = useMemo(() => [
  // ... existing extensions ...
  createDiffExtension(isDark),
], [isDark, /* other deps */])
```

### 9.2 Update editor to apply diff highlights

```typescript
// In useCodeMirror or a dedicated useDiffHighlights hook:

import { setDiffHighlights, clearDiffHighlights } from './extensions/diffHighlight'

// Apply diff highlights when showDiff changes
useEffect(() => {
  if (!editorView || !activeTab) return

  if (activeTab.showDiff && diffResult) {
    // Calculate added line numbers in the new document
    const addedLines = diffResult.lines
      .filter(l => l.type === 'added' && l.newLineNumber)
      .map(l => l.newLineNumber!)

    // Calculate removed lines with their content and position
    const removedLines: Array<{ afterLine: number; content: string }> = []
    let currentLine = 0
    
    for (const line of diffResult.lines) {
      if (line.type === 'unchanged' || line.type === 'added') {
        currentLine++
      }
      if (line.type === 'removed') {
        removedLines.push({
          afterLine: currentLine,
          content: line.content,
        })
      }
    }

    editorView.dispatch({
      effects: setDiffHighlights.of({ addedLines, removedLines }),
    })
  } else {
    editorView.dispatch({
      effects: clearDiffHighlights.of(),
    })
  }
}, [editorView, activeTab?.showDiff, diffResult])
```

---

## 10. Update Editor Panel Layout

### 10.1 src/components/Editor/EditorPanel.tsx (or equivalent)

```typescript
import DiffBanner from './DiffBanner'

export default function EditorPanel() {
  return (
    <div className="relative h-full">
      {/* AE-09: Diff banner at top */}
      <DiffBanner />
      
      {/* Editor content - add padding-top when banner is visible */}
      <div className={`h-full ${showDiff ? 'pt-12' : ''}`}>
        <CodeMirrorEditor ... />
      </div>
    </div>
  )
}
```

---

## 11. Integrate Edit Trigger in Chat

### 11.1 Update ChatInput to detect edit intent

The simplest approach: all messages in AI panel trigger edits. Or use a toggle/button.

**Option A: Dedicated Edit Button**

```typescript
// In ChatInput.tsx, add an edit mode toggle:

const [isEditMode, setIsEditMode] = useState(false)
const { startEdit } = useAIEdit()

const handleSend = useCallback(() => {
  if (!input.trim() || isLoading || disabled) return
  
  if (isEditMode) {
    startEdit(input.trim())
  } else {
    sendMessage(input.trim())
  }
  
  setInput('')
}, [input, isLoading, disabled, isEditMode, sendMessage, startEdit])

// Add toggle button in UI:
<button
  onClick={() => setIsEditMode(!isEditMode)}
  className={`... ${isEditMode ? 'text-accent' : ''}`}
  title={isEditMode ? 'Edit mode (AI will modify document)' : 'Chat mode'}
>
  <Icon name={isEditMode ? 'edit_document' : 'chat'} size={18} />
</button>
```

**Option B: Keyword Detection (simpler UX)**

```typescript
// Detect edit intent from message content
function detectEditIntent(message: string): boolean {
  const editPatterns = [
    /^(fix|change|update|modify|edit|replace|remove|delete|add|insert)/i,
    /(my|the|this)\s+(table|heading|list|paragraph|code|text)/i,
    /make\s+(it|this|the)/i,
  ]
  return editPatterns.some(pattern => pattern.test(message))
}

const handleSend = useCallback(() => {
  if (!input.trim() || isLoading || disabled) return
  
  const message = input.trim()
  
  if (detectEditIntent(message)) {
    startEdit(message)
  } else {
    sendMessage(message)
  }
  
  setInput('')
}, [input, isLoading, disabled, sendMessage, startEdit])
```

**Recommended Approach:** Option A (explicit edit button) provides clearer UX and avoids false positives from keyword detection. The button can show the current mode (chat vs edit) with a tooltip explaining the difference.

---

## 12. Visual Verification Table

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Added line background | `#E8F5E9` | `rgba(27, 94, 32, 0.3)` |
| Removed line background | `#FFEBEE` | `rgba(183, 28, 28, 0.3)` |
| Removed line text | `#B71C1C` strikethrough | `#EF5350` strikethrough |
| Banner background | `#FFFBEB` (amber-50) | `rgba(180, 83, 9, 0.3)` |
| Banner border | `#FDE68A` (amber-200) | `#B45309` (amber-700) |
| Accept button | `#16A34A` bg, white text | `#15803D` bg, white text |
| Revert button | White bg, gray border | Dark bg, gray border |

---

## 13. Testing

### 13.1 tests/utils/diff.test.ts

```typescript
import { describe, it, expect } from 'vitest'
import { computeDiff } from '@/utils/diff'

describe('computeDiff', () => {
  it('detects added lines', () => {
    const original = 'line 1\nline 2'
    const modified = 'line 1\nline 2\nline 3'
    
    const result = computeDiff(original, modified)
    
    expect(result.addedCount).toBe(1)
    expect(result.removedCount).toBe(0)
    expect(result.lines.find(l => l.type === 'added')?.content).toBe('line 3')
  })

  it('detects removed lines', () => {
    const original = 'line 1\nline 2\nline 3'
    const modified = 'line 1\nline 3'
    
    const result = computeDiff(original, modified)
    
    expect(result.removedCount).toBe(1)
    expect(result.addedCount).toBe(0)
    expect(result.lines.find(l => l.type === 'removed')?.content).toBe('line 2')
  })

  it('detects changed lines as remove + add', () => {
    const original = 'line 1\nold line\nline 3'
    const modified = 'line 1\nnew line\nline 3'
    
    const result = computeDiff(original, modified)
    
    expect(result.removedCount).toBe(1)
    expect(result.addedCount).toBe(1)
  })

  it('handles empty documents', () => {
    const result = computeDiff('', 'new content')
    
    expect(result.addedCount).toBe(1)
    expect(result.removedCount).toBe(0)
  })

  it('handles identical documents', () => {
    const doc = 'line 1\nline 2'
    const result = computeDiff(doc, doc)
    
    expect(result.addedCount).toBe(0)
    expect(result.removedCount).toBe(0)
    expect(result.unchangedCount).toBe(2)
  })
})
```

### 13.2 tests/hooks/useAIEdit.test.ts

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAIEdit } from '@/hooks/useAIEdit'
import { useEditorStore } from '@/stores/editorStore'

// Mock window.electron
vi.mock('@/stores/editorStore')
vi.mock('@/stores/aiStore')
vi.mock('@/stores/settingsStore')

describe('useAIEdit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('startEdit (AE-01, AE-03)', () => {
    it('saves pre-edit snapshot and sets isAIEditing', async () => {
      const startAIEdit = vi.fn()
      vi.mocked(useEditorStore).mockReturnValue({
        activeTabId: 'tab-1',
        getActiveTab: () => ({ content: 'original content' }),
        startAIEdit,
      } as any)

      const { result } = renderHook(() => useAIEdit())
      
      await act(async () => {
        await result.current.startEdit('fix my table')
      })

      expect(startAIEdit).toHaveBeenCalledWith('tab-1')
    })
  })

  describe('acceptEdit (AE-11)', () => {
    it('clears snapshot and unlocks editor', () => {
      const acceptAIEdit = vi.fn()
      vi.mocked(useEditorStore).mockReturnValue({
        activeTabId: 'tab-1',
        getActiveTab: () => ({ content: 'modified' }),
        acceptAIEdit,
      } as any)

      const { result } = renderHook(() => useAIEdit())
      
      act(() => {
        result.current.acceptEdit()
      })

      expect(acceptAIEdit).toHaveBeenCalledWith('tab-1')
    })
  })

  describe('revertEdit (AE-12)', () => {
    it('restores original content', () => {
      const revertAIEdit = vi.fn()
      vi.mocked(useEditorStore).mockReturnValue({
        activeTabId: 'tab-1',
        getActiveTab: () => ({}),
        revertAIEdit,
      } as any)

      const { result } = renderHook(() => useAIEdit())
      
      act(() => {
        result.current.revertEdit()
      })

      expect(revertAIEdit).toHaveBeenCalledWith('tab-1')
    })
  })
})
```

### 13.3 tests/components/DiffBanner.test.tsx

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DiffBanner from '@/components/Editor/DiffBanner'
import { useEditorStore } from '@/stores/editorStore'
import { useAIEdit } from '@/hooks/useAIEdit'

vi.mock('@/stores/editorStore')
vi.mock('@/hooks/useAIEdit')

describe('DiffBanner', () => {
  it('shows streaming state during AI edit (AE-04)', () => {
    vi.mocked(useEditorStore).mockReturnValue({
      getActiveTab: () => ({ isAIEditing: true, showDiff: false }),
    } as any)
    vi.mocked(useAIEdit).mockReturnValue({
      cancelEdit: vi.fn(),
      isEditing: true,
    } as any)

    render(<DiffBanner />)

    expect(screen.getByText(/AI is editing/)).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('renders diff banner when showDiff is true (AE-09)', () => {
    vi.mocked(useEditorStore).mockReturnValue({
      getActiveTab: () => ({ isAIEditing: false, showDiff: true }),
    } as any)
    vi.mocked(useAIEdit).mockReturnValue({
      acceptEdit: vi.fn(),
      revertEdit: vi.fn(),
      diffResult: { addedCount: 3, removedCount: 1 },
    } as any)

    render(<DiffBanner />)

    expect(screen.getByText(/AI made changes/)).toBeInTheDocument()
    expect(screen.getByText('+3 added')).toBeInTheDocument()
    expect(screen.getByText('-1 removed')).toBeInTheDocument()
  })

  it('does not render when not editing and showDiff is false', () => {
    vi.mocked(useEditorStore).mockReturnValue({
      getActiveTab: () => ({ isAIEditing: false, showDiff: false }),
    } as any)

    render(<DiffBanner />)

    expect(screen.queryByText(/AI made changes/)).not.toBeInTheDocument()
    expect(screen.queryByText(/AI is editing/)).not.toBeInTheDocument()
  })

  it('calls acceptEdit on Accept click (AE-11)', () => {
    const acceptEdit = vi.fn()
    vi.mocked(useEditorStore).mockReturnValue({
      getActiveTab: () => ({ showDiff: true }),
    } as any)
    vi.mocked(useAIEdit).mockReturnValue({
      acceptEdit,
      revertEdit: vi.fn(),
      diffResult: { addedCount: 1, removedCount: 0 },
    } as any)

    render(<DiffBanner />)
    fireEvent.click(screen.getByText('Accept'))

    expect(acceptEdit).toHaveBeenCalled()
  })

  it('calls revertEdit on Revert click (AE-12)', () => {
    const revertEdit = vi.fn()
    vi.mocked(useEditorStore).mockReturnValue({
      getActiveTab: () => ({ showDiff: true }),
    } as any)
    vi.mocked(useAIEdit).mockReturnValue({
      acceptEdit: vi.fn(),
      revertEdit,
      diffResult: { addedCount: 1, removedCount: 0 },
    } as any)

    render(<DiffBanner />)
    fireEvent.click(screen.getByText('Revert'))

    expect(revertEdit).toHaveBeenCalled()
  })
})
```

### 13.4 tests/e2e/ai-edit.spec.ts

```typescript
import { test, expect, _electron as electron } from '@playwright/test'
import { resolve } from 'path'

test.describe('AI Document Editing', () => {
  test('editor becomes read-only during AI edit (AE-04)', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    
    // Type some content
    const editor = window.locator('.cm-editor')
    await editor.click()
    await window.keyboard.type('# Test Document')
    
    // Trigger AI edit (mock or real based on test setup)
    // During edit, verify editor is not editable
    // This would require mocking the AI response or using a test endpoint

    await electronApp.close()
  })

  test('shows Accept/Revert banner after edit (AE-09)', async () => {
    // Similar setup with mocked AI response
    // Verify banner appears after streaming completes
  })

  test('Accept commits changes (AE-11)', async () => {
    // Verify clicking Accept:
    // - Clears diff highlights
    // - Unlocks editor
    // - Marks document as dirty
  })

  test('Revert restores original (AE-12)', async () => {
    // Verify clicking Revert:
    // - Restores pre-edit content
    // - Clears diff highlights
    // - Unlocks editor
  })
})
```

---

## 14. Acceptance Criteria

### 14.1 P0 Requirements Checklist

- [ ] AI can directly modify document content (AE-01)
- [ ] AI operates on full document (AE-02)
- [ ] Pre-edit snapshot saved (AE-03)
- [ ] Editor locked read-only during streaming (AE-04)
- [ ] Content streams progressively (AE-05)
- [ ] Line-level diff computed after streaming (AE-06)
- [ ] Added lines highlighted green (AE-07)
- [ ] Removed lines highlighted red (AE-08)
- [ ] Banner with Accept/Revert at top of editor (AE-09)
- [ ] Editor remains read-only until user acts (AE-10)
- [ ] Accept: commits, clears diff, unlocks, marks dirty (AE-11)
- [ ] Revert: restores snapshot, clears diff, unlocks (AE-12)

### 14.2 P1 Requirements Checklist

- [ ] Stream can be cancelled mid-edit, reverts to snapshot (AE-13)

---

## 15. Output for Next Stage

This stage produces:

1. **useAIEdit hook** - Complete AI editing workflow
2. **DiffBanner component** - Accept/Revert UI
3. **Diff utilities** - Line-level diff algorithm
4. **CodeMirror diff extension** - Visual highlighting

This completes the core AI features. Future stages may include:
- Stage 11: Final polish, accessibility, and edge cases
- Stage 12: Performance optimization and testing
