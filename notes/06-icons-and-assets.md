# Stage 6 — Icon Reference & Asset Inventory

## Google Material Symbols — Setup

All icons use **Material Symbols Outlined** (variable icon set).

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=robot" />
```

Note: In production, bundle the icon font or use individual SVGs to avoid network dependency. For the `icon_names` parameter, include all icons used (or omit to load the full set).

---

## Top Bar — Formatting Toolbar (19 Icons)

All formatting icons insert Markdown syntax. If text is selected, it wraps the selection. If nothing is selected, it inserts a placeholder with the inner text selected.

| # | Function | Icon Name | Overflow? |
|---|---|---|---|
| 1 | **Bold** | `format_bold` | Always visible |
| 2 | **Italic** | `format_italic` | Always visible |
| 3 | **Underline** | `format_underline` | Overflow |
| 4 | **Strikethrough** | `strikethrough_s` | Overflow |
| 5 | **Indent** | `format_indent_increase` | Overflow |
| 6 | **Outdent** | `format_indent_decrease` | Overflow |
| 7 | **H1** | Text label: `H1` | Always visible |
| 8 | **H2** | Text label: `H2` | Always visible |
| 9 | **H3** | Text label: `H3` | Overflow |
| 10 | **H4** | Text label: `H4` | Overflow |
| 11 | **Bullet list** | `format_list_bulleted` | Always visible |
| 12 | **Number list** | `format_list_numbered` | Always visible |
| 13 | **Checklist** | `checklist` | Overflow |
| 14 | **Blockquote** | `format_quote` | Overflow |
| 15 | **Code block** | `code_blocks` or `data_object` | Always visible |
| 16 | **Link** | `link` | Always visible |
| 17 | **Image** | `image` | Overflow |
| 18 | **Table** | `table_chart` | Overflow |
| 19 | **Horizontal rule** | `horizontal_rule` | Overflow |

### Overflow Icon
| Function | Icon Name |
|---|---|
| Overflow menu | `more_horiz` (…) |

### Heading Icons Note
H1–H4 use **text labels** styled as small buttons (Google Sans Flex Bold, 11px, inside a 24×24 box matching icon dimensions). This is standard across most Markdown editors.

### Priority (Always Visible) Summary
Bold, Italic, H1, H2, Bullet list, Number list, Code block, Link = **8 priority icons**

### Overflow Summary
Underline, Strikethrough, Indent, Outdent, H3, H4, Checklist, Blockquote, Image, Table, Horizontal rule = **11 overflow icons**

---

## Editor Panel Icons

| Function | Icon Name | Position |
|---|---|---|
| Toggle file sidebar | `menu` (burger) | Top-left of editor panel |
| Copy raw Markdown | `content_copy` | Top-right of editor panel (left of AI icon) |
| Toggle AI panel | `robot` | Top-right of editor panel (far right) |

### In Render-Only View

| Function | Icon Name | Position |
|---|---|---|
| Toggle AI panel | `robot` | Top-right of preview panel |

---

## AI Chat Panel Icons

| Function | Icon Name | Position |
|---|---|---|
| AI panel label icon | `robot` | Header, far left |
| Reset chat | `refresh` or `restart_alt` | Header, left of close X |
| Close panel | `close` | Header, far right |
| Send message | `send` | Chat input, right side |

---

## AI Edit Banner Icons

| Function | Icon Name | Position |
|---|---|---|
| Accept changes | Text button: "Accept" | Banner, right side |
| Revert changes | Text button: "Revert" | Banner, right side (next to Accept) |

These are text buttons, not icon buttons — clearer for a critical action.

---

## Settings Modal Icons

| Function | Icon Name |
|---|---|
| Appearance section | `palette` |
| AI config section | `robot` |
| Editor settings section | `edit_note` |
| About section | `info` |
| API key visibility toggle | `visibility` / `visibility_off` |
| Verified checkmark | `check_circle` |
| Settings trigger (if using icon) | `settings` |

---

## macOS Menu Bar

Standard menus — no custom icons needed:

- **File:** New, Open, Save, Save As, Close Tab
- **Edit:** Undo, Redo, Cut, Copy, Paste, Select All, Find and Replace
- **View:** Markdown View, Split View, Render View, Toggle Sidebar, Toggle AI Panel, Toggle Dark Mode
- **Help:** About Marxist

---

## Font Assets

### Fonts to Bundle

| Font | Weights Needed | License |
|---|---|---|
| Google Sans Flex | Regular (400), Medium (500), Bold (700) | Proprietary (personal use OK) |
| IBM Plex Mono | Regular (400), Medium (500), Bold (700), Italic (400i) | SIL OFL (open source) ✅ |

Both fonts bundled locally in `/assets/fonts/` — no network requests for typography.

---

## App Icon

- Source: `marksist_icon.png` (uploaded)
- Assets to generate:
  - `icon.icns` — macOS app icon (multi-resolution bundle: 16, 32, 64, 128, 256, 512, 1024)
  - `icon.png` — 1024×1024 for electron-builder
  - Tray icon variant (16×16, 32×32) if needed later
- The icon is a black-and-white portrait of a dog in a suit with a Marx-like beard
- macOS will automatically apply rounded-rect masking
