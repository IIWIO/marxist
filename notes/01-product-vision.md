# Stage 1 — Product Vision & Overview

## App Identity

- **Name:** Marxist
- **Platform:** macOS (standalone Electron app)
- **Icon:** Black & white portrait-style dog in a suit with a beard (Karl Marx parody)
- **Tone:** Professional and minimal. The name is the personality — everything else is clean and serious.

## What It Is

Marxist is a focused, elegant Markdown editor for macOS. It is not trying to be Notion, Obsidian, or a second brain. It is a **writing tool** — designed for people who want to write and preview Markdown with zero friction, a beautiful UI, and optional AI assistance that can directly edit the document.

## Core Philosophy

1. **Simplicity first.** Three views, one purpose: write Markdown well.
2. **Beautiful defaults.** Dark/light mode, syntax-colored Markdown, GitHub-rendered output — looks great out of the box.
3. **AI as an editor, not just a chatbot.** The AI can read and rewrite the document in real-time — not just suggest, but act.
4. **No lock-in.** Files are just `.md` files on disk. No proprietary format. No database. No sync service.
5. **Manual save.** No auto-save. The user is in control. Unsaved drafts are preserved in a temp folder for crash safety and session restore.

## Target User

- This is a personal tool (built for the developer/author)
- Developers writing docs, READMEs, blog posts
- Technical writers who think in Markdown
- Anyone who wants a clean, fast Markdown editor on macOS without the bloat

## What It Is NOT

- Not a note-taking system (no folders, no graph view, no backlinks)
- Not a CMS or publishing tool
- Not a collaborative editor
- Not cross-platform (macOS only)

## Competitive Landscape

| App | Gap Marxist fills |
|---|---|
| Typora | No AI editing, less personality, paid |
| iA Writer | Minimal, no AI, no split view toggle |
| MacDown | Outdated UI, no AI |
| Obsidian | Way too much — Marxist is the anti-Obsidian |
| VS Code | Not a dedicated writing experience |

## Success Criteria for v1

- [ ] Feels native on macOS (traffic lights, standard menus, system chrome)
- [ ] Three-view toggle works flawlessly, defaults to split view on launch
- [ ] Markdown syntax highlighting is readable and attractive
- [ ] AI chat panel works with OpenRouter and can directly edit the document with diff highlighting
- [ ] File tab system with session restore (including unsaved drafts) works reliably
- [ ] Dark and light mode both look intentional
- [ ] Cold start to writing: under 2 seconds
