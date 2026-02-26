# Stage 2 — Core Features & Requirements

## The Three Views

Marxist has exactly three states. No more. These are the product's backbone.

### 1. Markdown View (Editor Only)
- Full-width code editor
- Syntax-highlighted Markdown (colored tokens — not monochrome)
- Font: **IBM Plex Mono**
- Burger menu (top-left of editor) toggles the file sidebar
- Copy icon (top-right of editor, left of AI icon) copies all raw Markdown to clipboard
- AI robot icon (top-right of editor, far right) toggles the AI chat panel

### 2. Split View (Editor + Preview) — DEFAULT ON LAUNCH
- Left panel: Markdown editor (darker background)
- Right panel: Live rendered preview (lighter background)
- Divider: a small vertical pill/handle shape centered on the dividing line
  - Default state: subtle, muted color
  - Hover/grab state: pill and divider line turn **blue**
  - Draggable to resize panels
- Scroll sync between panels (follow cursor position) — P2

### 3. Render View (Preview Only)
- Full-width rendered Markdown output
- Rendered using **GitHub Flavored Markdown 2.0** styling
- Clickable links open in default browser
- AI robot icon in top-right corner toggles the AI chat panel

## View Toggle

- Located: **top center of the top bar**
- Style: tab/pill toggle — similar to Claude's interface toggle
- Three segments: `Markdown` | `Split` | `Render`
- Active state: filled/highlighted segment
- Transition: smooth, no jarring reflow

---

## Top Bar Layout

The top bar is a single horizontal strip. Layout left to right:

```
[ 🔴 🟡 🟢 ]  Document Name  ·····  [ Markdown | Split | Render ]  ·····  [formatting icons →  … overflow]  ·····  W: 1,234  L: 7,891
```

### Left Zone
- **macOS traffic lights** (close, minimize, maximize) — native, not custom
- **Document name** — shows filename only (e.g. `readme.md`). Untitled files show `Untitled`, `Untitled 2`, `Untitled 3`, etc. Unsaved indicator (dot prefix) when dirty.

### Center Zone
- **View toggle** — the three-state tab switcher

### Right Zone
- **Markdown formatting toolbar** — 19 icons for common operations (see full list below)
- When window is narrow, less common icons collapse into an **overflow menu (…)**
- **Word count** — `W: 1,234` (live updating)
- **Letter count** — `L: 7,891` (live updating)
- All icons: **Google Material Symbols Outlined**

### Formatting Toolbar — Full Icon List

| # | Function | Behavior on click |
|---|---|---|
| 1 | **Bold** | Wraps selection in `**`, or inserts `**placeholder**` if no selection |
| 2 | **Italic** | Wraps selection in `_`, or inserts `_placeholder_` |
| 3 | **Underline** | Wraps selection in `<u></u>` tags |
| 4 | **Strikethrough** | Wraps selection in `~~` |
| 5 | **Indent** | Adds leading spaces/tab to selection or current line |
| 6 | **Outdent** | Removes leading spaces/tab from selection or current line |
| 7 | **H1** | Inserts/toggles `# ` at line start |
| 8 | **H2** | Inserts/toggles `## ` at line start |
| 9 | **H3** | Inserts/toggles `### ` at line start |
| 10 | **H4** | Inserts/toggles `#### ` at line start |
| 11 | **Bullet list** | Inserts `- ` at line start |
| 12 | **Number list** | Inserts `1. ` at line start (auto-increments) |
| 13 | **Checklist** | Inserts `- [ ] ` at line start |
| 14 | **Blockquote** | Inserts `> ` at line start |
| 15 | **Code block** | Inserts fenced code block ``` markers |
| 16 | **Link** | Wraps selection in `[]()` or inserts `[text](url)` placeholder |
| 17 | **Image** | Inserts `![alt](url)` placeholder |
| 18 | **Table** | Inserts a basic 3×3 Markdown table template |
| 19 | **Horizontal rule** | Inserts `---` on a new line |

### Overflow Behavior
When window width is narrow, icons collapse into an overflow menu (…) button. Priority icons that remain visible: Bold, Italic, H1, H2, Bullet list, Number list, Link, Code block. All others move into the overflow dropdown.

---

## File Sidebar (Tab System)

- Toggled by a **burger icon** (top-left of the editor panel)
- Shows the **last 20 opened files** as tabs
- Files behave like **tabs** — switching between them is instant, no save prompts
- Unsaved files retain their full state in memory (content, cursor position, dirty flag)
- Each entry shows:
  - File name (truncated if long)
  - Save status dot on the right side:
    - 🟢 Green semi-transparent filled dot (60% opacity) = saved
    - 🔴 Red semi-transparent filled dot (60% opacity) = unsaved changes
- Active file visually distinguished (subtle highlight or left border)
- New file (⌘N) creates a new tab in the sidebar and switches to it immediately
- Animation: slides in from left, pushes editor content

---

## Copy Raw Markdown

- Icon: **content_copy** (Google Material Symbols)
- Location: **top-right of the editor panel**, to the left of the AI robot icon
- Action: copies the entire raw Markdown content to clipboard
- Feedback: brief tooltip or icon flash — "Copied!"

---

## AI Chat Panel

- Toggled by a **robot icon** (`robot` — Google Material Symbols) in the top-right of the editor/preview panel
- Available in **all three views**
- Opens a **slide-in panel** from the right side
- In split view: **pushes/shrinks both the editor and preview panels equally**
- Panel contains:
  - Header: robot icon + "AI Assistant" + current model name (muted) + reset chat icon + close X
  - Chat message history (scrollable)
  - Text input at the bottom
- The AI has full context of the current document
- **The AI can directly edit the document** (see AI Editing section)
- Chat history is **per file** — switching files switches the conversation
- Reset chat icon clears the conversation for the current file
- Panel can be closed by clicking the robot icon again or the X

### AI Direct Editing

This is the core AI feature. The AI doesn't just suggest — it edits.

- When the user asks the AI to make changes (e.g., "fix my table", "remove all instances of Inc."), the AI streams the modified document in real-time
- **During streaming:** the editor is **locked read-only**
- **After streaming completes:** a **banner across the top of the editor panel** shows **Accept** and **Revert** buttons
- **Changed lines are highlighted:** green for added lines, red for removed lines (diff view)
- The user must click Accept or Revert before they can resume editing
- **Revert** restores the pre-edit snapshot completely
- **Accept** commits the changes and clears the diff highlighting
- The AI always operates on the **full document** (it figures out what to change)

---

## Dark Mode / Light Mode

- Respects macOS system preference by default
- Can be manually toggled in Settings or via ⌘⇧D
- Both modes must be **fully designed** — not an afterthought
- In split view:
  - The editor side is always the **darker side** relative to the preview
- Key principle: editor = darker, preview = lighter, always

---

## Typography

| Context | Font | Notes |
|---|---|---|
| App UI (menus, labels, buttons) | **Google Sans Flex** | Personal project — licensing not a concern |
| Markdown editor | **IBM Plex Mono** | Monospace, excellent readability, open source |
| Rendered preview | GitHub's font stack | Match GitHub rendering |

---

## Markdown Syntax Highlighting

- The raw Markdown must be **color-coded** for readability
- Token colors needed for: headings, bold, italic, strikethrough, links, code, blockquotes, lists, HTML tags, YAML frontmatter
- Colors should feel cohesive in both dark and light mode
- Separate light and dark highlight themes

---

## Markdown Rendering

- Must support **extended / GitHub Flavored Markdown (GFM)**:
  - Tables, task lists/checkboxes, strikethrough, autolinks
  - Syntax-highlighted code blocks (with language detection)
  - Footnotes (P1)
  - Math (KaTeX) — P2
  - Mermaid diagrams — P2
- Rendered output styled to match **GitHub's markdown CSS** (2.0 / modern version)
- **No copy button on code blocks** — keep preview clean
- **Clickable links** — open in default browser
- Must handle large documents without lag

---

## File Operations

- **Manual save only** — no auto-save
- **Save:** ⌘S — saves to existing path, or triggers Save As if untitled
- **Save As:** ⌘⇧S — native save dialog
- **New file:** ⌘N — creates new tab in sidebar, switches to it
- **Open file:** ⌘O — native macOS dialog, filters .md, .markdown, .txt
- **Drag and drop:** dragging a `.md` file onto the app window opens it
- **Find and replace:** ⌘F — uses CodeMirror's built-in find/replace
- **Session restore:** on quit, all open files (including unsaved drafts) are silently saved to a temp folder (`~/Library/Application Support/Marxist/drafts/`). On relaunch, the full session is restored.
- **Quit behavior:** silent — no save prompts. Drafts are preserved automatically.
- Files are plain `.md` on disk — no proprietary format

---

## macOS Menu Bar

Standard macOS menus: **File, Edit, View, Help**

- **File:** New, Open, Save, Save As, Close
- **Edit:** Undo, Redo, Cut, Copy, Paste, Select All, Find and Replace
- **View:** Markdown View, Split View, Render View, Toggle Sidebar, Toggle AI Panel, Toggle Theme
- **Help:** About Marxist
