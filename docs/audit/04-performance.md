# Performance and bottlenecks

### [HIGH] src/main/services/sessionService.ts:46 — Autosave blocks the Electron main thread while rewriting every draft

```typescript
clearAllDrafts()

for (const draft of drafts) {
  saveDraft(draft.tabId, draft.content, {
```

Every periodic save removes the directory and synchronously rewrites two files for every open tab. With large documents this blocks native menus and IPC on the main process every 30 seconds, directly conflicting with the 50,000-word performance target.

Fix: use asynchronous writes, persist only dirty/changed tabs, and move atomic snapshot assembly away from latency-sensitive main-process handlers.

### [HIGH] src/utils/markdown.ts:65 — “Optimized” large-document rendering still runs on the UI thread

```typescript
return unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(rehypeHighlight, { ignoreMissing: true, detect: true })
```

Returning a Promise does not move unified parsing, sanitization, KaTeX, or highlight auto-detection off the renderer thread. The production build also emits a roughly 2.7MB renderer chunk plus many language chunks, and no benchmark verifies the stated 50,000-word target.

Fix: benchmark representative large documents, disable automatic language detection by default, import a bounded language set, and move expensive parsing to a worker when the threshold is crossed.

### [MEDIUM] src/stores/editorStore.ts:267 — Every keystroke rescans the whole document twice

```typescript
if (tabId === activeTabId) {
  updates.wordCount = calculateWordCount(content)
  updates.letterCount = calculateLetterCount(content)
}
```

Word and letter counts perform separate full-string scans synchronously for every CodeMirror change. This adds linear work to the hottest input path and will be noticeable on the large documents the specification claims to support.

Fix: debounce counts independently from editor state, compute both in one pass, or update counts incrementally from CodeMirror transactions.

### [MEDIUM] src/utils/diff.ts:36 — Line diff allocates quadratic memory

```typescript
const dp: number[][] = Array(m + 1)
  .fill(null)
  .map(() => Array(n + 1).fill(0))
```

The LCS matrix is `O(lines²)` in both time and memory for similar-size inputs. It is currently stranded behind the unused hook, but reconnecting it for advertised diff highlighting can freeze or exhaust memory on large documents.

Fix: use a Myers/patience diff implementation with bounded memory and enforce a size limit with a coarse fallback.
