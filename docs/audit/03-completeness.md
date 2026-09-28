# Completeness and stubs

### [HIGH] src/components/Editor/DiffBanner.tsx:44 — Advertised diff highlighting is not implemented

```typescript
return (
  <div className="... bg-amber-50 ...">
    <span>Karl made changes to your document</span>
```

The active `useAIAgent` path only toggles `showDiff`; it never computes a diff or installs CodeMirror decorations. `computeDiff` is called only by the unused `useAIEdit` hook, so users receive a banner and a locked editor but no added/removed-line highlighting promised by the README and functional specification.

Fix: compute a diff in the single active edit controller, store it by tab, and render line/gutter decorations before enabling Accept/Revert.

### [HIGH] src/main/index.ts:386 — Recent-files IPC is a hardcoded stub

```typescript
ipcMain.handle('file:get-recent', async () => [])
```

The sidebar says “Recent Files” but renders only the current `editorStore.tabs`; the persisted `fileStore.recentFiles` collection has no production reader. Closing a tab therefore removes it from the list even though a recent-file history is being written to settings.

Fix: choose one product model—open tabs or recent files—rename the UI accordingly, and either wire the persisted list into the sidebar or remove the dead IPC/store surface.

### [HIGH] src/stores/viewStore.ts:26 — Responsive split-mode fallback can never run

```typescript
const NARROW_WINDOW_THRESHOLD = 600
```

The Electron window has a hard minimum width of 800px, so `width < 600` is unreachable. At the minimum width, opening the 240px sidebar and 360px AI panel leaves less space than the split view's two 280px minimum panels, causing overflow instead of the promised fallback.

Fix: derive layout decisions from available content width after side panels, and use one shared set of width constraints for Electron and the renderer.

### [MEDIUM] src/components/Settings/sections/EditorSection.tsx:26 — Spell-check toggle has no effect

```typescript
<ToggleSwitch
  label="Spell Check"
  checked={spellCheck}
  onChange={(value) => updateSetting('spellCheck', value)}
/>
```

`spellCheck` is persisted and displayed but is never passed to CodeMirror, the editor DOM, or Electron web preferences. Users can toggle a setting that changes no runtime behavior.

Fix: apply the value to the editor content DOM's `spellcheck` behavior and add an integration test that observes the resulting editor configuration.

### [MEDIUM] src/hooks/useSessionRestore.ts:67 — Saved panel state is ignored during restore

```typescript
setActiveView(result.session.activeView || 'split')

if (result.session.splitRatio) {
  setSplitRatio(result.session.splitRatio)
}
```

Quit persistence records `sidebarOpen` and `aiPanelOpen`, but restore applies only view mode and split ratio. The session contract promises full UI restoration while silently dropping two fields.

Fix: add explicit `setSidebarOpen` and `setAiPanelOpen` actions and restore every persisted session field in one transaction.

### [MEDIUM] src/App.tsx:124 — Find menu command only focuses the editor

```typescript
const unsubFind = window.electron.onMenuEvent('menu:find', () => {
  editorRef.current?.focus()
})
```

Choosing Edit → Find does not dispatch CodeMirror's `openSearchPanel` command. The keyboard shortcut may be handled after focus, but the menu action itself never opens search.

Fix: expose a `find` editor action that calls `openSearchPanel(editorView)` and test the native menu event path.

### [MEDIUM] src/main/index.ts:784 — AI document edits are buffered, not streamed

```typescript
let fullResponse = ''
let documentContent = params.documentContent

while (true) {
  const { done, value } = await reader.read()
```

The full model response is accumulated before any `ai:edit-chunk` event is sent; the only chunk contains the final document. This contradicts the documented real-time editing behavior and leaves the UI showing an indeterminate operation.

Fix: either change the product contract to an atomic edit or stream validated operations incrementally with explicit progress events.

### [MEDIUM] src/main/index.ts:733 — User-configured system prompt is ignored for edits

```typescript
const editSystemPrompt = `You are editing a Markdown document...
```

The renderer sends `params.systemPrompt`, but the edit handler never uses it. Settings claim the prompt customizes the assistant generally, while it affects only chat.

Fix: document separate chat/edit prompts or safely compose the configured prompt into the edit request.

### [LOW] src/main/index.ts:315 — Help → About sends an event nobody handles

```typescript
click: () => mainWindow.webContents.send('menu:about'),
```

The preload whitelist includes `menu:about`, but `App` never subscribes to it. The visible native menu command is inert.

Fix: subscribe and open the settings About section, or use Electron's native About panel.
