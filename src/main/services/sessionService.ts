import { app } from 'electron'
import { access, mkdir, readFile, readdir, rename, rm, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import type { DraftSnapshot } from '../../types/ipc'
import type { DraftMetadata, RestoreResult, SessionState } from '../../types/session'
import { logger } from './logger'

const DRAFTS_DIRECTORY = 'drafts'
const PREVIOUS_DRAFTS_DIRECTORY = 'drafts.previous'
const SESSION_FILE = 'session.json'
const TAB_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/

function assertTabId(tabId: string): void {
  if (!TAB_ID_PATTERN.test(tabId)) throw new Error('Invalid tab identifier')
}

function userDataPath(): string {
  return app.getPath('userData')
}

function draftsPath(): string {
  return join(userDataPath(), DRAFTS_DIRECTORY)
}

function sessionPath(): string {
  return join(userDataPath(), SESSION_FILE)
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function writeDraft(directory: string, draft: DraftSnapshot): Promise<void> {
  assertTabId(draft.tabId)
  const metadata: DraftMetadata = {
    tabId: draft.tabId,
    filePath: draft.filePath,
    fileName: draft.fileName,
    isDirty: draft.isDirty,
    cursorPosition: draft.cursorPosition,
    scrollPosition: draft.scrollPosition,
    createdAt: new Date().toISOString(),
  }
  await Promise.all([
    writeFile(join(directory, `${draft.tabId}.md`), draft.content, 'utf8'),
    writeFile(join(directory, `${draft.tabId}.json`), JSON.stringify(metadata), 'utf8'),
  ])
}

export async function clearDraft(tabId: string): Promise<void> {
  assertTabId(tabId)
  await Promise.all(
    ['md', 'json'].map(async (extension) => {
      try {
        await unlink(join(draftsPath(), `${tabId}.${extension}`))
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
    })
  )
}

export async function clearAllDrafts(): Promise<void> {
  await Promise.all([
    rm(draftsPath(), { recursive: true, force: true }),
    rm(join(userDataPath(), PREVIOUS_DRAFTS_DIRECTORY), { recursive: true, force: true }),
    rm(sessionPath(), { force: true }),
  ])
  await mkdir(draftsPath(), { recursive: true })
}

async function loadDraftsFrom(directory: string): Promise<Map<string, { content: string; metadata: DraftMetadata }>> {
  const drafts = new Map<string, { content: string; metadata: DraftMetadata }>()
  if (!(await pathExists(directory))) return drafts
  const metadataFiles = (await readdir(directory)).filter(
    (file) => file.endsWith('.json') && file !== SESSION_FILE
  )
  await Promise.all(
    metadataFiles.map(async (file) => {
      const tabId = file.slice(0, -5)
      try {
        const [metadataJson, content] = await Promise.all([
          readFile(join(directory, file), 'utf8'),
          readFile(join(directory, `${tabId}.md`), 'utf8'),
        ])
        drafts.set(tabId, { content, metadata: JSON.parse(metadataJson) as DraftMetadata })
      } catch (error) {
        logger.error('draft.restore.item', error, { tabId })
      }
    })
  )
  return drafts
}

async function loadSessionState(directory?: string): Promise<SessionState | null> {
  try {
    const path = directory ? join(directory, SESSION_FILE) : sessionPath()
    return JSON.parse(await readFile(path, 'utf8')) as SessionState
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') logger.error('session.restore', error)
    return null
  }
}

export async function saveRecoverySnapshot(
  drafts: DraftSnapshot[],
  state: Omit<SessionState, 'savedAt' | 'appVersion'>
): Promise<void> {
  const recoverableDrafts = drafts.filter((draft) => draft.isDirty || !draft.filePath)
  const target = draftsPath()
  const temporary = join(userDataPath(), `${DRAFTS_DIRECTORY}.tmp-${process.pid}-${Date.now()}`)
  const previous = join(userDataPath(), PREVIOUS_DRAFTS_DIRECTORY)
  const session: SessionState = {
    ...state,
    savedAt: new Date().toISOString(),
    appVersion: app.getVersion(),
  }

  await mkdir(temporary, { recursive: true })
  try {
    await Promise.all([
      ...recoverableDrafts.map((draft) => writeDraft(temporary, draft)),
      writeFile(join(temporary, SESSION_FILE), JSON.stringify(session, null, 2), 'utf8'),
    ])
    await rm(previous, { recursive: true, force: true })
    if (await pathExists(target)) await rename(target, previous)
    await rename(temporary, target)
    await rm(sessionPath(), { force: true }).catch((error) => {
      logger.warn('session.legacy.cleanup', { error: String(error) })
    })
  } catch (error) {
    await rm(temporary, { recursive: true, force: true })
    if (!(await pathExists(target)) && (await pathExists(previous))) await rename(previous, target)
    throw error
  }
}

type RestoredTab = RestoreResult['tabs'][number]

async function restoreTabContent(
  descriptor: NonNullable<SessionState['tabs']>[number],
  draft: { content: string; metadata: DraftMetadata } | undefined
): Promise<RestoredTab | null> {
  if (descriptor.isDirty || !descriptor.filePath) {
    if (!draft && descriptor.filePath) {
      try {
        return { ...descriptor, content: await readFile(descriptor.filePath, 'utf8'), isDirty: false }
      } catch (error) {
        logger.error('session.restore.file', error, { path: descriptor.filePath })
        return null
      }
    }
    if (!draft) return { ...descriptor, content: '', isDirty: true }
    return { ...descriptor, content: draft.content, isDirty: true }
  }

  try {
    return { ...descriptor, content: await readFile(descriptor.filePath, 'utf8'), isDirty: false }
  } catch (error) {
    logger.error('session.restore.file', error, { path: descriptor.filePath })
    if (!draft) return null
    return { ...descriptor, content: draft.content, isDirty: true }
  }
}

export async function restoreSession(): Promise<RestoreResult> {
  try {
    const currentDirectory = draftsPath()
    const previousDirectory = join(userDataPath(), PREVIOUS_DRAFTS_DIRECTORY)
    let [session, drafts] = await Promise.all([
      loadSessionState(currentDirectory),
      loadDraftsFrom(currentDirectory),
    ])
    if (!session && drafts.size === 0) {
      ;[session, drafts] = await Promise.all([
        loadSessionState(previousDirectory),
        loadDraftsFrom(previousDirectory),
      ])
    }
    session ||= await loadSessionState()

    if (!session && drafts.size === 0) return { success: true, tabs: [], session: null }

    const descriptors = session?.tabs?.length
      ? session.tabs
      : Array.from(drafts.values()).map(({ metadata }) => metadata)
    const order = session?.openTabIds?.length
      ? session.openTabIds
      : descriptors.map((descriptor) => descriptor.tabId)
    const byId = new Map(descriptors.map((descriptor) => [descriptor.tabId, descriptor]))
    const restored = await Promise.all(
      order.map((tabId) => {
        const descriptor = byId.get(tabId)
        return descriptor ? restoreTabContent(descriptor, drafts.get(tabId)) : null
      })
    )

    return { success: true, tabs: restored.filter((tab): tab is RestoredTab => tab !== null), session }
  } catch (error) {
    logger.error('session.restore', error)
    return { success: false, tabs: [], session: null, error: (error as Error).message }
  }
}
