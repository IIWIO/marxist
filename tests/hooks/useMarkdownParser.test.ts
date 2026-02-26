import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useMarkdownParser } from '@/hooks/useMarkdownParser'

describe('useMarkdownParser', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty HTML for empty content', async () => {
    const { result } = renderHook(() => useMarkdownParser(''))

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.html).toBe('')
  })

  it('returns empty HTML for whitespace-only content', async () => {
    const { result } = renderHook(() => useMarkdownParser('   '))

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.html).toBe('')
  })

  it('parses markdown after debounce (SV-09)', async () => {
    vi.useRealTimers()

    const { result, rerender } = renderHook(({ content }) => useMarkdownParser(content, { debounceMs: 50 }), {
      initialProps: { content: '' },
    })

    rerender({ content: '# Hello' })

    expect(result.current.html).toBe('')

    await waitFor(
      () => {
        expect(result.current.html).toContain('<h1>')
      },
      { timeout: 200 }
    )
  })

  it('handles rapid content changes without race conditions', async () => {
    vi.useRealTimers()

    const { result, rerender } = renderHook(({ content }) => useMarkdownParser(content, { debounceMs: 50 }), {
      initialProps: { content: 'First' },
    })

    rerender({ content: 'Second' })
    rerender({ content: 'Third' })
    rerender({ content: 'Final' })

    await waitFor(
      () => {
        expect(result.current.html).toContain('Final')
        expect(result.current.html).not.toContain('First')
        expect(result.current.html).not.toContain('Second')
        expect(result.current.html).not.toContain('Third')
      },
      { timeout: 300 }
    )
  })

  it('sets error state on invalid markdown processing', async () => {
    vi.useRealTimers()

    const { result } = renderHook(() => useMarkdownParser('# Valid Content'))

    await waitFor(() => {
      expect(result.current.error).toBeNull()
    })
  })
})
