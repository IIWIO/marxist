import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '@/hooks/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 100))
    expect(result.current).toBe('initial')
  })

  it('updates value after delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 100), {
      initialProps: { value: 'initial' },
    })

    rerender({ value: 'updated' })
    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current).toBe('updated')
  })

  it('resets timer on rapid changes', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 100), {
      initialProps: { value: 'first' },
    })

    rerender({ value: 'second' })
    act(() => {
      vi.advanceTimersByTime(50)
    })

    rerender({ value: 'third' })
    act(() => {
      vi.advanceTimersByTime(50)
    })

    expect(result.current).toBe('first')

    act(() => {
      vi.advanceTimersByTime(50)
    })

    expect(result.current).toBe('third')
  })

  it('works with different types', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 100), {
      initialProps: { value: 42 },
    })

    rerender({ value: 100 })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current).toBe(100)
  })
})
