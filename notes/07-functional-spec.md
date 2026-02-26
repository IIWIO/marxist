# Stage 7 — Functional Specification

## Marxist v1.0 — Functional Specification

**App Name:** Marxist
**Platform:** macOS (Electron)
**Version:** 1.0
**Last Updated:** February 2026

---

## 1. Product Summary

Marxist is a standalone macOS Markdown editor built with Electron. It provides three viewing modes (Markdown, Split, Render), syntax-highlighted editing with IBM Plex Mono, GitHub-styled rendering, a tab-based file sidebar with session persistence, and an AI assistant panel powered by OpenRouter that can directly edit the document with real-time streaming and diff highlighting. The app ships with dark and light themes, a formatting toolbar with overflow, live word/letter counts, and a focused, professional writing experience. Manual save only — no auto-save.

---

## 2. Functional Requirements

### 2.1 Application Window

| ID | Requirement | Priority |
|---|---|---|
| WIN-01 | Single-window Electron app with `titleBarStyle: hiddenInset` | P0 |
| WIN-02 | Native macOS traffic lights at default inset position | P0 |
| WIN-03 | Custom top bar (44px) serves as draggable title bar region | P0 |
| WIN-04 | Remember window size and position between sessions | P1 |
| WIN-05 | Minimum window size: 800×500px | P0 |
| WIN-06 | If window width < 600px, auto-switch from split to markdown view | P1 |
| WIN-07 | Standard macOS menu bar: File, Edit, View, Help | P0 |
| WIN-08 | Drag-and-drop: `.md` files dragged onto window open as new tabs | P0 |

### 2.2 Top Bar

| ID | Requirement | Priority |
|---|---|---|
| TB-01 | Left zone: document filename only (e.g. `readme.md`) in Google Sans Flex Medium 14px | P0 |
| TB-02 | Untitled files display as `Untitled`, `Untitled 2`, `Untitled 3`... | P0 |
| TB-03 | Unsaved indicator: dot prefix before filename (e.g. `• readme.md`) | P0 |
| TB-04 | Center zone: three-segment pill toggle — Markdown / Split / Render | P0 |
| TB-05 | Toggle uses 150ms ease transition, filled active segment | P0 |
| TB-06 | Right zone: 19 formatting icons (Google Material Symbols Outlined) | P0 |
| TB-07 | Overflow: when window is narrow, 11 less common icons collapse behind `…` menu | P0 |
| TB-08 | 8 priority icons always visible: Bold, Italic, H1, H2, Bullet list, Number list, Code block, Link | P0 |
| TB-09 | Far right: word count (`W: N`) and letter count (`L: N`), live-updating | P0 |
| TB-10 | Formatting toolbar hidden in Render-only view | P0 |
| TB-11 | Keyboard shortcuts: ⌘1 (Markdown), ⌘2 (Split), ⌘3 (Render) | P0 |

### 2.3 Formatting Toolbar

| ID | Requirement | Priority |
|---|---|---|
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
| FT-20 | All toolbar actions: if text selected → wrap; if no selection → insert placeholder with inner text selected | P0 |

### 2.4 View Modes

#### 2.4.1 Markdown View
| ID | Requirement | Priority |
|---|---|---|
| VM-01 | Full-width CodeMirror 6 editor | P0 |
| VM-02 | Syntax-highlighted Markdown with custom color theme (light + dark) | P0 |
| VM-03 | Font: IBM Plex Mono, default 14px, configurable in settings | P0 |
| VM-04 | Burger icon (top-left of editor) toggles file sidebar | P0 |
| VM-05 | Copy icon (top-right of editor, left of AI icon) copies all raw Markdown | P0 |
| VM-06 | AI robot icon (top-right of editor, far right) toggles AI panel | P0 |
| VM-07 | Copy action shows brief "Copied!" feedback | P1 |

#### 2.4.2 Split View (Default on Launch)
| ID | Requirement | Priority |
|---|---|---|
| SV-01 | Left panel: Markdown editor. Right panel: rendered preview | P0 |
| SV-02 | Editor panel uses a darker background than the preview panel | P0 |
| SV-03 | Vertical divider line (1px) with centered pill handle (4×32px, radius 2px) | P0 |
| SV-04 | Divider default state: muted grey pill and line | P0 |
| SV-05 | Divider hover/drag state: pill and line turn blue | P0 |
| SV-06 | Divider is draggable to resize panels (min 20%, max 80%) | P0 |
| SV-07 | Double-click divider resets to 50/50 split | P1 |
| SV-08 | Default split ratio: 50/50 | P0 |
| SV-09 | Preview updates on content change, debounced 200ms | P0 |
| SV-10 | When AI panel opens, both editor and preview shrink equally | P0 |
| SV-11 | Scroll sync between editor and preview | P2 |

#### 2.4.3 Render View
| ID | Requirement | Priority |
|---|---|---|
| RV-01 | Full-width rendered Markdown preview | P0 |
| RV-02 | AI robot icon in top-right of preview panel toggles AI panel | P0 |
| RV-03 | Clickable links open in default browser | P0 |

### 2.5 Markdown Editor (CodeMirror 6)

| ID | Requirement | Priority |
|---|---|---|
| ED-01 | Built on CodeMirror 6 with `@codemirror/lang-markdown` and GFM | P0 |
| ED-02 | Custom syntax highlight theme with distinct colors per token type | P0 |
| ED-03 | Token coloring: headings, bold, italic, strikethrough, links, code, blockquotes, lists, HTML, YAML | P0 |
| ED-04 | Separate light and dark highlight themes | P0 |
| ED-05 | Standard keyboard shortcuts: ⌘B bold, ⌘I italic, ⌘E inline code | P0 |
| ED-06 | Find and replace: ⌘F opens CodeMirror's built-in search panel | P0 |
| ED-07 | Line numbers: off by default, configurable in settings | P1 |
| ED-08 | Word wrap: on by default, configurable in settings | P0 |
| ED-09 | Per-tab EditorState preservation (undo history, cursor, scroll) on tab switch | P0 |
| ED-10 | Read-only mode during AI editing (locked, no user input) | P0 |

### 2.6 Markdown Rendering

| ID | Requirement | Priority |
|---|---|---|
| RN-01 | Pipeline: unified + remark-parse + remark-gfm + remark-rehype + rehype-highlight + rehype-stringify | P0 |
| RN-02 | Output styled with `github-markdown-css` (GitHub 2.0) | P0 |
| RN-03 | Supported: tables, task lists, strikethrough, autolinks, fenced code blocks with syntax highlighting | P0 |
| RN-04 | No copy button on code blocks — keep preview clean | P0 |
| RN-05 | Clickable links open in default browser via shell.openExternal() | P0 |
| RN-06 | Footnotes | P1 |
| RN-07 | YAML frontmatter parsed but hidden in preview | P1 |
| RN-08 | Math rendering (KaTeX) | P2 |
| RN-09 | Mermaid diagrams | P2 |

### 2.7 File Sidebar (Tab System)

| ID | Requirement | Priority |
|---|---|---|
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

### 2.8 AI Chat Panel

| ID | Requirement | Priority |
|---|---|---|
| AI-01 | Toggled by robot icon (`robot` Material Symbol) or ⌘⇧A | P0 |
| AI-02 | Width: 360px, slides in from right | P0 |
| AI-03 | Available in **all three views** | P0 |
| AI-04 | In split view: pushes/shrinks both editor and preview equally | P0 |
| AI-05 | Header: robot icon + "AI Assistant" + model name + reset icon + close X | P0 |
| AI-06 | Chat is **per file** — switching files switches conversation | P0 |
| AI-07 | Reset icon clears conversation for current file | P0 |
| AI-08 | Chat messages: user right-aligned, AI left-aligned | P0 |
| AI-09 | AI responses render Markdown inline | P1 |
| AI-10 | Streaming: tokens display progressively | P0 |
| AI-11 | Input: expandable text field, Enter to send, Shift+Enter for newline | P0 |
| AI-12 | Loading state: typing indicator animation | P1 |
| AI-13 | Error state: inline error message with retry | P0 |
| AI-14 | If no API key configured: show message directing to Settings | P0 |

### 2.9 AI Document Editing

| ID | Requirement | Priority |
|---|---|---|
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

### 2.10 File Operations

| ID | Requirement | Priority |
|---|---|---|
| FO-01 | New file: ⌘N — creates new tab in sidebar, switches to it | P0 |
| FO-02 | Open file: ⌘O — native macOS dialog, filters .md, .markdown, .txt | P0 |
| FO-03 | Drag and drop: .md files dragged onto window open as new tabs | P0 |
| FO-04 | Save: ⌘S — saves to existing path, or triggers Save As if untitled | P0 |
| FO-05 | Save As: ⌘⇧S — native save dialog | P0 |
| FO-06 | **No auto-save** — manual save only | P0 |
| FO-07 | Find and replace: ⌘F — CodeMirror built-in | P0 |
| FO-08 | Files are plain .md on disk — no proprietary format | P0 |
| FO-09 | If a dropped/opened file is already in a tab, switch to that tab | P0 |

### 2.11 Session Persistence

| ID | Requirement | Priority |
|---|---|---|
| SP-01 | On quit: **silent** — no save prompts | P0 |
| SP-02 | On quit: all unsaved tab contents saved to `~/Library/Application Support/Marxist/drafts/` | P0 |
| SP-03 | On quit: session state saved (open tabs, active tab, split ratio, view, sidebar/AI panel state) | P0 |
| SP-04 | On launch: full session restored including unsaved drafts | P0 |
| SP-05 | On launch: if no previous session, show one "Untitled" tab in split view | P0 |
| SP-06 | Draft files cleared when user saves that file | P0 |

### 2.12 Settings

| ID | Requirement | Priority |
|---|---|---|
| ST-01 | Opened via ⌘, or settings icon | P0 |
| ST-02 | Centered modal (560px wide) | P0 |
| ST-03 | **Appearance:** theme toggle (System / Light / Dark) | P0 |
| ST-04 | **Appearance:** editor font size (default 14px) | P1 |
| ST-05 | **Appearance:** preview font size (default 16px) | P1 |
| ST-06 | **AI:** OpenRouter API key input (password field + visibility toggle) | P0 |
| ST-07 | **AI:** Verify button — tests key against OpenRouter API | P0 |
| ST-08 | **AI:** On verified key, **searchable dropdown** with full OpenRouter model list | P0 |
| ST-09 | **AI:** Selected model persists across sessions | P0 |
| ST-10 | **AI:** System prompt — **text area with sensible default pre-filled**, user can edit | P0 |
| ST-11 | **Editor:** line numbers toggle (default off) | P1 |
| ST-12 | **Editor:** word wrap toggle (default on) | P1 |
| ST-13 | **Editor:** spell check toggle (default on) | P2 |
| ST-14 | **About:** app version, icon, credits | P2 |
| ST-15 | Settings persisted via electron-store in `~/Library/Application Support/Marxist/` | P0 |

### 2.13 Theme / Dark Mode

| ID | Requirement | Priority |
|---|---|---|
| TH-01 | System / Light / Dark theme options | P0 |
| TH-02 | System mode follows macOS appearance preference | P0 |
| TH-03 | Toggle via Settings and ⌘⇧D | P0 |
| TH-04 | Both themes fully designed | P0 |
| TH-05 | In split view, editor side always darker than preview side | P0 |
| TH-06 | All colors defined as CSS custom properties | P1 |

---

## 3. Non-Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| NF-01 | Cold start to interactive: < 2 seconds | P0 |
| NF-02 | Keystroke to render update: < 300ms (debounce 200ms + render 100ms) | P0 |
| NF-03 | Handles documents up to 50,000 words without degradation | P1 |
| NF-04 | App bundle size: < 150MB | P1 |
| NF-05 | Fonts bundled locally — no external network requests for typography | P0 |
| NF-06 | AI API key stored encrypted at rest | P0 |
| NF-07 | AI API calls from main process only (never renderer) | P0 |
| NF-08 | macOS 12+ (Monterey and later) | P0 |
| NF-09 | Universal binary (Apple Silicon + Intel) | P1 |

---

## 4. Out of Scope (v1)

- Cross-platform support (Windows, Linux)
- Cloud sync or backup
- Collaborative editing
- Folder management / file tree
- Plugin system
- Export to PDF/HTML/DOCX
- Custom themes / user-created color schemes
- Vim / Emacs keybindings
- Inline AI autocomplete / suggestions-as-you-type
- Multiple windows
- File version history
- Image drag-and-drop into editor
- Copy button on rendered code blocks
- Auto-save

---

## 5. Resolved Decisions

All design and architecture decisions confirmed during concept development:

| # | Decision | Resolution |
|---|---|---|
| 1 | UI system font | Google Sans Flex (personal project, licensing OK) |
| 2 | AI panel in split view | Pushes/shrinks both panels equally |
| 3 | Auto-save | No — manual save only |
| 4 | Default view on launch | Split view |
| 5 | AI icon | `robot` (Google Material Symbols), not star |
| 6 | AI icon position | Top-right of editor panel in all views; top-right of preview in render view |
| 7 | Copy icon position | Top-right of editor panel, left of AI icon |
| 8 | File switching behavior | Tab-like — instant switch, no save prompts, unsaved state retained |
| 9 | First launch | Blank split view with one "Untitled" tab |
| 10 | AI panel access | Available in all three views |
| 11 | Unsaved files in memory | All unsaved files stay in memory; also written to temp/drafts for crash safety |
| 12 | Save dot style | Semi-transparent filled dot (60% opacity) |
| 13 | Quit behavior | Silent — drafts saved to temp folder, no prompts |
| 14 | Session restore | Full restore on relaunch including unsaved drafts |
| 15 | AI chat scope | Per file, with reset button in AI panel header |
| 16 | Link clicks in preview | Open in default browser |
| 17 | Untitled naming | Untitled, Untitled 2, Untitled 3... |
| 18 | Narrow window overflow | Less common icons collapse behind `…` menu |
| 19 | Code block copy button | No — keep preview clean |
| 20 | App personality | Professional and minimal |
| 21 | Formatting toolbar behavior | Wrap selection, or insert placeholder if nothing selected |
| 22 | AI can edit document | Yes — streams modified document in real-time |
| 23 | Editor during AI edit | Locked read-only |
| 24 | AI edit diff | Green (added) / red (removed) line highlights |
| 25 | Accept/Revert | Persistent banner at top of editor; user must choose before resuming |
| 26 | AI edit scope | Always full document |
| 27 | Drag and drop | .md files onto window open as new tabs |
| 28 | AI system prompt | Configurable text area in settings with sensible default |
| 29 | macOS menu bar | Standard: File, Edit, View, Help |
| 30 | Find and replace | Yes, ⌘F via CodeMirror built-in |
| 31 | OpenRouter model selector | Searchable dropdown with full model list |
| 32 | New file behavior | Creates new tab in sidebar, switches to it |
| 33 | Document name display | Filename only (e.g. `readme.md`) |
| 34 | AI relaunch behavior | Full session restore including drafts |

---

## 6. Development Phases (Suggested)

### Phase 1: Core Editor (Weeks 1–2)
- Electron shell with macOS chrome (hiddenInset, traffic lights, standard menus)
- CodeMirror 6 integration with Markdown language + find/replace
- Custom syntax highlight themes (light + dark)
- Three view modes with toggle, default to split
- Split view with draggable divider
- Basic file open/save/save-as

### Phase 2: Tab System & UI (Weeks 3–4)
- Multi-tab editor state management (Zustand)
- File sidebar with tab switching (instant, no prompts)
- New file (⌘N), drag-and-drop .md files
- Top bar layout: document name, view toggle, formatting toolbar with overflow
- 19 formatting icons with insert/wrap behavior
- Word and letter counts
- Dark/light theme system
- Typography (bundled Google Sans Flex + IBM Plex Mono)

### Phase 3: Session Persistence (Week 5)
- Draft temp folder system
- Silent quit with draft save
- Full session restore on launch
- Recent files list (max 20)

### Phase 4: AI Integration (Weeks 6–7)
- Settings panel: OpenRouter API key, verify, searchable model dropdown
- Configurable system prompt with default
- AI chat panel UI (per-file, reset, streaming)
- AI document editing: streaming replacement, read-only lock
- Diff computation and line highlighting (green/red)
- Accept/Revert banner
- Error handling (failed streams, rate limits, interrupted edits)

### Phase 5: Polish & Ship (Week 8)
- All keyboard shortcuts
- Overflow menu behavior
- Edge case handling (large files, corrupted drafts, external deletion)
- Performance testing
- App icon (generate .icns from PNG)
- electron-builder packaging → .dmg
- Testing on Apple Silicon and Intel
