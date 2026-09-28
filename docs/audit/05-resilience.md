# Error handling and resilience

### [CRITICAL] src/main/autoUpdater.ts:111 — Installing an update destroys unsaved renderer state

```typescript
app.removeAllListeners('before-quit')

if (mainWindow && !mainWindow.isDestroyed()) {
  mainWindow.destroy()
}

autoUpdater.quitAndInstall(true, true)
```

The update path explicitly removes the only quit-persistence hook and destroys the renderer without asking it to flush drafts. Up to 30 seconds of edits—and an entire new document before the first five-second draft—can be lost when the user chooses Install & Restart.

Fix: await the same verified snapshot transaction used for normal quit before removing listeners or destroying the window, and abort installation visibly if persistence fails.

### [CRITICAL] src/hooks/useQuitHandler.ts:31 — The app exits even when draft persistence reports failure

```typescript
try {
  await window.electron.app.saveBeforeQuit({ drafts, session })
} catch (error) {
  console.error('Failed to save before quit:', error)
}

window.electron.app.readyToQuit()
```

`saveBeforeQuit` returns `{ success: false }` for write failures, but the renderer ignores the result and always authorizes exit. `saveSessionState` also swallows its own exception, allowing the main handler to report success after a failed session write.

Fix: make persistence functions throw or return one checked result, keep the app open on failure, and offer Retry/Quit Without Saving with a clear warning.

### [HIGH] src/main/services/sessionService.ts:57 — Draft snapshots are destructive and non-atomic

```typescript
ensureDraftsDir()
clearAllDrafts()

for (const draft of drafts) {
  saveDraft(draft.tabId, draft.content, {
```

The last known-good recovery set is deleted before the new set is written, and each draft's content and metadata are separate writes. A crash, full disk, or permission error can leave no recoverable snapshot or a partial one.

Fix: write the complete snapshot to a temporary directory, fsync as appropriate, then atomically rename/swap it while retaining the previous generation.

### [HIGH] src/hooks/useAutoSave.ts:17 — Clean files are restored from stale snapshots instead of disk

```typescript
const drafts = Array.from(tabs.values()).map((tab) => ({
  tabId: tab.tabId,
  content: tab.content,
  filePath: tab.filePath,
  isDirty: tab.isDirty,
```

Autosave persists every open tab, including clean files, and restore uses that snapshot without checking the file's current contents or modification time. If another process edits the file while Marxist is closed, Marxist reopens stale content marked clean and can later overwrite the newer disk version.

Fix: persist recovery content only for dirty/untitled tabs; reopen clean tabs from disk and detect conflicts using mtime/content hashes.

### [HIGH] src/main/index.ts:660 — SSE parsing drops events split across network chunks

```typescript
const chunk = decoder.decode(value, { stream: true })
const lines = chunk.split('\n')

for (const line of lines) {
  if (line.startsWith('data: ')) {
    const data = line.slice(6)
```

Network chunks do not preserve SSE line boundaries. A JSON event split between reads fails parsing and is silently discarded; chat text becomes incomplete, while an edit response can become invalid and trigger destructive fallback behavior.

Fix: use a standards-compliant SSE parser or retain an incomplete-line buffer across reads, flush the decoder at EOF, and test arbitrary chunk boundaries.

### [HIGH] src/hooks/useAIAgent.ts:198 — Chat errors can leave the UI permanently loading

```typescript
const result = await window.electron.ai.chat({ ... })

if (result.error && result.error !== 'aborted') {
  setError(result.error)
  updateLastMessage(activeTabId, `Error: ${result.error}`)
}
```

The main chat handler does not emit `ai:stream-error`, and this returned-error branch never resets `isLoading` or `isStreaming`. HTTP failures and missing response bodies therefore leave the input disabled until restart or another unrelated transition.

Fix: settle loading state in one `finally` block and emit one terminal event for every success, failure, and cancellation path.

### [HIGH] src/components/Sidebar/FileListItem.tsx:15 — Closing a dirty tab discards its contents without confirmation

```typescript
const handleClose = (e: React.MouseEvent) => {
  e.stopPropagation()
  closeTab(tab.tabId)
}
```

The close action deletes the only in-memory tab immediately. The next autosave clears the recovery directory and writes only remaining tabs, so the dirty document becomes unrecoverable without any prompt or explicit discard action.

Fix: prompt Save/Discard/Cancel for dirty tabs, or keep closed dirty drafts in a recoverable closed-items store until explicitly discarded.

### [HIGH] src/hooks/useFileOperations.ts:19 — File open/save failures are invisible to the user

```typescript
} catch (error) {
  console.error('Failed to save file:', error)
  return false
}
```

Open, save, and save-as failures only reach the developer console, while native menu callbacks ignore the returned boolean. A user receives no path, reason, retry action, or confirmation that their document remains unsaved.

Fix: surface failures through an application notification/dialog with Retry and Save As actions, and cover permission/full-disk cases.

### [MEDIUM] src/main/index.ts:517 — OpenRouter calls have no automatic timeout

```typescript
const response = await fetch(`${OPENROUTER_API_URL}/auth/key`, {
  method: 'GET',
  headers: { Authorization: `Bearer ${apiKey}` },
})
```

Key verification and model listing have no abort signal at all; chat/edit have user cancellation but no deadline. A stalled connection can leave verification or generation pending indefinitely.

Fix: apply bounded timeouts with `AbortSignal.timeout` or a shared controller helper and map timeout errors to retryable UI messages.

### [MEDIUM] src/App.tsx:166 — No application error boundary exists

```typescript
return (
  <div className={`h-screen flex flex-col ${isDark ? 'dark' : ''}`}>
    <TopBar ... />
    <main className="flex-1 overflow-hidden">
```

An uncaught render/lifecycle error can blank the entire editor, including recovery and save controls. The test suite already demonstrates uncaught hook errors tearing down component trees.

Fix: add a top-level error boundary with a safe recovery screen, diagnostics copy action, and explicit reload that first attempts a draft flush.
