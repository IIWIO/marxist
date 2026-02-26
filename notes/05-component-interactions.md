# Stage 5 — Component Interactions & State Flows

## State Architecture (Zustand Stores)

### `viewStore`

```
{
  activeView: 'markdown' | 'split' | 'render',   // default: 'split'
  sidebarOpen: boolean,
  aiPanelOpen: boolean,
  splitRatio: number,             // 0.0 - 1.0, default 0.5
  theme: 'system' | 'light' | 'dark',
  resolvedTheme: 'light' | 'dark'
}
```

### `editorStore` (Multi-Tab)

```
{
  tabs: Map<tabId, {
    filePath: string | null,        // null = untitled
    fileName: string,               // "Untitled", "Untitled 2", or derived from path
    content: string,                // raw Markdown
    savedContent: string,           // last saved snapshot
    isDirty: boolean,               // content !== savedContent
    editorState: EditorState | null, // CodeMirror state snapshot
    scrollPosition: number,
    preEditSnapshot: string | null, // for AI revert
    isAIEditing: boolean,           // true while AI is streaming edits
    showDiff: boolean,              // true after AI edit, before accept/revert
  }>,
  activeTabId: string,
  wordCount: number,
  letterCount: number,
  untitledCounter: number          // tracks "Untitled 2", "Untitled 3", etc.
}
```

### `fileStore`

```
{
  openTabs: Array<{
    tabId: string,
    filePath: string | null,
    fileName: string,
    isDirty: boolean
  }>,
  recentFiles: Array<{
    path: string,
    name: string,
    lastOpened: string
  }>
}
```

### `aiStore` (Per-File Chat)

```
{
  chatHistories: Map<tabId, Array<{
    role: 'user' | 'assistant',
    content: string,
    timestamp: string,
    isEdit: boolean               // true if this was an edit request
  }>>,
  isLoading: boolean,
  isStreaming: boolean,
  selectedModel: string,
  apiKeyVerified: boolean,
  systemPrompt: string
}
```

### `settingsStore`

```
{
  theme: 'system' | 'light' | 'dark',
  editorFontSize: number,
  previewFontSize: number,
  lineNumbers: boolean,
  wordWrap: boolean,
  spellCheck: boolean,
  openRouterApiKey: string,        // only in main process memory
  selectedModel: string,
  systemPrompt: string,
  apiKeyVerified: boolean
}
```

---

## Key Interaction Flows

### Flow 1: App Launch

```
Electron main process starts
    ↓
Load settings from electron-store
    ↓
Load draft files from ~/Library/Application Support/Marxist/drafts/
Load session state (which tabs were open, active tab, split ratio)
    ↓
Create window with hiddenInset titleBarStyle
    ↓
Renderer initializes:
  - Restore all tabs from drafts + session state
  - Set active view to Split (default)
  - If no previous session: create one "Untitled" tab
  - Set sidebar closed, AI panel closed
    ↓
App is ready to use
```

### Flow 2: Switching Views

```
User clicks a view tab (e.g., "Render") or presses ⌘1/⌘2/⌘3
    ↓
viewStore.setActiveView('render')
    ↓
App.tsx reads activeView, renders:
  - 'markdown' → <EditorPanel fullWidth />
  - 'split'    → <SplitView> <EditorPanel /> <Divider /> <PreviewPanel /> </SplitView>
  - 'render'   → <PreviewPanel fullWidth />
    ↓
Editor content persists (lives in editorStore per-tab)
EditorState snapshot saved/restored for CodeMirror
Formatting toolbar hidden in Render-only view
```

### Flow 3: Switching Tabs (File Sidebar)

```
User clicks a file in the sidebar
    ↓
Save current tab's EditorState snapshot (cursor, scroll, undo history)
    ↓
fileStore.setActiveTab(newTabId)
    ↓
EditorStore loads the new tab's state:
  - content, savedContent, isDirty
  - Restore EditorState into CodeMirror
    ↓
AI panel loads the new tab's chat history from aiStore
    ↓
Word count and letter count update
Document name in top bar updates
```

**No save prompts.** Unsaved tabs just stay dirty. Their state is always in memory.

### Flow 4: Creating a New File (⌘N)

```
User presses ⌘N
    ↓
editorStore.untitledCounter++
fileName = untitledCounter === 1 ? "Untitled" : `Untitled ${untitledCounter}`
    ↓
Create new tab in editorStore with empty content
Add tab to fileStore.openTabs
    ↓
Switch to new tab (Flow 3)
Sidebar shows new tab entry with red dot (unsaved)
```

### Flow 5: Opening a File (⌘O or Drag-and-Drop)

```
User triggers ⌘O or drags .md file onto window
    ↓
Renderer sends IPC 'file:open' (with path if drag-and-drop)
    ↓
Main process:
  - If no path: show native open dialog (filter: .md, .markdown, .txt)
  - Read file content from disk
  - Add to recent files list
  - Return { path, name, content }
    ↓
Check if file is already open in a tab:
  - YES → switch to that tab
  - NO → create new tab, load content, switch to it
    ↓
savedContent = content (clean state)
isDirty = false
Sidebar shows green dot
```

### Flow 6: Saving a File (⌘S)

```
User presses ⌘S
    ↓
Check: does current tab have a filePath?
  - YES → send IPC 'file:save' with { path, content }
  - NO → send IPC 'file:save-as' (triggers native save dialog)
    ↓
Main process writes content to disk
Returns { path, name } (in case of save-as)
    ↓
editorStore:
  - Set savedContent = content
  - isDirty = false
  - If save-as: update filePath and fileName
    ↓
fileStore: update tab entry, dot turns green
Draft file for this tab cleared from temp folder
```

### Flow 7: App Quit

```
User quits app (⌘Q or close button)
    ↓
NO save prompts — quit is silent
    ↓
Main process:
  1. For each open tab, save to drafts folder:
     - File: drafts/{tabId}.md (content)
     - Metadata: drafts/{tabId}.json (filePath, fileName, isDirty, cursorPos)
  2. Save session state:
     - Open tab list + order
     - Active tab ID
     - Split ratio, sidebar state, AI panel state, active view
  3. Close window and quit
```

### Flow 8: Using the Split View Divider

```
User hovers over the divider pill → hover state (blue)
    ↓
User mousedown on pill → start tracking
    ↓
mousemove:
  - Calculate new splitRatio from mouse X relative to container
  - Clamp: min 0.2, max 0.8
  - viewStore.setSplitRatio(newRatio)
  - If AI panel open: both panels shrink equally within remaining space
    ↓
mouseup → stop tracking
    ↓
Double-click → viewStore.setSplitRatio(0.5)
```

### Flow 9: AI Chat Interaction

```
User clicks robot icon (or ⌘⇧A)
    ↓
viewStore.toggleAiPanel()
    ↓
AI panel slides in (360px from right)
Both editor and preview panels shrink equally to accommodate
    ↓
Panel loads chat history for current tab from aiStore
    ↓
User types message, hits Enter
    ↓
aiStore.addMessage(activeTabId, { role: 'user', content: message })
aiStore.setIsLoading(true)
    ↓
Renderer sends IPC 'ai:chat' with:
  { message, documentContent, history, systemPrompt }
    ↓
Tokens stream back → AI message builds progressively
    ↓
Stream ends → aiStore.setIsLoading(false)
```

### Flow 10: AI Document Edit

```
User asks AI to edit (e.g., "fix my table")
    ↓
Renderer detects edit intent (or all messages go through edit pipeline)
    ↓
1. editorStore: save preEditSnapshot = current content
2. editorStore: set isAIEditing = true (locks editor read-only)
3. Send IPC 'ai:edit' with { instruction, documentContent, history }
    ↓
Main process sends to OpenRouter with edit system prompt:
  "Return the COMPLETE modified document as raw Markdown."
    ↓
Modified document streams back token by token
Renderer replaces editor content progressively
    ↓
Stream ends:
  1. Compute line-level diff: preEditSnapshot vs new content
  2. Highlight added lines (green background), removed lines (red background)
  3. editorStore: set showDiff = true, isAIEditing = false
  4. Show Accept/Revert banner at top of editor
  5. Editor remains read-only
    ↓
User clicks Accept:
  - Clear diff highlights
  - Clear preEditSnapshot
  - showDiff = false
  - Unlock editor (editable again)
  - isDirty = true (content changed from saved version)
    ↓
OR User clicks Revert:
  - Restore preEditSnapshot as content
  - Clear diff highlights
  - Clear preEditSnapshot
  - showDiff = false
  - Unlock editor
```

### Flow 11: Formatting Toolbar Action

```
User clicks a formatting icon (e.g., Bold)
    ↓
Check: is there a text selection in the editor?
  - YES → wrap selection with Markdown syntax (e.g., **selection**)
  - NO → insert placeholder (e.g., **bold text**) with inner text selected
    ↓
Editor content updates
isDirty recalculated
Word/letter counts update
Preview re-renders (debounced 200ms)
```

### Flow 12: Find and Replace (⌘F)

```
User presses ⌘F
    ↓
CodeMirror's built-in search panel opens
    ↓
Standard find/replace behavior:
  - Search with highlight
  - Replace one / replace all
  - Case sensitive toggle
  - Regex toggle (if supported)
    ↓
Esc or close button dismisses the search panel
```

---

## Component Visibility Matrix

| Component | Markdown | Split | Render |
|---|---|---|---|
| TopBar | ✅ | ✅ | ✅ |
| ViewToggle | ✅ | ✅ | ✅ |
| FormattingToolbar | ✅ | ✅ | ❌ |
| WordCount / LetterCount | ✅ | ✅ | ✅ |
| EditorPanel | ✅ (full) | ✅ (left) | ❌ |
| Burger icon (sidebar toggle) | ✅ | ✅ | ❌ |
| Copy icon (top-right of editor) | ✅ | ✅ | ❌ |
| AI robot icon | ✅ (editor top-right) | ✅ (editor top-right) | ✅ (preview top-right) |
| File sidebar | ✅ (if open) | ✅ (if open) | ❌ |
| Divider | ❌ | ✅ | ❌ |
| PreviewPanel | ❌ | ✅ (right) | ✅ (full) |
| AI Panel | ✅ (if open) | ✅ (if open) | ✅ (if open) |
| AI Edit Banner | ✅ (if active) | ✅ (if active) | ❌ |
| Settings Modal | ✅ (overlay) | ✅ (overlay) | ✅ (overlay) |

---

## Error States to Handle

| Scenario | Handling |
|---|---|
| File fails to open | Native error dialog with path + error |
| File fails to save | Error dialog, keep dirty state, suggest save-as |
| File deleted externally | Detect on focus (fs.watch), offer to save copy |
| AI API key invalid | Inline error in settings, clear verified state |
| AI request fails | Error message in chat panel, allow retry |
| AI rate limited | Rate limit message in chat, suggest waiting |
| AI stream interrupted | Show partial result, offer to revert to pre-edit state |
| AI edit produces empty doc | Auto-revert, show error in chat |
| Draft folder corrupted | Skip corrupted drafts on restore, log warning |
| Very large file (>5MB) | Warn user, disable live preview, suggest Markdown-only view |
| Font fails to load | Fallback to system monospace / system sans |
| Window too narrow for split | Auto-switch to Markdown view, show tooltip |
| Drag-and-drop non-.md file | Ignore, optionally show tooltip "Only .md files supported" |
| 20+ tabs open | Oldest non-dirty tab auto-closes, or show warning |
