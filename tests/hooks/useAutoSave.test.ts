import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from '@/stores/editorStore'

describe('useAutoSave draft preparation', () => {
  beforeEach(() => {
    useEditorStore.setState({
      tabs: new Map(),
      activeTabId: null,
      untitledCounter: 0,
      wordCount: 0,
      letterCount: 0,
    })
  })

  it('prepares draft data from tabs', () => {
    useEditorStore.getState().createTab('/path/file.md', 'content 1')
    useEditorStore.getState().createTab(null, 'content 2')

    const { tabs } = useEditorStore.getState()
    const drafts = Array.from(tabs.values()).map((tab) => ({
      tabId: tab.tabId,
      content: tab.content,
      filePath: tab.filePath,
      fileName: tab.fileName,
      isDirty: tab.isDirty,
      cursorPosition: tab.cursorPosition,
      scrollPosition: tab.scrollPosition,
    }))

    expect(drafts.length).toBe(2)
    expect(drafts.some(d => d.filePath === '/path/file.md')).toBe(true)
    expect(drafts.some(d => d.filePath === null)).toBe(true)
  })

  it('includes dirty state in draft data', () => {
    const tabId = useEditorStore.getState().createTab('/path/file.md', 'original')
    useEditorStore.getState().markTabSaved(tabId)
    useEditorStore.getState().updateTabContent(tabId, 'modified')

    const tab = useEditorStore.getState().tabs.get(tabId)

    expect(tab?.isDirty).toBe(true)
    expect(tab?.content).toBe('modified')
  })

  it('includes cursor and scroll positions', () => {
    const tabId = useEditorStore.getState().createTab(null, 'content')
    useEditorStore.getState().updateTabEditorState(tabId, null, 100, 50)

    const tab = useEditorStore.getState().tabs.get(tabId)

    expect(tab?.scrollPosition).toBe(100)
    expect(tab?.cursorPosition).toBe(50)
  })

  it('returns empty array when no tabs', () => {
    const { tabs } = useEditorStore.getState()
    expect(tabs.size).toBe(0)

    const drafts = Array.from(tabs.values())
    expect(drafts.length).toBe(0)
  })
})
