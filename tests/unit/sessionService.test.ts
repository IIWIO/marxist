import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const electronState = vi.hoisted(() => ({ userData: '' }))

vi.mock('electron', () => ({
  app: {
    getPath: () => electronState.userData,
    getVersion: () => '0.8.2',
  },
  clipboard: { writeText: vi.fn() },
}))

import { clearDraft, restoreSession, saveRecoverySnapshot } from '@/main/services/sessionService'

describe('sessionService', () => {
  beforeEach(async () => {
    electronState.userData = await mkdtemp(join(tmpdir(), 'marxist-session-'))
  })

  afterEach(async () => {
    await rm(electronState.userData, { recursive: true, force: true })
  })

  it('atomically stores only recoverable drafts and reloads clean files from disk', async () => {
    const cleanPath = join(electronState.userData, 'clean.md')
    await writeFile(cleanPath, 'current disk content', 'utf8')
    const tabs = [
      {
        tabId: 'clean', filePath: cleanPath, fileName: 'clean.md', content: 'stale snapshot',
        isDirty: false, cursorPosition: 1, scrollPosition: 2,
      },
      {
        tabId: 'dirty', filePath: null, fileName: 'Untitled', content: 'unsaved content',
        isDirty: true, cursorPosition: 3, scrollPosition: 4,
      },
    ]
    await saveRecoverySnapshot(tabs, {
      openTabIds: ['clean', 'dirty'],
      activeTabId: 'dirty',
      untitledCounter: 1,
      activeView: 'split',
      splitRatio: 0.5,
      sidebarOpen: true,
      aiPanelOpen: false,
      tabs: tabs.map((tab) => ({
        tabId: tab.tabId,
        filePath: tab.filePath,
        fileName: tab.fileName,
        isDirty: tab.isDirty,
        cursorPosition: tab.cursorPosition,
        scrollPosition: tab.scrollPosition,
      })),
    })

    await writeFile(cleanPath, 'externally updated', 'utf8')
    const restored = await restoreSession()
    expect(restored.success).toBe(true)
    expect(restored.tabs.find((tab) => tab.tabId === 'clean')?.content).toBe('externally updated')
    expect(restored.tabs.find((tab) => tab.tabId === 'dirty')?.content).toBe('unsaved content')
    await expect(readFile(join(electronState.userData, 'drafts', 'clean.md'), 'utf8')).rejects.toThrow()
    await expect(readFile(join(electronState.userData, 'drafts', 'session.json'), 'utf8')).resolves.toContain('"activeTabId": "dirty"')
  })

  it('recovers the disk copy if a saved tab draft was cleared before the next snapshot', async () => {
    const filePath = join(electronState.userData, 'saved.md')
    await writeFile(filePath, 'saved content', 'utf8')
    const tab = {
      tabId: 'saved', filePath, fileName: 'saved.md', content: 'unsaved content',
      isDirty: true, cursorPosition: 0, scrollPosition: 0,
    }
    await saveRecoverySnapshot([tab], {
      openTabIds: ['saved'], activeTabId: 'saved', untitledCounter: 0,
      activeView: 'split', splitRatio: 0.5, sidebarOpen: false, aiPanelOpen: false,
      tabs: [tab],
    })

    await clearDraft('saved')
    const restored = await restoreSession()
    expect(restored.tabs).toEqual([
      expect.objectContaining({ tabId: 'saved', content: 'saved content', isDirty: false }),
    ])
  })

  it('rejects tab identifiers that could escape the recovery directory', async () => {
    await expect(clearDraft('../session')).rejects.toThrow('Invalid tab identifier')
  })
})
