# Observability and operability

### [MEDIUM] src/main/autoUpdater.ts:4 — Production diagnostics exist only as ad-hoc console output

```typescript
autoUpdater.logger = console
```

Updater, session, file, Markdown, and AI failures are logged as unrelated console strings, while several persistence errors are swallowed. In a packaged desktop app the user and support team have no durable, correlated record of which operation, tab, path, or stream failed.

Fix: add a redacting persistent logger with operation/stream IDs, bounded log rotation, and a “Copy diagnostics” action; keep user-facing errors separate from diagnostic detail.
