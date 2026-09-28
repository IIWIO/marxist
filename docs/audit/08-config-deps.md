# Configuration and dependency hygiene

### [MEDIUM] package.json:72 — Core runtime and tooling are several major generations behind

```json
"electron": "^32.3.3",
"electron-builder": "^24.9.1",
"electron-vite": "^2.0.0",
"eslint": "^8.56.0",
"vite": "^5.0.10",
"vitest": "^1.1.0"
```

`npm outdated` reports major-version drift across Electron, electron-vite, Vite, Vitest, ESLint, testing-library, Zustand, and the TypeScript/React ecosystem. The current install already emits multiple deprecation warnings, so postponing upgrades increases migration coupling and makes maintenance fixes harder.

Fix: upgrade in staged groups—test/lint tooling, Vite/electron-vite, then Electron/runtime libraries—keeping each step green and packaging-tested.

### [LOW] package.json:28 — Manifest carries unused direct dependencies

```json
"@codemirror/autocomplete": "^6.20.0",
"github-markdown-css": "^5.9.0",
"highlight.js": "^11.11.1",
"rehype-mathjax": "^7.1.0"
```

Static dependency analysis found these direct dependencies unused by source, along with unused development entries including `@electron-toolkit/utils`, `@testing-library/user-event`, `happy-dom`, `msw`, and standalone `playwright`. Some functionality arrives transitively through other packages, but the direct declarations have no owned import/config path.

Fix: verify with a clean build/test/package cycle, then remove redundant entries and keep dependency checks in CI.

### [LOW] notes/04-technical-architecture.md:40 — Architecture documentation describes files and behavior that do not exist

```text
DiffHighlighter.ts
useOpenRouter.ts
useDiffHighlight.ts
ipc.ts
CodeMirror editor instance (per-tab, kept alive)
```

The planned tree and runtime model have drifted substantially from the implementation, including per-tab editors, diff highlighting, IPC module boundaries, and font choices. New contributors cannot reliably use the architecture notes to navigate the code.

Fix: mark build plans as historical and replace the architecture section with a generated/current map plus explicitly tracked gaps.
