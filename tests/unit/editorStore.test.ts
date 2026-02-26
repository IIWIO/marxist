import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from '@/stores/editorStore'

describe('editorStore', () => {
  beforeEach(() => {
    useEditorStore.setState({
      tabs: new Map(),
      activeTabId: null,
      wordCount: 0,
      letterCount: 0,
      untitledCounter: 0,
    })
  })

  describe('createTab', () => {
    it('creates untitled tab with correct naming (TB-02)', () => {
      const tabId1 = useEditorStore.getState().createTab()
      const tab1 = useEditorStore.getState().tabs.get(tabId1)
      expect(tab1?.fileName).toBe('Untitled')

      const tabId2 = useEditorStore.getState().createTab()
      const tab2 = useEditorStore.getState().tabs.get(tabId2)
      expect(tab2?.fileName).toBe('Untitled 2')

      const tabId3 = useEditorStore.getState().createTab()
      const tab3 = useEditorStore.getState().tabs.get(tabId3)
      expect(tab3?.fileName).toBe('Untitled 3')
    })

    it('creates tab with file path', () => {
      const tabId = useEditorStore.getState().createTab('/path/to/readme.md', '# Hello')
      const tab = useEditorStore.getState().tabs.get(tabId)

      expect(tab?.filePath).toBe('/path/to/readme.md')
      expect(tab?.fileName).toBe('readme.md')
      expect(tab?.content).toBe('# Hello')
      expect(tab?.isDirty).toBe(false)
    })

    it('sets new tab as active', () => {
      const tabId = useEditorStore.getState().createTab()
      expect(useEditorStore.getState().activeTabId).toBe(tabId)
    })

    it('limits tabs to 20 (FS-05)', () => {
      for (let i = 0; i < 20; i++) {
        useEditorStore.getState().createTab()
      }
      expect(useEditorStore.getState().tabs.size).toBe(20)

      useEditorStore.getState().createTab()
      expect(useEditorStore.getState().tabs.size).toBe(20)
    })

    it('returns empty string when all 20 tabs are dirty', () => {
      for (let i = 0; i < 20; i++) {
        const tabId = useEditorStore.getState().createTab()
        useEditorStore.getState().updateTabContent(tabId, 'modified content')
      }
      expect(useEditorStore.getState().tabs.size).toBe(20)

      const newTabId = useEditorStore.getState().createTab()
      expect(newTabId).toBe('')
      expect(useEditorStore.getState().tabs.size).toBe(20)
    })
  })

  describe('updateTabContent', () => {
    it('marks tab as dirty when content changes (FS-11)', () => {
      const tabId = useEditorStore.getState().createTab('/path/test.md', 'original')

      useEditorStore.getState().markTabSaved(tabId)
      expect(useEditorStore.getState().tabs.get(tabId)?.isDirty).toBe(false)

      useEditorStore.getState().updateTabContent(tabId, 'modified')
      expect(useEditorStore.getState().tabs.get(tabId)?.isDirty).toBe(true)
    })

    it('updates word and letter counts for active tab', () => {
      const tabId = useEditorStore.getState().createTab(null, '')
      useEditorStore.getState().updateTabContent(tabId, 'one two three')

      expect(useEditorStore.getState().wordCount).toBe(3)
      expect(useEditorStore.getState().letterCount).toBe(11)
    })

    it('does not update counts for inactive tab', () => {
      const tabId1 = useEditorStore.getState().createTab(null, 'first tab')
      const tabId2 = useEditorStore.getState().createTab(null, 'second')

      expect(useEditorStore.getState().activeTabId).toBe(tabId2)
      expect(useEditorStore.getState().wordCount).toBe(1)

      useEditorStore.getState().updateTabContent(tabId1, 'one two three four')
      expect(useEditorStore.getState().wordCount).toBe(1)
    })
  })

  describe('markTabSaved', () => {
    it('clears dirty flag', () => {
      const tabId = useEditorStore.getState().createTab(null, 'content')
      useEditorStore.getState().updateTabContent(tabId, 'modified')
      expect(useEditorStore.getState().tabs.get(tabId)?.isDirty).toBe(true)

      useEditorStore.getState().markTabSaved(tabId)
      expect(useEditorStore.getState().tabs.get(tabId)?.isDirty).toBe(false)
    })

    it('updates file path on Save As', () => {
      const tabId = useEditorStore.getState().createTab(null, 'content')
      useEditorStore.getState().markTabSaved(tabId, '/new/path.md', 'path.md')

      const tab = useEditorStore.getState().tabs.get(tabId)
      expect(tab?.filePath).toBe('/new/path.md')
      expect(tab?.fileName).toBe('path.md')
    })

    it('updates savedContent to match current content', () => {
      const tabId = useEditorStore.getState().createTab(null, 'original')
      useEditorStore.getState().updateTabContent(tabId, 'modified content')

      const tabBefore = useEditorStore.getState().tabs.get(tabId)
      expect(tabBefore?.savedContent).toBe('original')

      useEditorStore.getState().markTabSaved(tabId)

      const tabAfter = useEditorStore.getState().tabs.get(tabId)
      expect(tabAfter?.savedContent).toBe('modified content')
      expect(tabAfter?.isDirty).toBe(false)
    })
  })

  describe('getTabByPath', () => {
    it('finds existing tab by path (FO-09)', () => {
      const tabId = useEditorStore.getState().createTab('/path/to/file.md', 'content')

      const found = useEditorStore.getState().getTabByPath('/path/to/file.md')
      expect(found?.tabId).toBe(tabId)
    })

    it('returns null for non-existent path', () => {
      useEditorStore.getState().createTab('/path/to/file.md', 'content')

      const found = useEditorStore.getState().getTabByPath('/other/path.md')
      expect(found).toBeNull()
    })

    it('returns null for untitled tabs', () => {
      useEditorStore.getState().createTab(null, 'content')

      const found = useEditorStore.getState().getTabByPath('/some/path.md')
      expect(found).toBeNull()
    })
  })

  describe('closeTab', () => {
    it('removes tab from store', () => {
      const tabId = useEditorStore.getState().createTab()
      expect(useEditorStore.getState().tabs.has(tabId)).toBe(true)

      useEditorStore.getState().closeTab(tabId)
      expect(useEditorStore.getState().tabs.has(tabId)).toBe(false)
    })

    it('switches to another tab when closing active', () => {
      const tabId1 = useEditorStore.getState().createTab()
      const tabId2 = useEditorStore.getState().createTab()

      expect(useEditorStore.getState().activeTabId).toBe(tabId2)

      useEditorStore.getState().closeTab(tabId2)
      expect(useEditorStore.getState().activeTabId).toBe(tabId1)
    })

    it('sets activeTabId to null when closing last tab', () => {
      const tabId = useEditorStore.getState().createTab()
      expect(useEditorStore.getState().tabs.size).toBe(1)

      useEditorStore.getState().closeTab(tabId)
      expect(useEditorStore.getState().tabs.size).toBe(0)
      expect(useEditorStore.getState().activeTabId).toBeNull()
    })

    it('does nothing for non-existent tab', () => {
      const tabId = useEditorStore.getState().createTab()
      useEditorStore.getState().closeTab('non-existent-tab')
      expect(useEditorStore.getState().tabs.has(tabId)).toBe(true)
    })
  })

  describe('setActiveTab', () => {
    it('changes active tab', () => {
      const tabId1 = useEditorStore.getState().createTab(null, 'one')
      const tabId2 = useEditorStore.getState().createTab(null, 'two words')

      expect(useEditorStore.getState().activeTabId).toBe(tabId2)
      expect(useEditorStore.getState().wordCount).toBe(2)

      useEditorStore.getState().setActiveTab(tabId1)
      expect(useEditorStore.getState().activeTabId).toBe(tabId1)
      expect(useEditorStore.getState().wordCount).toBe(1)
    })

    it('does nothing for non-existent tab', () => {
      const tabId = useEditorStore.getState().createTab()
      useEditorStore.getState().setActiveTab('non-existent')
      expect(useEditorStore.getState().activeTabId).toBe(tabId)
    })
  })

  describe('getActiveTab', () => {
    it('returns active tab', () => {
      const tabId = useEditorStore.getState().createTab('/path/file.md', 'content')
      const activeTab = useEditorStore.getState().getActiveTab()

      expect(activeTab?.tabId).toBe(tabId)
      expect(activeTab?.filePath).toBe('/path/file.md')
    })

    it('returns null when no tabs', () => {
      const activeTab = useEditorStore.getState().getActiveTab()
      expect(activeTab).toBeNull()
    })
  })

  describe('updateTabEditorState', () => {
    it('updates scroll and cursor positions', () => {
      const tabId = useEditorStore.getState().createTab()

      useEditorStore.getState().updateTabEditorState(tabId, null, 100, 50)

      const tab = useEditorStore.getState().tabs.get(tabId)
      expect(tab?.scrollPosition).toBe(100)
      expect(tab?.cursorPosition).toBe(50)
    })

    it('preserves existing values when not provided', () => {
      const tabId = useEditorStore.getState().createTab()
      useEditorStore.getState().updateTabEditorState(tabId, null, 100, 50)

      useEditorStore.getState().updateTabEditorState(tabId, null, undefined, 75)

      const tab = useEditorStore.getState().tabs.get(tabId)
      expect(tab?.scrollPosition).toBe(100)
      expect(tab?.cursorPosition).toBe(75)
    })
  })

  describe('AI editing methods', () => {
    it('setTabAIEditing updates AI editing state', () => {
      const tabId = useEditorStore.getState().createTab(null, 'content')

      useEditorStore.getState().setTabAIEditing(tabId, true, 'snapshot')

      const tab = useEditorStore.getState().tabs.get(tabId)
      expect(tab?.isAIEditing).toBe(true)
      expect(tab?.preEditSnapshot).toBe('snapshot')
    })

    it('setTabShowDiff updates diff visibility', () => {
      const tabId = useEditorStore.getState().createTab()

      useEditorStore.getState().setTabShowDiff(tabId, true)

      const tab = useEditorStore.getState().tabs.get(tabId)
      expect(tab?.showDiff).toBe(true)
    })
  })
})
