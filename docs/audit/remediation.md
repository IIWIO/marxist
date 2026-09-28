# Audit remediation record

Status: **all 44 audit findings and the separately flagged credential-security issue are addressed in the current working tree.** This record maps the original observations to the implemented behavior. The original audit remains an immutable baseline in `index.md` and the numbered reports.

## Critical findings

| Finding | Resolution |
|---|---|
| Revert read another hook's empty snapshot | The snapshot is per-tab editor state and the single AI provider owns accept/revert. |
| AI responses targeted the active tab | Every request captures immutable stream and tab IDs; unrelated or late events are ignored. |
| Quit continued after persistence failure | Quit retries, cancels, or requires explicit **Quit Without Saving**; success is acknowledged before exit. |
| Update install destroyed renderer state | Updates use the same recovery handshake and install only after successful or explicitly discarded recovery. |

## High findings

| Area | Resolution |
|---|---|
| CI and red repository gates | Added Ubuntu quality/build and macOS Electron jobs; `check`, `verify`, and packaging scripts enforce the gates. |
| Diff highlighting | Added green inserted-line decorations and red inline removed-line widgets, plus counts and accept/revert controls. |
| Dirty-tab close | Added native Save / Cancel / Discard confirmation, including close-all behavior. |
| Competing AI controllers | Replaced three controllers with one `AIAgentProvider`; removed obsolete hooks and state. |
| AI loading could stick | Every success, service error, transport rejection, and cancellation settles the exact request. |
| Stale clean-file recovery | Recovery stores only dirty/untitled bodies; clean tabs reload current disk content. |
| Shared editor state | Tabs save and restore independent CodeMirror state, undo history, selection, and scroll position. |
| Invisible file failures | Open/save/drop failures return typed errors and display native error dialogs. |
| Main-process god file | Split lifecycle, windows, menus, IPC domains, and services into focused modules; the entry point is 135 lines. |
| Recent-files stub | Recent files are persisted and rendered in the sidebar; stale entries can be removed and history cleared. |
| Split SSE frames | The streaming parser carries incomplete lines between chunks and has split-frame regression coverage. |
| Unsafe AI edit fallback | Edits require schema-constrained unique anchored replacements and fail closed on malformed/ambiguous output. |
| Synchronous/destructive draft writes | Recovery is asynchronous, generation-based, and atomically renamed with a previous-generation fallback. |
| IPC contract drift | Main, preload, renderer, and tests share `src/types/ipc.ts` and a single `IpcResult<T>` envelope. |
| Responsive split fallback | Layout now derives available content width from actual panel state and restores split view when space returns. |
| Markdown work on UI thread | Parsing/highlighting runs through a Web Worker; the parser is split out of the initial renderer chunk. |
| Tests did not execute subjects | AI, autosave, quit, SSE/edit validation, and atomic recovery tests now exercise production code. |

## Medium findings

| Area | Resolution |
|---|---|
| Dependency/tooling generations | Migrated to Electron 44, electron-vite 5, Vite 7, Vitest 5, React 19, Zustand 5, modern ESLint/TypeScript tooling, and a flat ESLint config. |
| Find command | The native Find command opens CodeMirror's search/replace panel. |
| Missing error boundary | Added an application boundary with recovery-save/reload and copy-diagnostics actions. |
| Inert spell-check setting | The setting now reconfigures CodeMirror's editable content attributes. |
| Ignored session panels | Sidebar and AI panel state are restored with the session. |
| Ad-hoc production diagnostics | Main-process lifecycle, updater, I/O, and AI errors use redacted rotating JSONL logs with a copy action. |
| Missing OpenRouter timeout | Metadata and generation calls have explicit abortable timeouts. |
| Missing context policy | Requests estimate context use, reserve output headroom, trim oldest chat turns, and reject oversized fixed context. |
| Inconsistent error envelopes | All invoke-style IPC APIs use the shared discriminated result envelope and stable error codes. |
| Ignored edit system prompt | Edit requests include the user-configured system prompt. |
| Buffered edit claim | The product contract now intentionally specifies safe atomic edits; docs and UI no longer claim progressive document mutation. |
| Abandoned AI APIs | Removed unused controllers, abort state, and obsolete selectors. |
| Per-keystroke count scans | Counts use one pass after a short debounce. |
| Quadratic diff memory | Diff uses bounded Myers tracing with an explicit linear coarse fallback for large/high-distance inputs. |
| E2E state/process leakage | Each test uses a unique user-data directory and guaranteed process termination/cleanup. |
| Test preload drift | The shared mock is compile-checked with `satisfies ElectronAPI`. |
| No coverage floor | Coverage targets critical stores/hooks/services/utilities and enforces statements, branches, functions, and lines thresholds. |

## Low findings and security flag

| Finding | Resolution |
|---|---|
| Stale architecture documentation | Replaced it with the current process boundaries/source map and marked build plans historical. |
| Unused direct dependencies | Removed redundant runtime/test packages and verified the clean graph; `npm audit` reports zero known vulnerabilities. |
| Dead updater state/exports | Reduced the updater to the live check, notification, and coordinated-install paths. |
| Inert About action | Uses the native About role; the About settings view also exposes version and diagnostics. |
| Plaintext OpenRouter key in renderer/storage | The key is encrypted via Electron `safeStorage`, legacy plaintext is migrated, public settings expose only `hasApiKey`, runtime setting keys are validated, and the BrowserWindow sandbox is enabled. |

## Verification

- `npm run check`: typecheck, zero-warning lint, 293 unit/component/hook tests, and enforced coverage.
- `npm run build`: production main, preload, renderer, and Markdown worker bundles.
- `npm run test:e2e`: 9 isolated macOS Electron smoke/interaction tests.
- `electron-builder --mac --dir --arm64`: packaged app built and launched successfully (14 MB application archive before the Electron runtime).
- `npm audit --audit-level=low`: zero known vulnerabilities.
