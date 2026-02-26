import { describe, it, expect, beforeEach } from 'vitest'
import { useViewStore } from '@/stores/viewStore'

describe('viewStore', () => {
  beforeEach(() => {
    useViewStore.setState({
      activeView: 'split',
      previousView: null,
      splitRatio: 0.5,
      sidebarOpen: false,
      aiPanelOpen: false,
      windowWidth: 1200,
      isNarrowWindow: false,
    })
  })

  describe('setActiveView', () => {
    it('changes view to markdown', () => {
      useViewStore.getState().setActiveView('markdown')
      expect(useViewStore.getState().activeView).toBe('markdown')
    })

    it('changes view to render', () => {
      useViewStore.getState().setActiveView('render')
      expect(useViewStore.getState().activeView).toBe('render')
    })

    it('saves previous view', () => {
      useViewStore.getState().setActiveView('markdown')
      expect(useViewStore.getState().previousView).toBe('split')
    })

    it('prevents split view in narrow window (WIN-06)', () => {
      useViewStore.setState({ isNarrowWindow: true, activeView: 'markdown' })
      useViewStore.getState().setActiveView('split')
      expect(useViewStore.getState().activeView).toBe('markdown')
    })
  })

  describe('setSplitRatio', () => {
    it('sets ratio within bounds', () => {
      useViewStore.getState().setSplitRatio(0.7)
      expect(useViewStore.getState().splitRatio).toBe(0.7)
    })

    it('clamps ratio to minimum 20% (SV-06)', () => {
      useViewStore.getState().setSplitRatio(0.1)
      expect(useViewStore.getState().splitRatio).toBe(0.2)
    })

    it('clamps ratio to maximum 80% (SV-06)', () => {
      useViewStore.getState().setSplitRatio(0.95)
      expect(useViewStore.getState().splitRatio).toBe(0.8)
    })
  })

  describe('resetSplitRatio', () => {
    it('resets to 50/50 (SV-07)', () => {
      useViewStore.getState().setSplitRatio(0.7)
      useViewStore.getState().resetSplitRatio()
      expect(useViewStore.getState().splitRatio).toBe(0.5)
    })
  })

  describe('setWindowWidth', () => {
    it('auto-switches from split to markdown when window becomes narrow (WIN-06)', () => {
      useViewStore.setState({ activeView: 'split', windowWidth: 800, isNarrowWindow: false })
      useViewStore.getState().setWindowWidth(500)

      expect(useViewStore.getState().activeView).toBe('markdown')
      expect(useViewStore.getState().previousView).toBe('split')
      expect(useViewStore.getState().isNarrowWindow).toBe(true)
    })

    it('restores split view when window becomes wide enough', () => {
      useViewStore.setState({
        activeView: 'markdown',
        previousView: 'split',
        windowWidth: 500,
        isNarrowWindow: true,
      })
      useViewStore.getState().setWindowWidth(800)

      expect(useViewStore.getState().activeView).toBe('split')
      expect(useViewStore.getState().previousView).toBe(null)
    })

    it('does not auto-switch if already in markdown view', () => {
      useViewStore.setState({ activeView: 'markdown', previousView: null })
      useViewStore.getState().setWindowWidth(500)

      expect(useViewStore.getState().activeView).toBe('markdown')
      expect(useViewStore.getState().previousView).toBe(null)
    })
  })

  describe('toggleSidebar', () => {
    it('toggles sidebar state', () => {
      expect(useViewStore.getState().sidebarOpen).toBe(false)
      useViewStore.getState().toggleSidebar()
      expect(useViewStore.getState().sidebarOpen).toBe(true)
      useViewStore.getState().toggleSidebar()
      expect(useViewStore.getState().sidebarOpen).toBe(false)
    })
  })

  describe('toggleAiPanel', () => {
    it('toggles AI panel state', () => {
      expect(useViewStore.getState().aiPanelOpen).toBe(false)
      useViewStore.getState().toggleAiPanel()
      expect(useViewStore.getState().aiPanelOpen).toBe(true)
    })
  })
})
