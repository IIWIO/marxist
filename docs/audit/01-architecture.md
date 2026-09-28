# Architecture and system design

### [CRITICAL] src/hooks/useAIAgent.ts:43 — AI responses are applied to whichever tab is active

```typescript
const unsubEditChunk = window.electron.onAIEvent('ai:edit-chunk', (data: unknown) => {
  const { fullContent } = data as { fullContent: string }
  streamedContentRef.current = fullContent
  updateTabContent(activeTabId, fullContent)
})
```

The request's tab ID is never captured and incoming `streamId` values are ignored. Switching tabs during a request can write an edit into the newly active document, leave the source tab locked, or lose a chat response.

Fix: create a request record containing `{ streamId, tabId, mode }`, include it in every IPC event, and route updates by that immutable identity rather than `activeTabId`.

### [CRITICAL] src/components/Editor/DiffBanner.tsx:5 — Revert reads an empty snapshot from a different hook instance

```typescript
export default function DiffBanner() {
  const activeTab = useEditorStore((s) => s.getActiveTab())
  const { acceptEdit, revertEdit, cancelRequest } = useAIAgent()
```

`ChatInput` starts the edit through one `useAIAgent` instance, while `DiffBanner` creates another instance with its own empty `preEditContentRef`. The store already records `preEditSnapshot`, but the banner's revert action does not use it, so the advertised Revert button cannot restore the edited document.

Fix: own edit state and the pre-edit snapshot in one store/provider keyed by tab, and have both controls call actions against that shared state.

### [HIGH] src/hooks/useCodeMirror.ts:88 — One editor state is reused across every tab

```typescript
const setContent = useCallback((content: string): void => {
  if (!viewRef.current) return

  viewRef.current.dispatch({
    changes: { from: 0, to: viewRef.current.state.doc.length, insert: content },
  })
}, [])
```

Tab changes replace the entire document in a single CodeMirror instance. `TabState.editorState` is never populated with a real state and `restoreSnapshot` is never called, so cursor, scroll, selection, and per-tab undo history are not actually preserved; programmatic tab replacements also share the editor's history path.

Fix: swap complete `EditorState` instances per tab, or explicitly save and restore snapshots while marking tab-switch transactions with `Transaction.addToHistory.of(false)`.

### [HIGH] src/hooks/useAIAgent.ts:16 — Three AI controllers compete for the same event stream

```typescript
export function useAIAgent(): UseAIAgentReturn {
```

`useAIAgent` is mounted by `ChatInput` and `DiffBanner`, while `useAIChat` is mounted by `AIPanel` and `AIPanelHeader`; the older `useAIEdit` remains alongside them. Each mounted hook registers overlapping global IPC listeners and carries separate mutable refs, creating duplicate state transitions and making request ownership impossible to reason about.

Fix: replace the three hooks with one controller mounted once near `App`, expose stable actions through a context/store, and remove the legacy hooks.
