import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from '@/stores/editorStore'
import { useViewStore } from '@/stores/viewStore'

describe('useSessionRestore', () => {
  beforeEach(() => {
    useEditorStore.setState({
      tabs: new Map(),
      activeTabId: null,
      untitledCounter: 0,
      wordCount: 0,
      letterCount: 0,
    })
    useViewStore.setState({
      activeView: 'split',
      splitRatio: 0.5,
      sidebarOpen: false,
      aiPanelOpen: false,
      windowWidth: 1200,
    })
  })

  describe('session restore integration', () => {
    it('editorStore.restoreTab creates tab with correct data', () => {
      const tabId = useEditorStore.getState().restoreTab({
        filePath: '/path/file.md',
        fileName: 'file.md',
        content: '# Hello',
        isDirty: true,
        cursorPosition: 5,
        scrollPosition: 100,
      })

      const tab = useEditorStore.getState().tabs.get(tabId)
      expect(tab).toBeDefined()
      expect(tab?.fileName).toBe('file.md')
      expect(tab?.content).toBe('# Hello')
      expect(tab?.isDirty).toBe(true)
      expect(tab?.cursorPosition).toBe(5)
      expect(tab?.scrollPosition).toBe(100)
    })

    it('editorStore.setUntitledCounter updates counter', () => {
      useEditorStore.getState().setUntitledCounter(5)
      expect(useEditorStore.getState().untitledCounter).toBe(5)
    })

    it('viewStore.setSplitRatio updates ratio', () => {
      useViewStore.getState().setSplitRatio(0.6)
      expect(useViewStore.getState().splitRatio).toBe(0.6)
    })

    it('viewStore.setActiveView updates view', () => {
      useViewStore.getState().setActiveView('markdown')
      expect(useViewStore.getState().activeView).toBe('markdown')
    })
  })

  describe('fallback behavior (SP-05)', () => {
    it('creates untitled tab when tabs are empty', () => {
      const tabId = useEditorStore.getState().createTab(null, '')

      expect(useEditorStore.getState().tabs.size).toBe(1)
      const tab = useEditorStore.getState().tabs.get(tabId)
      expect(tab?.fileName).toBe('Untitled')
    })

    it('sets split view as default', () => {
      useViewStore.getState().setActiveView('split')
      expect(useViewStore.getState().activeView).toBe('split')
    })
  })

  describe('restoring dirty state', () => {
    it('savedContent differs from content when isDirty', () => {
      const tabId = useEditorStore.getState().restoreTab({
        filePath: null,
        fileName: 'Untitled',
        content: 'modified content',
        isDirty: true,
        cursorPosition: 0,
        scrollPosition: 0,
      })

      const tab = useEditorStore.getState().tabs.get(tabId)
      expect(tab?.content).toBe('modified content')
      expect(tab?.savedContent).toBe('')
      expect(tab?.isDirty).toBe(true)
    })

    it('savedContent equals content when not dirty', () => {
      const tabId = useEditorStore.getState().restoreTab({
        filePath: '/path/file.md',
        fileName: 'file.md',
        content: 'saved content',
        isDirty: false,
        cursorPosition: 0,
        scrollPosition: 0,
      })

      const tab = useEditorStore.getState().tabs.get(tabId)
      expect(tab?.content).toBe('saved content')
      expect(tab?.savedContent).toBe('saved content')
      expect(tab?.isDirty).toBe(false)
    })
  })
})
