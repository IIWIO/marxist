import { app, clipboard } from 'electron'
import { appendFile, mkdir, readFile, rename, stat } from 'fs/promises'
import { join } from 'path'

type LogLevel = 'info' | 'warn' | 'error'
type LogContext = Record<string, unknown>

const MAX_LOG_BYTES = 1_000_000
const SECRET_PATTERN = /(sk-or-v1-[a-zA-Z0-9_-]+|Bearer\s+[a-zA-Z0-9._-]+)/g

function paths(): { directory: string; current: string; previous: string } {
  const directory = join(app.getPath('userData'), 'logs')
  return {
    directory,
    current: join(directory, 'marxist.log'),
    previous: join(directory, 'marxist.previous.log'),
  }
}

function redact(value: unknown): unknown {
  if (typeof value === 'string') return value.replace(SECRET_PATTERN, '[REDACTED]')
  if (Array.isArray(value)) return value.map(redact)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        /key|token|authorization/i.test(key) ? '[REDACTED]' : redact(item),
      ])
    )
  }
  return value
}

async function rotateIfNeeded(): Promise<void> {
  const { directory, current, previous } = paths()
  await mkdir(directory, { recursive: true })
  try {
    if ((await stat(current)).size >= MAX_LOG_BYTES) await rename(current, previous)
  } catch {
    // A missing log file is expected on first launch.
  }
}

async function write(level: LogLevel, operation: string, context: LogContext = {}): Promise<void> {
  try {
    await rotateIfNeeded()
    const safeContext = redact(context) as LogContext
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      operation,
      ...safeContext,
    })
    await appendFile(paths().current, `${entry}\n`, 'utf8')
  } catch {
    // Diagnostics must never interrupt the user operation being logged.
  }
}

export const logger = {
  info: (operation: string, context?: LogContext) => void write('info', operation, context),
  warn: (operation: string, context?: LogContext) => void write('warn', operation, context),
  error: (operation: string, error: unknown, context: LogContext = {}) =>
    void write('error', operation, {
      ...context,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }),
}

export async function copyDiagnostics(): Promise<void> {
  const { current } = paths()
  let contents = 'No diagnostic log has been created yet.'
  try {
    contents = await readFile(current, 'utf8')
  } catch {
    // Keep the explanatory fallback.
  }
  clipboard.writeText(contents.slice(-200_000))
}
