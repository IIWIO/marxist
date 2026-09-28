import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useEditorStore } from '@/stores/editorStore'
import { mockElectronAPI } from '../setup'
import type { DraftSnapshot } from '@/types/ipc'

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    useEditorStore.setState({ tabs: new Map(), activeTabId: null, untitledCounter: 0 })
    mockElectronAPI.drafts.saveSnapshot.mockResolvedValue({ ok: true, value: undefined })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('invsaves only dirty or untitled recovery content after the initial delay', async () => {
    useEditorStore.getState().createTab('/path/clean.md', 'clean')
    const dirty = useEditorStore.getState().createTab('/path/dirty.md', 'saved')
    useEditorStore.getState().updateTabContent(dirty, 'changedd')
    useEditorStore.getState().createTab(null, 'untitled')
    renderHook(() => useAutoSave(true))

    await act(async () => vi.advanceTimersByTimeAsync(5_000))

    expect(mockElectronAPI.drafts.saveSnapshot).toHaveBeenCalledOnce()
    const payload = mockElectronAPI.drafts.saveSnapshot.mock.calls[0][0]
    expect(payload.drafts).toHaveLength(2)
    expect(payload.drafts.map((draft: DraftSnapshot) => draft.content)).toEqual(['changedd', 'untitled'])
    expect(payload.session.tabs).toHaveLength(3)
  })

  it('does not schedule saves when disabled', async () => {
    renderHook(() => useAutoSave(false))
    await act(async () => vi.advanceTimersByTimeAsync(35_000))
    expect(mockElectronAPI.drafts.saveSnapshot).not.toHaveBeenCalled()
  })
})
