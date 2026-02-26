# Stage 3 — UI/UX Design Specifications

## Window Chrome

- **Framework behavior:** Electron with `titleBarStyle: 'hiddenInset'` on macOS
- Traffic lights (close/minimize/maximize) are native macOS — positioned at default inset
- The top bar is a **custom-rendered** area that acts as the title bar (draggable region)
- Standard macOS menu bar: File, Edit, View, Help

## Top Bar Dimensions & Spacing

```
Height: 44px
Padding-left: 80px (clear of traffic lights)
Padding-right: 16px

Layout: flexbox, space-between with three zones
```

### Left Zone (document identity)
- Document name in **Google Sans Flex Medium, 14px**
- Shows filename only (e.g. `readme.md`)
- Untitled files: `Untitled`, `Untitled 2`, `Untitled 3`...
- Unsaved indicator: dot prefix before the name (e.g. `• readme.md`)
- Truncate with ellipsis if longer than ~200px

### Center Zone (view toggle)
- Pill-shaped segmented control
- Three segments: `Markdown` · `Split` · `Render`
- Dimensions: ~240px wide, 28px tall, border-radius 14px
- Active segment: filled background, white text
- Inactive segments: transparent background, muted text
- Transition: 150ms ease background slide (like Claude's toggle)
- Font: Google Sans Flex Medium, 12px
- **Default on launch: Split**

### Right Zone (tools + counts)
- 19 formatting icons: 20px icons, 8px gap between each
- Icons grouped logically with 16px gaps between groups:
  - Group 1: Bold, Italic, Underline, Strikethrough
  - Group 2: Indent, Outdent
  - Group 3: H1, H2, H3, H4
  - Group 4: Bullet list, Number list, Checklist
  - Group 5: Blockquote, Code block
  - Group 6: Link, Image, Table, Horizontal rule
- **Overflow behavior:** when window is narrow, less common icons collapse behind a `…` overflow menu button
- Priority icons (always visible): Bold, Italic, H1, H2, Bullet list, Number list, Link, Code block
- Overflow icons: Underline, Strikethrough, Indent, Outdent, H3, H4, Checklist, Blockquote, Image, Table, Horizontal rule
- Divider: 1px vertical line, 16px tall, before word/letter counts
- Word count: `W: 1,234` — Google Sans Flex, 12px, muted color
- Letter count: `L: 7,891` — Google Sans Flex, 12px, muted color
- Formatting toolbar hidden in Render-only view

---

## Color System

### Light Mode

| Element | Color | Notes |
|---|---|---|
| Top bar background | `#FFFFFF` | Clean white |
| Top bar border-bottom | `#E5E5E5` | Subtle separator |
| Editor background | `#F5F5F0` | Warm off-white, slightly darker |
| Preview background | `#FFFFFF` | Pure white |
| Sidebar background | `#EBEBEB` | Distinguishable from editor |
| Text primary | `#1A1A1A` | Near-black |
| Text secondary | `#6B6B6B` | Muted |
| Accent / active | `#2962FF` | Blue — used for toggle, divider hover |
| Saved dot | `#4CAF50` at 60% opacity | Green, semi-transparent filled |
| Unsaved dot | `#F44336` at 60% opacity | Red, semi-transparent filled |
| AI diff: added line | `#E8F5E9` background | Subtle green highlight |
| AI diff: removed line | `#FFEBEE` background | Subtle red highlight |

### Dark Mode

| Element | Color | Notes |
|---|---|---|
| Top bar background | `#1E1E1E` | Dark grey |
| Top bar border-bottom | `#333333` | Subtle separator |
| Editor background | `#141414` | Deepest dark — "the darker side" |
| Preview background | `#1E1E1E` | Slightly lighter than editor |
| Sidebar background | `#181818` | Between editor and top bar |
| Text primary | `#E0E0E0` | Soft white |
| Text secondary | `#888888` | Muted |
| Accent / active | `#448AFF` | Brighter blue for dark backgrounds |
| Saved dot | `#66BB6A` at 50% opacity | Semi-transparent filled |
| Unsaved dot | `#EF5350` at 50% opacity | Semi-transparent filled |
| AI diff: added line | `#1B5E20` at 30% opacity | Subtle green highlight |
| AI diff: removed line | `#B71C1C` at 30% opacity | Subtle red highlight |

---

## Editor Panel — Top-Left & Top-Right Icons

The editor panel has persistent icons overlaid in its corners:

### Top-Left
- **Burger icon** (`menu`) — toggles the file sidebar

### Top-Right
- **Copy icon** (`content_copy`) — copies all raw Markdown to clipboard
- **AI robot icon** (`robot`) — toggles the AI chat panel

These icons are present in **all views** that show the editor. In render-only view, the robot icon appears in the top-right of the preview panel.

---

## Split View Divider

### Visual Design
- Thin vertical line (1px) running the full height of the content area
- Centered pill-shaped handle: 4px wide × 32px tall, border-radius 2px
- Default color: `#CCCCCC` (light mode) / `#444444` (dark mode)

### Interaction States
| State | Pill color | Line color | Cursor |
|---|---|---|---|
| Default | Muted grey | `#E0E0E0` / `#333` | Default |
| Hover | `#2962FF` / `#448AFF` | Same blue | `col-resize` |
| Dragging | `#2962FF` / `#448AFF` | Same blue | `col-resize` |

### Behavior
- Dragging resizes the two panels
- Minimum panel width: 280px (prevents collapsing)
- Double-click on divider: reset to 50/50
- Default split ratio: 50/50
- When AI panel opens: **both panels shrink equally** to make room

---

## File Sidebar

### Dimensions
- Width: 240px (fixed)
- Slides in from the left edge of the editor panel
- Pushes editor content to the right (does not overlay)

### Visual
- Header: "Recent Files" in Google Sans Flex Medium, 13px, with close X
- List items: 36px tall each
  - File name: Google Sans Flex, 13px, truncated with ellipsis
  - Save dot: 6px diameter circle, right-aligned, vertically centered, semi-transparent filled
  - Hover state: subtle background highlight
  - Active file: slightly bolder text or left border accent

### Tab Behavior
- Files act like tabs — switching is instant, no save prompts
- Unsaved files retain their full state in memory (content, cursor, dirty flag)
- Unsaved content also written to `~/Library/Application Support/Marxist/drafts/` as a crash safety net
- New file (⌘N) creates a new tab and switches to it

### Animation
- Slide in: 200ms ease-out
- Slide out: 150ms ease-in
- Editor content reflows smoothly

---

## AI Chat Panel

### Dimensions
- Width: 360px (fixed)
- Slides in from the right edge of the window
- **Pushes/shrinks both editor and preview panels equally** (in split view)
- In markdown-only or render-only view: pushes that single panel

### Header Layout
```
[ 🤖 AI Assistant  ·  claude-sonnet-4  ·  🔄 Reset  ·  ✕ Close ]
```
- Robot icon + "AI Assistant" label
- Current model name (small, muted)
- Reset chat icon (clears conversation for current file)
- Close X

### Chat Area
- Scrollable message history
- User messages: right-aligned bubbles
- AI messages: left-aligned bubbles
- AI responses can contain rendered Markdown

### Input Area
- Expandable text field at the bottom
- Send button (or Enter to send, Shift+Enter for newline)
- Loading state: typing indicator animation

### Per-File Chat
- Each file has its own conversation history
- Switching files switches the conversation
- Reset icon clears conversation for the current file only

### AI Edit Mode (Active During Streaming)
When the AI is editing the document:
1. Editor becomes **read-only** (locked)
2. Changes stream in real-time
3. After streaming completes: **banner across top of editor** with Accept / Revert buttons
4. Changed lines are highlighted: **green for added, red for removed**
5. User must click Accept or Revert to proceed
6. Accept: commits changes, clears diff highlights, unlocks editor
7. Revert: restores pre-edit snapshot, clears diff highlights, unlocks editor

---

## AI Edit Banner

- Position: top of editor panel, full width
- Height: ~40px
- Background: accent color or neutral with border
- Content: "AI made changes to your document" + **Accept** button (primary) + **Revert** button (secondary/destructive)
- Persistent until user acts — does not auto-dismiss
- Diff highlights visible in the editor below the banner

---

## Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| Toggle Markdown view | `⌘ 1` |
| Toggle Split view | `⌘ 2` |
| Toggle Render view | `⌘ 3` |
| Toggle file sidebar | `⌘ \` |
| Toggle AI panel | `⌘ ⇧ A` |
| Copy raw Markdown | `⌘ ⇧ C` |
| New file | `⌘ N` |
| Open file | `⌘ O` |
| Save | `⌘ S` |
| Save As | `⌘ ⇧ S` |
| Find and Replace | `⌘ F` |
| Bold | `⌘ B` |
| Italic | `⌘ I` |
| Inline code | `⌘ E` |
| Toggle dark/light | `⌘ ⇧ D` |
| Settings | `⌘ ,` |

---

## Settings Panel

- Opened via `⌘ ,` or gear icon
- Centered modal (560px wide)

### Sections

**1. Appearance**
- Theme: System / Light / Dark (radio or dropdown)
- Editor font size: slider or input (default 14px)
- Preview font size: slider or input (default 16px)

**2. AI Configuration**
- OpenRouter API Key: password input field with show/hide toggle
- "Verify" button — tests key against OpenRouter API
- Once verified: **searchable dropdown** of all available models from the full OpenRouter list
- Selected model persists across sessions
- System prompt: **text area with a sensible default pre-filled** — user can edit freely

**3. Editor**
- Line numbers: on/off (default off)
- Word wrap: on/off (default on)
- Spell check: on/off (default on) — P2

**4. About**
- App version
- Icon display (the Marx dog)
- Credits / links
