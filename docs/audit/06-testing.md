# Testing and quality gates

### [HIGH] package.json:14 — All repository quality gates are red

```json
"lint": "eslint . --ext .ts,.tsx --report-unused-disable-directives --max-warnings 0",
"typecheck": "tsc --noEmit",
"test": "vitest run",
"test:e2e": "playwright test"
```

On the audited commit, Vitest reports 274 passing and 22 failing tests, TypeScript reports 7 errors, ESLint reports 5 errors and 2 warnings, and Playwright reports 6 passing and 3 failing tests. `npm run build` still succeeds because the production build does not run any of those gates.

Fix: repair the failures, add a single `check` script that runs types/lint/unit/build, and make packaging depend on it.

### [HIGH] .github/workflows:1 — No continuous-integration gate exists

There is no `.github/workflows` directory or equivalent CI configuration. Broken tests, types, lint, and packaging can all land on `main` and be tagged for release without automation stopping them.

Fix: add CI for clean install, typecheck, lint, unit tests, build, and macOS Electron smoke tests; require it on the protected release branch.

### [HIGH] tests/hooks/useAIEdit.test.ts:5 — Critical AI and persistence tests do not execute their subjects

```typescript
describe('useAIEdit', () => {
  // tests only call Zustand store actions
```

The file named for `useAIEdit` never imports or renders that hook, and the “useAutoSave” tests manually recreate its mapping logic rather than invoking the hook. No unit test imports `src/main/index.ts`, `sessionService`, or `autoUpdater`, leaving SSE framing, atomic recovery, quit failure, IPC wiring, and update installation untested.

Fix: extract testable main-process services, invoke real hooks with `renderHook`, and add failure-injection tests for disk/network/update paths.

### [MEDIUM] tests/setup.ts:5 — Shared Electron mock has drifted from the preload contract

```typescript
const mockElectronAPI = {
  file: { open: vi.fn(), save: vi.fn(), saveAs: vi.fn() },
  // ...
  onMenuEvent: vi.fn().mockReturnValue(() => {}),
}
```

The mock omits `onAIEvent`, `onAppEvent`, several draft/app functions, and newer settings fields. This causes whole component suites to crash before assertions and allowed the mock to diverge from the actual `ElectronAPI` without a type error.

Fix: build the mock with `satisfies ElectronAPI`, provide every method, and let each test override only the behavior it needs.

### [MEDIUM] tests/e2e/launch.spec.ts:5 — Electron tests leak processes and share user state after failure

```typescript
const electronApp = await electron.launch({ ... })
// assertions
await electronApp.close()
```

Cleanup runs only after assertions, so the first failure leaves an Electron process holding the single-instance lock and contaminates later tests. Launches also use the real default user-data directory rather than an isolated temporary profile, making session and first-run behavior order-dependent.

Fix: create a Playwright fixture with unique `--user-data-dir`, close the app in `finally`, and reset storage for every test.

### [MEDIUM] vitest.config.ts:12 — Coverage has no enforceable floor

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: ['node_modules/', 'tests/', 'electron/']
}
```

No line, branch, function, or statement threshold is configured. The current coverage command exits with test failures before producing a usable report, so coverage cannot act as a release signal.

Fix: make the suite green, establish a baseline report, then enforce global and critical-module thresholds in Vitest and CI.
