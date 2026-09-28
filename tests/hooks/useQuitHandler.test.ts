import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuitHandler } from '@/hooks/useQuitHandler'
import { mockElectronAPI } from '../setup'
import type { AppEventMap } from '@/types/ipc'

describe('useQuitHandler', () => {
  let quitHandler: ((event: AppEventMap['app:quit-requested']) => void | Promise<void>) | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    quitHandler = undefined
    mockElectronAPI.onAppEvent.mockImplementation((channel, callback) => {
      if (channel === 'app:quit-requested') {
        quitHandler = callback as (event: AppEventMap['app:quit-requested']) => void
      }
      return () => undefined
    })
  })

  it('retries a failed recovery write before allowing quit', async () => {
    mockElectronAPI.app.saveBeforeQuit
      .mockResolvedValueOnce({ ok: false, error: 'disk full' })
      .mockResolvedValueOnce({ ok: true, value: undefined })
    mockElectronAPI.app.confirmQuitFailure.mockResolvedValue('retry')
    renderHook(() => useQuitHandler())

    await act(async () => {
      await quitHandler?.({ reason: 'quit' })
    })

    expect(mockElectronAPI.app.saveBeforeQuit).toHaveBeenCalledTimes(2)
    expect(mockElectronAPI.app.readyToQuit).toHaveBeenCalledWith('quit')
  })

  it('keeps the app open when the user cancels after a save failure', async () => {
    mockElectronAPI.app.saveBeforeQuit.mockResolvedValue({ ok: false, error: 'permission denied' })
    mockElectronAPI.app.confirmQuitFailure.mockResolvedValue('cancel')
    renderHook(() => useQuitHandler())

    await act(async () => {
      await quitHandler?.({ reason: 'update' })
    })

    expect(mockElectronAPI.app.readyToQuit).not.toHaveBeenCalled()
  })
})
