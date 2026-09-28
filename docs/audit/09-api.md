# API and contract design

### [HIGH] src/preload/index.ts:25 — IPC contracts are duplicated and already disagree

```typescript
export interface Settings {
  theme: 'system' | 'light' | 'dark'
  // ...
  recentFiles: Array<{ path: string; name: string; lastOpened: string }>
}
```

Settings, session data, and AI payloads are separately declared in the main process, preload, renderer store, and domain type files. The disagreement over `isApiKeyVerified` and the `onAppEvent` callback signature currently produces TypeScript errors, while preload implementations erase payloads back to `unknown`.

Fix: define one shared typed IPC channel map with request, response, and event payloads; derive main handlers, preload methods, and renderer globals from it.

### [HIGH] src/main/index.ts:834 — AI edit response handling can replace the document with malformed model output

```typescript
const replacements = JSON.parse(jsonStr) as Array<{ find: string; replace: string }>
// ...
documentContent = documentContent.split(find).join(replace)
// parse failure:
documentContent = fullResponse
```

The model contract is enforced only by prompt text and a type assertion. A parse failure treats arbitrary or partial output as the entire document, and successful operations replace every occurrence of `find` without checking uniqueness or reporting misses.

Fix: request schema-constrained output, validate it at runtime, require unique anchors or explicit ranges/hashes, and fail closed without changing the document.

### [MEDIUM] src/main/index.ts:637 — IPC result and error envelopes are inconsistent

```typescript
return { error: error.message || `HTTP ${response.status}` }
// elsewhere: { success: false, error }, { path: null, error }, or defaults
```

Callers must infer success from different field combinations, and settings handlers silently return defaults on failure. This inconsistency contributed to the quit path ignoring `{ success: false }` and makes exhaustive handling difficult.

Fix: use a shared discriminated result such as `{ ok: true, value } | { ok: false, error }` for every invoke channel and reserve events for progress only.

### [MEDIUM] src/main/index.ts:614 — AI requests have no context-budget policy

```typescript
const messages = [
  { role: 'system', content: params.systemPrompt },
  { role: 'system', content: `Current document:\n\n${params.documentContent}` },
  ...params.history,
  { role: 'user', content: params.message },
]
```

Every request sends the full document and unbounded conversation history even though model context lengths are fetched and stored. Long documents or conversations eventually exceed provider limits, producing avoidable failures and cost spikes.

Fix: track token estimates against the selected model's context, reserve output headroom, summarize/truncate history, and warn before a document cannot fit.
