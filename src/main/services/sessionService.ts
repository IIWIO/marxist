import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync, rmSync } from 'fs'
import type { DraftMetadata, SessionState, RestoreResult } from '../../types/session'

function getAppDataPath(): string {
  return app.getPath('userData')
}

function getDraftsPath(): string {
  return join(getAppDataPath(), 'drafts')
}

function getSessionFilePath(): string {
  return join(getAppDataPath(), 'session.json')
}

function ensureDraftsDir(): void {
  const draftsPath = getDraftsPath()
  if (!existsSync(draftsPath)) {
    mkdirSync(draftsPath, { recursive: true })
  }
}

export function saveDraft(
  tabId: string,
  content: string,
  metadata: Omit<DraftMetadata, 'tabId' | 'createdAt'>
): void {
  ensureDraftsDir()
  const draftsPath = getDraftsPath()

  const contentPath = join(draftsPath, `${tabId}.md`)
  const metadataPath = join(draftsPath, `${tabId}.json`)

  const fullMetadata: DraftMetadata = {
    ...metadata,
    tabId,
    createdAt: new Date().toISOString(),
  }

  writeFileSync(contentPath, content, 'utf-8')
  writeFileSync(metadataPath, JSON.stringify(fullMetadata, null, 2), 'utf-8')
}

export function saveAllDrafts(
  drafts: Array<{
    tabId: string
    content: string
    filePath: string | null
    fileName: string
    isDirty: boolean
    cursorPosition: number
    scrollPosition: number
  }>
): void {
  ensureDraftsDir()

  clearAllDrafts()

  for (const draft of drafts) {
    saveDraft(draft.tabId, draft.content, {
      filePath: draft.filePath,
      fileName: draft.fileName,
      isDirty: draft.isDirty,
      cursorPosition: draft.cursorPosition,
      scrollPosition: draft.scrollPosition,
    })
  }
}

export function clearDraft(tabId: string): void {
  const draftsPath = getDraftsPath()
  const contentPath = join(draftsPath, `${tabId}.md`)
  const metadataPath = join(draftsPath, `${tabId}.json`)

  try {
    if (existsSync(contentPath)) unlinkSync(contentPath)
    if (existsSync(metadataPath)) unlinkSync(metadataPath)
  } catch (error) {
    console.error(`Failed to clear draft ${tabId}:`, error)
  }
}

export function clearAllDrafts(): void {
  const draftsPath = getDraftsPath()
  if (!existsSync(draftsPath)) return

  try {
    rmSync(draftsPath, { recursive: true, force: true })
    mkdirSync(draftsPath, { recursive: true })
  } catch (error) {
    console.error('Failed to clear all drafts:', error)
  }
}

export function loadDrafts(): Array<{
  tabId: string
  content: string
  metadata: DraftMetadata
}> {
  ensureDraftsDir()
  const draftsPath = getDraftsPath()

  const drafts: Array<{ tabId: string; content: string; metadata: DraftMetadata }> = []

  try {
    const files = readdirSync(draftsPath)
    const metadataFiles = files.filter((f) => f.endsWith('.json'))

    for (const metaFile of metadataFiles) {
      const tabId = metaFile.replace('.json', '')
      const contentFile = `${tabId}.md`

      const metadataPath = join(draftsPath, metaFile)
      const contentPath = join(draftsPath, contentFile)

      if (!existsSync(contentPath)) continue

      try {
        const metadata: DraftMetadata = JSON.parse(readFileSync(metadataPath, 'utf-8'))
        const content = readFileSync(contentPath, 'utf-8')

        drafts.push({ tabId, content, metadata })
      } catch (error) {
        console.error(`Failed to load draft ${tabId}:`, error)
      }
    }
  } catch (error) {
    console.error('Failed to load drafts:', error)
  }

  return drafts
}

export function saveSessionState(state: SessionState): void {
  try {
    writeFileSync(getSessionFilePath(), JSON.stringify(state, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to save session state:', error)
  }
}

export function loadSessionState(): SessionState | null {
  try {
    const sessionFile = getSessionFilePath()
    if (!existsSync(sessionFile)) return null

    const data = readFileSync(sessionFile, 'utf-8')
    return JSON.parse(data) as SessionState
  } catch (error) {
    console.error('Failed to load session state:', error)
    return null
  }
}

export function restoreSession(): RestoreResult {
  try {
    const drafts = loadDrafts()
    const session = loadSessionState()

    if (drafts.length === 0 && !session) {
      return { success: true, tabs: [], session: null }
    }

    const tabsMap = new Map(
      drafts.map((d) => [
        d.tabId,
        {
          tabId: d.tabId,
          filePath: d.metadata.filePath,
          fileName: d.metadata.fileName,
          content: d.content,
          isDirty: d.metadata.isDirty,
          cursorPosition: d.metadata.cursorPosition,
          scrollPosition: d.metadata.scrollPosition,
        },
      ])
    )

    type TabEntry = {
      tabId: string
      filePath: string | null
      fileName: string
      content: string
      isDirty: boolean
      cursorPosition: number
      scrollPosition: number
    }

    let orderedTabs: TabEntry[] = []

    if (session?.openTabIds) {
      for (const tabId of session.openTabIds) {
        const tab = tabsMap.get(tabId)
        if (tab) {
          orderedTabs.push(tab)
          tabsMap.delete(tabId)
        }
      }
      orderedTabs.push(...tabsMap.values())
    } else {
      orderedTabs = Array.from(tabsMap.values())
    }

    return {
      success: true,
      tabs: orderedTabs,
      session,
    }
  } catch (error) {
    console.error('Failed to restore session:', error)
    return {
      success: false,
      tabs: [],
      session: null,
      error: (error as Error).message,
    }
  }
}

export function getAppVersion(): string {
  return app.getVersion()
}
