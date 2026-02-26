# Stage 4 — Technical Architecture

## Stack Decision

| Layer | Choice | Rationale |
|---|---|---|
| Shell | **Electron** | Required — macOS desktop app with web tech |
| Frontend framework | **React** | Component model fits the panel-based UI well |
| State management | **Zustand** | Lightweight, no boilerplate, perfect for this scale |
| Markdown editor | **CodeMirror 6** | Modern, extensible, excellent Markdown mode + syntax highlighting + built-in find/replace |
| Markdown parser | **unified / remark** | Pluggable, supports GFM + extensions |
| Markdown renderer | **rehype + GitHub CSS** | Renders to HTML, apply github-markdown-css for styling |
| Styling | **Tailwind CSS** or **CSS Modules** | TBD — Tailwind for speed, CSS Modules for precision |
| AI integration | **OpenRouter API** (REST) | Single endpoint, any model, user brings their key |
| Build tool | **Vite** | Fast HMR, good Electron integration via electron-vite |
| Packaging | **electron-builder** | macOS .dmg and .app output |

---

## Project Structure

```
marxist/
├── electron/
│   ├── main.ts                  # Electron main process
│   ├── preload.ts               # Preload script (context bridge)
│   └── ipc/
│       ├── file-handlers.ts     # File open/save/recent/drag-drop
│       ├── draft-handlers.ts    # Temp folder draft persistence
│       ├── settings-handlers.ts # Settings read/write
│       └── ai-handlers.ts      # OpenRouter API calls (streaming)
├── src/
│   ├── App.tsx                  # Root component
│   ├── main.tsx                 # React entry point
│   ├── components/
│   │   ├── TopBar/
│   │   │   ├── TopBar.tsx
│   │   │   ├── ViewToggle.tsx
│   │   │   ├── FormattingToolbar.tsx
│   │   │   ├── OverflowMenu.tsx
│   │   │   └── WordCount.tsx
│   │   ├── Editor/
│   │   │   ├── MarkdownEditor.tsx   # CodeMirror wrapper
│   │   │   ├── EditorPanel.tsx      # Editor + corner icons container
│   │   │   ├── DiffHighlighter.ts   # AI edit diff rendering
│   │   │   ├── AIEditBanner.tsx     # Accept/Revert banner
│   │   │   └── SyntaxTheme.ts      # Custom CM6 highlight theme
│   │   ├── Preview/
│   │   │   ├── MarkdownPreview.tsx  # Rendered output
│   │   │   └── PreviewPanel.tsx     # Preview container
│   │   ├── SplitView/
│   │   │   ├── SplitView.tsx        # Split layout with divider
│   │   │   └── Divider.tsx          # The draggable pill divider
│   │   ├── Sidebar/
│   │   │   ├── FileList.tsx
│   │   │   └── FileListItem.tsx
│   │   ├── AIPanel/
│   │   │   ├── AIPanel.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   └── ChatInput.tsx
│   │   └── Settings/
│   │       ├── SettingsModal.tsx
│   │       ├── AppearanceSettings.tsx
│   │       ├── AISettings.tsx
│   │       ├── SystemPromptEditor.tsx
│   │       └── EditorSettings.tsx
│   ├── stores/
│   │   ├── editorStore.ts        # Multi-tab doc state, content, dirty flags
│   │   ├── viewStore.ts          # Active view, sidebar/AI panel, split ratio
│   │   ├── settingsStore.ts      # Theme, fonts, AI config, system prompt
│   │   ├── fileStore.ts          # Open tabs, recent files list
│   │   └── aiStore.ts            # Per-file chat histories, loading state
│   ├── hooks/
│   │   ├── useMarkdownParser.ts
│   │   ├── useOpenRouter.ts
│   │   ├── useFileOperations.ts
│   │   ├── useDiffHighlight.ts
│   │   └── useSessionRestore.ts
│   ├── styles/
│   │   ├── github-markdown.css
│   │   ├── themes/
│   │   │   ├── light.ts
│   │   │   └── dark.ts
│   │   └── global.css
│   └── utils/
│       ├── markdown.ts           # Parser config, plugins
│       ├── diff.ts               # Diff computation for AI edits
│       └── ipc.ts                # Renderer-side IPC helpers
├── assets/
│   ├── icon.png                  # The Marx dog (1024×1024)
│   ├── icon.icns                 # macOS icon format
│   └── fonts/
│       ├── IBMPlexMono-*.woff2
│       └── GoogleSansFlex-*.woff2
├── package.json
├── electron-builder.yml
├── vite.config.ts
└── tsconfig.json
```

---

## Electron Architecture

### Main Process Responsibilities
- Window management (single window)
- Native file dialogs (open, save, save-as)
- Reading/writing files to disk
- **Draft persistence** — writing unsaved content to temp folder on quit, restoring on launch
- Storing settings via `electron-store`
- Managing open tabs and recent files list
- Proxying OpenRouter API calls with streaming (keep API key in main process, never expose to renderer)
- macOS menu bar (File, Edit, View, Help)
- Drag-and-drop file handling
- Session state persistence

### Renderer Process Responsibilities
- All UI rendering (React)
- CodeMirror editor instance (per-tab, kept alive)
- Markdown parsing and rendering
- State management (Zustand)
- AI chat UI and diff highlighting
- Find and replace (CodeMirror built-in)

### IPC Bridge (Preload)

Key channels:

```typescript
// File operations
'file:open'          → opens native dialog, returns { path, content }
'file:save'          → saves content to path
'file:save-as'       → opens save dialog, saves content
'file:get-recent'    → returns recent files list
'file:drop'          → handles drag-and-drop .md file

// Drafts & session
'drafts:save-all'    → saves all unsaved tab states to temp folder
'drafts:restore'     → returns all saved drafts on launch
'drafts:clear'       → cleans up draft files after user saves

// Settings
'settings:get'       → returns full settings object
'settings:set'       → updates a settings key

// AI
'ai:chat'            → sends message + doc context to OpenRouter, streams response
'ai:edit'            → sends edit instruction + full doc, streams modified doc back
'ai:cancel'          → cancels an in-progress stream
'ai:verify-key'      → tests OpenRouter API key
'ai:list-models'     → fetches available models from OpenRouter
```

---

## CodeMirror 6 Setup

### Extensions to Use
- `@codemirror/lang-markdown` — Markdown language support with GFM
- `@codemirror/language` — syntax highlighting infrastructure
- `@codemirror/view` — line wrapping, editor DOM config
- `@codemirror/state` — state management, transactions
- `@codemirror/commands` — keybindings
- `@codemirror/search` — **find and replace (⌘F)**
- Custom highlight style for Markdown tokens

### Per-Tab Editor Strategy
Each open tab has its own editor state. When switching tabs, the CodeMirror state (content, undo history, cursor position, scroll position) is saved and restored. Options:
1. **Single CM instance, swap state** — save/restore `EditorState` snapshots per tab
2. **Multiple CM instances, show/hide via CSS** — heavier on memory but preserves everything naturally

Recommendation: Option 1 for up to 20 tabs. EditorState serialization is lightweight.

### Syntax Highlighting Color Plan

| Token | Light Mode | Dark Mode |
|---|---|---|
| Heading markers (`#`) | `#D32F2F` (red) | `#EF5350` |
| Heading text | `#1A1A1A` bold | `#E0E0E0` bold |
| Bold markers + text | `#6A1B9A` (purple) | `#CE93D8` |
| Italic markers + text | `#6A1B9A` | `#CE93D8` |
| Strikethrough | `#795548` | `#A1887F` |
| Link text | `#1565C0` (blue) | `#64B5F6` |
| Link URL | `#7B8794` (grey) | `#78909C` |
| Code (inline) | `#E65100` (orange) | `#FFB74D` |
| Code block fence | `#546E7A` | `#78909C` |
| Code block content | `#37474F` | `#B0BEC5` |
| Blockquote marker | `#43A047` (green) | `#81C784` |
| List marker | `#F57F17` (amber) | `#FFD54F` |
| HR (`---`) | `#BDBDBD` | `#616161` |
| HTML tags | `#00838F` (teal) | `#4DD0E1` |
| YAML frontmatter | `#5C6BC0` (indigo) | `#9FA8DA` |

---

## Markdown Rendering Pipeline

```
Raw Markdown (string)
    ↓
unified()
    .use(remarkParse)
    .use(remarkGfm)            # Tables, strikethrough, autolinks, task lists
    .use(remarkFrontmatter)    # YAML frontmatter (parsed, not rendered)
    .use(remarkMath)           # Math expressions — P2
    .use(remarkRehype)
    .use(rehypeHighlight)      # Code block syntax highlighting
    .use(rehypeKatex)          # Math rendering — P2
    .use(rehypeStringify)
    ↓
HTML string
    ↓
Rendered in preview panel with github-markdown-css
    ↓
Links get click handler → open in default browser via Electron shell.openExternal()
```

---

## AI Integration Architecture

### OpenRouter Integration
- All API calls through **main process** (never renderer)
- API key stored encrypted in `electron-store`
- Streaming responses via SSE
- Two modes: **chat** (conversational) and **edit** (document modification)

### Chat Flow
```
User types message in AI panel
    ↓
Renderer sends IPC 'ai:chat' with { message, documentContent, history }
    ↓
Main process constructs request:
    POST https://openrouter.ai/api/v1/chat/completions
    Body: {
        model: <selected>,
        messages: [
            { role: "system", content: userConfiguredSystemPrompt },
            { role: "system", content: "Current document:\n\n" + documentContent },
            ...history,
            { role: "user", content: message }
        ],
        stream: true
    }
    ↓
Tokens streamed back to renderer → displayed in chat panel
```

### Edit Flow (Document Modification)
```
User asks AI to edit (e.g., "fix my table")
    ↓
Renderer:
  1. Snapshots current document content (for revert)
  2. Locks editor to read-only
  3. Sends IPC 'ai:edit' with { instruction, documentContent, history }
    ↓
Main process constructs request with edit-specific system prompt:
    "You are editing a Markdown document. Return the COMPLETE modified document.
     Only change what the user asked for. Return raw Markdown, no code fences."
    ↓
Modified document streams back token by token
    ↓
Renderer replaces editor content progressively as tokens arrive
    ↓
Stream ends:
  1. Compute diff between snapshot and new content (line-level)
  2. Highlight added lines (green) and removed lines (red)
  3. Show Accept/Revert banner at top of editor
  4. Editor remains read-only until user acts
    ↓
Accept → clear diff highlights, unlock editor, update saved snapshot tracking
Revert → restore snapshot, clear diff, unlock editor
```

### Diff Computation
Use a line-level diff algorithm (e.g., `diff` npm package or custom LCS):
- Compare pre-edit and post-edit document line by line
- Mark added lines with green background
- Mark removed lines with red background (show inline as faded/struck-through or as gutter markers)
- Changed lines = removed + added pair

---

## Data Persistence

### Settings Storage
- Location: `~/Library/Application Support/Marxist/settings.json`
- Managed by `electron-store`
- Schema:
```json
{
  "theme": "system",
  "editorFontSize": 14,
  "previewFontSize": 16,
  "lineNumbers": false,
  "wordWrap": true,
  "spellCheck": true,
  "openRouterApiKey": "<encrypted>",
  "selectedModel": "anthropic/claude-sonnet-4-20250514",
  "systemPrompt": "You are a helpful writing assistant...",
  "recentFiles": [
    { "path": "/Users/.../doc.md", "lastOpened": "2025-..." }
  ]
}
```

### Draft Storage (Session Persistence)
- Location: `~/Library/Application Support/Marxist/drafts/`
- On quit: each unsaved tab's content written to a draft file
- On launch: all drafts restored as open tabs
- Draft files named by hash or sequential ID — not by document name
- Session state file tracks: which tabs were open, which was active, split ratio, sidebar state
- Drafts cleared for a tab when the user saves that file

### File Handling
- Files are plain `.md` on disk
- Manual save only — no auto-save
- Recent files list stored in settings (max 20, FIFO)
- Dirty state tracked per tab

---

## Performance Considerations

- **Editor:** CodeMirror 6 handles large documents natively
- **Rendering:** Debounce render pipeline 200ms after last keystroke
- **Tab switching:** Swap EditorState snapshots, not full re-renders
- **AI streaming:** Progressive DOM updates, not full document replacement on each token
- **Startup:** Lazy-load AI panel and settings modal
- **Session restore:** Load drafts asynchronously after initial render
- **Fonts:** Bundled locally — no network requests
- **Window size:** Remember position and size between sessions
