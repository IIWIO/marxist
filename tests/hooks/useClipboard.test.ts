import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useClipboard } from '@/hooks/useClipboard'

Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
})

describe('useClipboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('copies text to clipboard', async () => {
    const { result } = renderHook(() => useClipboard())

    await act(async () => {
      await result.current.copy('test text')
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text')
  })

  it('sets copied to true after copying', async () => {
    const { result } = renderHook(() => useClipboard())

    expect(result.current.copied).toBe(false)

    await act(async () => {
      await result.current.copy('test')
    })

    expect(result.current.copied).toBe(true)
  })

  it('resets copied after delay', async () => {
    const { result } = renderHook(() => useClipboard(1000))

    await act(async () => {
      await result.current.copy('test')
    })

    expect(result.current.copied).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.copied).toBe(false)
  })

  it('returns true on success', async () => {
    const { result } = renderHook(() => useClipboard())

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.copy('test')
    })

    expect(success).toBe(true)
  })

  it('returns false on failure', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('Failed'))

    const { result } = renderHook(() => useClipboard())

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.copy('test')
    })

    expect(success).toBe(false)
  })
})
