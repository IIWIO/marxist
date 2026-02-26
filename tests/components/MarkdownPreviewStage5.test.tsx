import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import MarkdownPreview from '@/components/Preview/MarkdownPreview'

describe('MarkdownPreview', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  it('renders markdown content', async () => {
    vi.useRealTimers()

    render(<MarkdownPreview content="# Hello" isDark={false} />)

    await waitFor(
      () => {
        const preview = screen.getByTestId('markdown-preview')
        expect(preview.querySelector('h1')).toBeInTheDocument()
      },
      { timeout: 500 }
    )
  })

  it('applies markdown-body class (RN-02)', async () => {
    vi.useRealTimers()

    render(<MarkdownPreview content="Test" isDark={false} />)

    await waitFor(() => {
      expect(screen.getByTestId('markdown-preview')).toHaveClass('markdown-body')
    })
  })

  it('renders tables correctly (RN-03)', async () => {
    vi.useRealTimers()

    const tableMarkdown = `
| A | B |
|---|---|
| 1 | 2 |
`
    render(<MarkdownPreview content={tableMarkdown} isDark={false} />)

    await waitFor(
      () => {
        const preview = screen.getByTestId('markdown-preview')
        expect(preview.querySelector('table')).toBeInTheDocument()
      },
      { timeout: 500 }
    )
  })

  it('renders task lists with disabled checkboxes', async () => {
    vi.useRealTimers()

    const taskListMarkdown = `- [x] Done
- [ ] Todo`

    render(<MarkdownPreview content={taskListMarkdown} isDark={false} />)

    await waitFor(
      () => {
        const checkboxes = screen.getByTestId('markdown-preview').querySelectorAll('input[type="checkbox"]')
        expect(checkboxes.length).toBeGreaterThanOrEqual(1)
        checkboxes.forEach((checkbox) => {
          expect(checkbox).toBeDisabled()
        })
      },
      { timeout: 500 }
    )
  })

  it('calls onLinkClick for external links (RN-05)', async () => {
    vi.useRealTimers()
    const onLinkClick = vi.fn()

    render(<MarkdownPreview content="[Link](https://example.com)" isDark={false} onLinkClick={onLinkClick} />)

    await waitFor(
      () => {
        const link = screen.getByTestId('markdown-preview').querySelector('a')
        expect(link).toBeInTheDocument()
      },
      { timeout: 500 }
    )

    const link = screen.getByTestId('markdown-preview').querySelector('a')
    fireEvent.click(link!)

    expect(onLinkClick).toHaveBeenCalled()
    const calledUrl = onLinkClick.mock.calls[0][0] as string
    expect(calledUrl.startsWith('https://example.com')).toBe(true)
  })

  it('renders code blocks', async () => {
    vi.useRealTimers()

    const codeMarkdown = '```js\nconst x = 1;\n```'

    render(<MarkdownPreview content={codeMarkdown} isDark={false} />)

    await waitFor(
      () => {
        const codeBlock = screen.getByTestId('markdown-preview').querySelector('pre code')
        expect(codeBlock).toBeInTheDocument()
      },
      { timeout: 500 }
    )
  })

  it('applies custom font size', async () => {
    vi.useRealTimers()

    render(<MarkdownPreview content="Test" isDark={false} fontSize={18} />)

    await waitFor(() => {
      const preview = screen.getByTestId('markdown-preview')
      expect(preview).toHaveStyle({ fontSize: '18px' })
    })
  })
})
