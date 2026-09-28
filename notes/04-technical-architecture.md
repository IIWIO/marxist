# Technical Architecture

This document describes the shipping architecture. The numbered files in `build_plans/` are historical implementation plans and are not an API or source-tree reference.

## Runtime

| Layer | Implementation |
|---|---|
| Desktop shell | Electron 44 |
| Renderer | React 19, Zustand 5, Tailwind CSS |
| Editor | CodeMirror 6 |
| Markdown | unified/remark/rehype in a Web Worker |
| AI | OpenRouter, called only by the Electron main process |
| Build and package | electron-vite 5, Vite 7, electron-builder 26 |

The application has one native window and three trust boundaries:

1. `src/main/` owns native lifecycle, files, recovery, settings, updates, logs, and network calls.
2. `src/preload/index.ts` exposes a narrow, context-isolated API. Every request returns the shared `IpcResult<T>` envelope from `src/types/ipc.ts`.
3. The React renderer owns presentation and in-memory editing state. It has no Node integration and never receives the stored OpenRouter key.

## Current source map

```text
src/
├── main/
│   ├── index.ts                 lifecycle composition and safe-quit handshake
│   ├── window.ts                BrowserWindow creation and geometry
│   ├── menu.ts                  native application menu
│   ├── autoUpdater.ts           update checks and install coordination
│   ├── ipc/                     file, settings, session, and AI handlers
│   └── services/                logging, settings, OpenRouter, recovery
├── preload/index.ts             typed context bridge
├── components/                  React UI
├── hooks/                       editor, files, persistence, AI orchestration
├── stores/                      editor, view, settings, files, and AI state
├── utils/                       bounded diff, recovery payloads, worker client
├── workers/markdown.worker.ts   Markdown parser execution
└── types/ipc.ts                 canonical cross-process contract
```

## Documents and editor state

`editorStore` is the source of truth for open tabs. Each tab owns its content, saved-content baseline, dirty flag, CodeMirror `EditorState`, cursor, scroll position, AI rollback snapshot, and current diff. A single CodeMirror view swaps these states as tabs change, preserving independent undo histories.

Word and letter counts are refreshed by a debounced single-pass counter rather than scanning the document on every store update. Markdown rendering is also debounced, but parsing and syntax highlighting always run in `markdown.worker.ts`; stale worker responses are ignored.

## Persistence and quitting

Recovery is generation-based and atomic. A snapshot contains session metadata plus only dirty or untitled document bodies. It is written to a temporary directory, the previous generation is retained as fallback, and the new directory is renamed into place only after all writes succeed. Clean file-backed tabs are re-read from disk during restore.

Window close, application quit, and update installation use the same renderer handshake. The app exits only after recovery succeeds or the user explicitly chooses **Quit Without Saving** following an error. Retry and cancel remain available; there is no forced timeout that destroys the window.

## AI operations

One `AIAgentProvider` owns AI request state for the entire renderer. Every request records an immutable stream ID, tab ID, mode, and original content so late events cannot affect another tab.

Chat responses stream over SSE. The main process retains incomplete SSE frames between network chunks, applies request timeouts and context limits, and always emits a terminal success or error event.

Document edits are intentionally atomic rather than progressively written into the editor. OpenRouter must return a schema-constrained list of unique anchored replacements. The main process validates and applies those replacements to the original document; malformed, ambiguous, or unanchored output fails closed. Only a fully validated result reaches the renderer, where a bounded line diff is shown and the user can accept or restore the per-tab snapshot.

## Settings and credentials

Non-secret settings and the recent-file list are stored with `electron-store`. The OpenRouter key is encrypted with Electron `safeStorage`; legacy plaintext values are migrated on first read. `settings:get` returns only public settings and a `hasApiKey` flag. If OS-backed encryption is unavailable, persistent key storage is rejected.

## Diagnostics and quality gates

The main process writes redacted JSONL diagnostics under Electron's `userData/logs` directory with simple size rotation. The About/error UI can copy recent diagnostics for support.

`npm run verify` runs TypeScript, ESLint, coverage-enforced unit/component tests, and the production build. CI runs that gate on Linux and an isolated Electron smoke suite on macOS. Each end-to-end test receives a temporary `userData` directory and forcibly reaps its Electron process during teardown.
