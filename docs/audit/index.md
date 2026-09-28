# Quality audit — Marxist

> This file is the pre-refactor audit snapshot. The audited findings have been remediated in the current working tree; see [remediation.md](remediation.md) for the resolution map and verification evidence.

Marxist is a single-window macOS Electron 32 desktop application written in TypeScript and React 18. The Electron main process owns native windows/menus, file I/O, draft/session persistence, OpenRouter HTTP/SSE calls, and self-update; a context-isolated preload exposes IPC to a React renderer using Zustand, CodeMirror 6, Tailwind, and unified/remark/rehype. There is no database or server component. Entry points are `src/main/index.ts`, `src/preload/index.ts`, `src/main.tsx`, and `src/App.tsx`; the main hotspots by size/change/coupling are `src/main/index.ts`, `src/stores/editorStore.ts`, `src/hooks/useAIAgent.ts`, `src/components/Editor/extensions/formatting.ts`, `src/main/services/sessionService.ts`, `src/App.tsx`, `src/hooks/useCodeMirror.ts`, and `src/utils/markdown.ts`.

Audited 2026-09-12 at `5a2cac1` (`v0.8.2`). The production bundle builds, but the current gates are red: Vitest 274/296 passing, Playwright 6/9 passing, TypeScript 7 errors, and ESLint 5 errors plus 2 warnings. Static sweeps found no import cycles and no duplicated blocks at the configured 30-line/80-token threshold.

## Findings

[CRITICAL] src/components/Editor/DiffBanner.tsx:5 — Revert reads an empty snapshot from a different hook instance → [01-architecture.md](01-architecture.md#critical-srccomponentseditordiffbannertsx5--revert-reads-an-empty-snapshot-from-a-different-hook-instance)

[CRITICAL] src/hooks/useAIAgent.ts:43 — AI responses are applied to whichever tab is active → [01-architecture.md](01-architecture.md#critical-srchooksuseaiagentts43--ai-responses-are-applied-to-whichever-tab-is-active)

[CRITICAL] src/hooks/useQuitHandler.ts:31 — The app exits even when draft persistence reports failure → [05-resilience.md](05-resilience.md#critical-srchooksusequithandlerts31--the-app-exits-even-when-draft-persistence-reports-failure)

[CRITICAL] src/main/autoUpdater.ts:111 — Installing an update destroys unsaved renderer state → [05-resilience.md](05-resilience.md#critical-srcmainautoupdaterts111--installing-an-update-destroys-unsaved-renderer-state)

[HIGH] .github/workflows:1 — No continuous-integration gate exists → [06-testing.md](06-testing.md#high-githubworkflows1--no-continuous-integration-gate-exists)

[HIGH] package.json:14 — All repository quality gates are red → [06-testing.md](06-testing.md#high-packagejson14--all-repository-quality-gates-are-red)

[HIGH] src/components/Editor/DiffBanner.tsx:44 — Advertised diff highlighting is not implemented → [03-completeness.md](03-completeness.md#high-srccomponentseditordiffbannertsx44--advertised-diff-highlighting-is-not-implemented)

[HIGH] src/components/Sidebar/FileListItem.tsx:15 — Closing a dirty tab discards its contents without confirmation → [05-resilience.md](05-resilience.md#high-srccomponentssidebarfilelistitemtsx15--closing-a-dirty-tab-discards-its-contents-without-confirmation)

[HIGH] src/hooks/useAIAgent.ts:16 — Three AI controllers compete for the same event stream → [01-architecture.md](01-architecture.md#high-srchooksuseaiagentts16--three-ai-controllers-compete-for-the-same-event-stream)

[HIGH] src/hooks/useAIAgent.ts:198 — Chat errors can leave the UI permanently loading → [05-resilience.md](05-resilience.md#high-srchooksuseaiagentts198--chat-errors-can-leave-the-ui-permanently-loading)

[HIGH] src/hooks/useAutoSave.ts:17 — Clean files are restored from stale snapshots instead of disk → [05-resilience.md](05-resilience.md#high-srchooksuseautosavets17--clean-files-are-restored-from-stale-snapshots-instead-of-disk)

[HIGH] src/hooks/useCodeMirror.ts:88 — One editor state is reused across every tab → [01-architecture.md](01-architecture.md#high-srchooksusecodemirrorts88--one-editor-state-is-reused-across-every-tab)

[HIGH] src/hooks/useFileOperations.ts:19 — File open/save failures are invisible to the user → [05-resilience.md](05-resilience.md#high-srchooksusefileoperationsts19--file-opensave-failures-are-invisible-to-the-user)

[HIGH] src/main/index.ts:327 — Main-process entry point is a 1,039-line god file → [02-code-quality.md](02-code-quality.md#high-srcmainindexts327--main-process-entry-point-is-a-1039-line-god-file)

[HIGH] src/main/index.ts:386 — Recent-files IPC is a hardcoded stub → [03-completeness.md](03-completeness.md#high-srcmainindexts386--recent-files-ipc-is-a-hardcoded-stub)

[HIGH] src/main/index.ts:660 — SSE parsing drops events split across network chunks → [05-resilience.md](05-resilience.md#high-srcmainindexts660--sse-parsing-drops-events-split-across-network-chunks)

[HIGH] src/main/index.ts:834 — AI edit response handling can replace the document with malformed model output → [09-api.md](09-api.md#high-srcmainindexts834--ai-edit-response-handling-can-replace-the-document-with-malformed-model-output)

[HIGH] src/main/services/sessionService.ts:46 — Autosave blocks the Electron main thread while rewriting every draft → [04-performance.md](04-performance.md#high-srcmainservicessessionservicets46--autosave-blocks-the-electron-main-thread-while-rewriting-every-draft)

[HIGH] src/main/services/sessionService.ts:57 — Draft snapshots are destructive and non-atomic → [05-resilience.md](05-resilience.md#high-srcmainservicessessionservicets57--draft-snapshots-are-destructive-and-non-atomic)

[HIGH] src/preload/index.ts:25 — IPC contracts are duplicated and already disagree → [09-api.md](09-api.md#high-srcpreloadindexts25--ipc-contracts-are-duplicated-and-already-disagree)

[HIGH] src/stores/viewStore.ts:26 — Responsive split-mode fallback can never run → [03-completeness.md](03-completeness.md#high-srcstoresviewstorets26--responsive-split-mode-fallback-can-never-run)

[HIGH] src/utils/markdown.ts:65 — “Optimized” large-document rendering still runs on the UI thread → [04-performance.md](04-performance.md#high-srcutilsmarkdownts65--optimized-large-document-rendering-still-runs-on-the-ui-thread)

[HIGH] tests/hooks/useAIEdit.test.ts:5 — Critical AI and persistence tests do not execute their subjects → [06-testing.md](06-testing.md#high-testshooksuseaiedittestts5--critical-ai-and-persistence-tests-do-not-execute-their-subjects)

[MEDIUM] package.json:72 — Core runtime and tooling are several major generations behind → [08-config-deps.md](08-config-deps.md#medium-packagejson72--core-runtime-and-tooling-are-several-major-generations-behind)

[MEDIUM] src/App.tsx:124 — Find menu command only focuses the editor → [03-completeness.md](03-completeness.md#medium-srcapptsx124--find-menu-command-only-focuses-the-editor)

[MEDIUM] src/App.tsx:166 — No application error boundary exists → [05-resilience.md](05-resilience.md#medium-srcapptsx166--no-application-error-boundary-exists)

[MEDIUM] src/components/Settings/sections/EditorSection.tsx:26 — Spell-check toggle has no effect → [03-completeness.md](03-completeness.md#medium-srccomponentssettingssectionseditorsectiontsx26--spell-check-toggle-has-no-effect)

[MEDIUM] src/hooks/useSessionRestore.ts:67 — Saved panel state is ignored during restore → [03-completeness.md](03-completeness.md#medium-srchooksusesessionrestorets67--saved-panel-state-is-ignored-during-restore)

[MEDIUM] src/main/autoUpdater.ts:4 — Production diagnostics exist only as ad-hoc console output → [07-observability.md](07-observability.md#medium-srcmainautoupdaterts4--production-diagnostics-exist-only-as-ad-hoc-console-output)

[MEDIUM] src/main/index.ts:517 — OpenRouter calls have no automatic timeout → [05-resilience.md](05-resilience.md#medium-srcmainindexts517--openrouter-calls-have-no-automatic-timeout)

[MEDIUM] src/main/index.ts:614 — AI requests have no context-budget policy → [09-api.md](09-api.md#medium-srcmainindexts614--ai-requests-have-no-context-budget-policy)

[MEDIUM] src/main/index.ts:637 — IPC result and error envelopes are inconsistent → [09-api.md](09-api.md#medium-srcmainindexts637--ipc-result-and-error-envelopes-are-inconsistent)

[MEDIUM] src/main/index.ts:733 — User-configured system prompt is ignored for edits → [03-completeness.md](03-completeness.md#medium-srcmainindexts733--user-configured-system-prompt-is-ignored-for-edits)

[MEDIUM] src/main/index.ts:784 — AI document edits are buffered, not streamed → [03-completeness.md](03-completeness.md#medium-srcmainindexts784--ai-document-edits-are-buffered-not-streamed)

[MEDIUM] src/stores/aiStore.ts:14 — Abandoned AI state and controller APIs remain live → [02-code-quality.md](02-code-quality.md#medium-srcstoresaistorets14--abandoned-ai-state-and-controller-apis-remain-live)

[MEDIUM] src/stores/editorStore.ts:267 — Every keystroke rescans the whole document twice → [04-performance.md](04-performance.md#medium-srcstoreseditorstorets267--every-keystroke-rescans-the-whole-document-twice)

[MEDIUM] src/utils/diff.ts:36 — Line diff allocates quadratic memory → [04-performance.md](04-performance.md#medium-srcutilsdiffts36--line-diff-allocates-quadratic-memory)

[MEDIUM] tests/e2e/launch.spec.ts:5 — Electron tests leak processes and share user state after failure → [06-testing.md](06-testing.md#medium-testse2elaunchspects5--electron-tests-leak-processes-and-share-user-state-after-failure)

[MEDIUM] tests/setup.ts:5 — Shared Electron mock has drifted from the preload contract → [06-testing.md](06-testing.md#medium-testssetupts5--shared-electron-mock-has-drifted-from-the-preload-contract)

[MEDIUM] vitest.config.ts:12 — Coverage has no enforceable floor → [06-testing.md](06-testing.md#medium-vitestconfigts12--coverage-has-no-enforceable-floor)

[LOW] notes/04-technical-architecture.md:40 — Architecture documentation describes files and behavior that do not exist → [08-config-deps.md](08-config-deps.md#low-notes04-technical-architecturemd40--architecture-documentation-describes-files-and-behavior-that-do-not-exist)

[LOW] package.json:28 — Manifest carries unused direct dependencies → [08-config-deps.md](08-config-deps.md#low-packagejson28--manifest-carries-unused-direct-dependencies)

[LOW] src/main/autoUpdater.ts:9 — Dead updater state and exports obscure lifecycle behavior → [02-code-quality.md](02-code-quality.md#low-srcmainautoupdaterts9--dead-updater-state-and-exports-obscure-lifecycle-behavior)

[LOW] src/main/index.ts:315 — Help → About sends an event nobody handles → [03-completeness.md](03-completeness.md#low-srcmainindexts315--help--about-sends-an-event-nobody-handles)

[SECURITY] src/main/index.ts:488 — `settings:get` returns the plaintext OpenRouter API key to the renderer and storage has no encryption configuration; defer to a dedicated security audit.
