# Code quality and anti-patterns

### [HIGH] src/main/index.ts:327 — Main-process entry point is a 1,039-line god file

`registerIpcHandlers` alone spans 476 lines and combines file dialogs, disk writes, settings, OpenRouter transport, SSE parsing, edit application, session persistence, menus, window lifecycle, and update wiring. Its AI handlers have measured cyclomatic complexities of 18 and 28, making changes to one integration risky to unrelated application behavior.

Fix: split the file into typed `file`, `settings`, `session`, and `ai` IPC modules plus separate menu/window lifecycle modules; keep `index.ts` as composition only.

### [MEDIUM] src/stores/aiStore.ts:14 — Abandoned AI state and controller APIs remain live

```typescript
currentStreamContent: string
abortController: AbortController | null
appendStreamContent: (chunk: string) => void
setAbortController: (controller: AbortController | null) => void
cancelStream: () => void
```

No production caller sets the renderer `AbortController` or consumes `currentStreamContent`; cancellation is actually performed through main-process IPC. These leftovers coexist with two obsolete orchestration hooks and tests that still mock the old API, obscuring the supported path.

Fix: delete unused store fields/actions and `useAIEdit`, then make tests and components depend on the single replacement controller.

### [LOW] src/main/autoUpdater.ts:9 — Dead updater state and exports obscure lifecycle behavior

```typescript
let updateDownloaded = false
let downloadedUpdateInfo: UpdateInfo | null = null

export function installUpdateOnQuit(): void {
```

`downloadedUpdateInfo` is assigned but never read, and `isUpdateDownloaded`, `installUpdateOnQuit`, and `getAutoUpdater` have no callers. This is especially confusing because actual installation bypasses these helpers and force-destroys the window.

Fix: remove unused state/exports or make a single, tested update state machine use them.
