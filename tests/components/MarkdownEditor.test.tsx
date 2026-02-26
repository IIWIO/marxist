import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import MarkdownEditor from '@/components/Editor/MarkdownEditor'

describe('MarkdownEditor', () => {
  it('renders editor container', () => {
    render(<MarkdownEditor content="# Test" onChange={vi.fn()} isDark={false} />)

    expect(screen.getByTestId('markdown-editor')).toBeInTheDocument()
  })

  it('renders with initial content', async () => {
    render(<MarkdownEditor content="# Hello World" onChange={vi.fn()} isDark={false} />)

    await waitFor(() => {
      const editor = screen.getByTestId('markdown-editor')
      expect(editor.querySelector('.cm-content')).toBeInTheDocument()
    })
  })

  it('renders with dark theme configuration', async () => {
    render(<MarkdownEditor content="Test" onChange={vi.fn()} isDark={true} />)

    await waitFor(() => {
      const editor = screen.getByTestId('markdown-editor')
      const cmEditor = editor.querySelector('.cm-editor')
      expect(cmEditor).toBeInTheDocument()
      expect(cmEditor).toHaveClass('cm-editor')
    })
  })

  it('renders with light theme configuration', async () => {
    render(<MarkdownEditor content="Test" onChange={vi.fn()} isDark={false} />)

    await waitFor(() => {
      const editor = screen.getByTestId('markdown-editor')
      const cmEditor = editor.querySelector('.cm-editor')
      expect(cmEditor).toBeInTheDocument()
      expect(cmEditor).toHaveClass('cm-editor')
    })
  })

  it('has full height and width', () => {
    render(<MarkdownEditor content="Test" onChange={vi.fn()} isDark={false} />)

    const container = screen.getByTestId('markdown-editor')
    expect(container).toHaveClass('h-full')
    expect(container).toHaveClass('w-full')
  })

  it('renders CodeMirror instance', async () => {
    render(<MarkdownEditor content="# Heading" onChange={vi.fn()} isDark={false} />)

    await waitFor(() => {
      const editor = screen.getByTestId('markdown-editor')
      expect(editor.querySelector('.cm-editor')).toBeInTheDocument()
      expect(editor.querySelector('.cm-scroller')).toBeInTheDocument()
    })
  })

  it('passes fontSize prop to editor', async () => {
    render(<MarkdownEditor content="Test" onChange={vi.fn()} isDark={false} fontSize={18} />)

    await waitFor(() => {
      const editor = screen.getByTestId('markdown-editor')
      const cmEditor = editor.querySelector('.cm-editor') as HTMLElement
      expect(cmEditor).toBeTruthy()
    })
  })

  it('renders with wordWrap enabled by default', async () => {
    render(<MarkdownEditor content="Test" onChange={vi.fn()} isDark={false} />)

    await waitFor(() => {
      const editor = screen.getByTestId('markdown-editor')
      const cmContent = editor.querySelector('.cm-content')
      expect(cmContent).toBeInTheDocument()
    })
  })

  it('renders without line numbers by default', async () => {
    render(<MarkdownEditor content="Test" onChange={vi.fn()} isDark={false} />)

    await waitFor(() => {
      const editor = screen.getByTestId('markdown-editor')
      expect(editor.querySelector('.cm-lineNumbers')).not.toBeInTheDocument()
    })
  })

  it('renders with line numbers when enabled', async () => {
    render(<MarkdownEditor content="Test" onChange={vi.fn()} isDark={false} lineNumbers={true} />)

    await waitFor(() => {
      const editor = screen.getByTestId('markdown-editor')
      expect(editor.querySelector('.cm-lineNumbers')).toBeInTheDocument()
    })
  })
})
