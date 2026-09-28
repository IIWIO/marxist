import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FileSidebar } from '@/components/Sidebar'
import { useViewStore } from '@/stores/viewStore'
import { useEditorStore } from '@/stores/editorStore'
import { useFileStore } from '@/stores/fileStore'

describe('FileSidebar', () => {
  beforeEach(() => {
    useViewStore.setState({ sidebarOpen: true, activeView: 'split' })
    useEditorStore.setState({
      tabs: new Map(),
      activeTabId: null,
      untitledCounter: 0,
      wordCount: 0,
      letterCount: 0,
    })
    useFileStore.setState({ recentFiles: [] })
  })

  it('renders when sidebar is open', () => {
    useEditorStore.getState().createTab(null, 'test')
    render(<FileSidebar />)

    expect(screen.getByText('Open Files')).toBeInTheDocument()
  })

  it('does not render in Render view (FS-13)', () => {
    useViewStore.setState({ activeView: 'render' })
    render(<FileSidebar />)

    expect(screen.queryByText('Open Files')).not.toBeInTheDocument()
  })

  it('renders in Markdown view', () => {
    useViewStore.setState({ activeView: 'markdown' })
    useEditorStore.getState().createTab(null, 'test')
    render(<FileSidebar />)

    expect(screen.getByText('Open Files')).toBeInTheDocument()
  })

  it('renders in Split view', () => {
    useViewStore.setState({ activeView: 'split' })
    useEditorStore.getState().createTab(null, 'test')
    render(<FileSidebar />)

    expect(screen.getByText('Open Files')).toBeInTheDocument()
  })

  it('shows file tabs with names (FS-07)', () => {
    useEditorStore.getState().createTab('/path/readme.md', 'content')
    render(<FileSidebar />)

    expect(screen.getByText('readme.md')).toBeInTheDocument()
  })

  it('shows green dot for saved files (FS-08)', () => {
    const tabId = useEditorStore.getState().createTab('/path/test.md', 'content')
    useEditorStore.getState().markTabSaved(tabId)

    render(<FileSidebar />)

    const dot = screen.getByLabelText('Saved')
    expect(dot).toHaveClass('bg-[#4CAF50]/60')
  })

  it('shows red dot for unsaved files (FS-09)', () => {
    const tabId = useEditorStore.getState().createTab('/path/test.md', 'original')
    useEditorStore.getState().markTabSaved(tabId)
    useEditorStore.getState().updateTabContent(tabId, 'modified')

    render(<FileSidebar />)

    const dot = screen.getByLabelText('Unsaved changes')
    expect(dot).toHaveClass('bg-[#F44336]/60')
  })

  it('highlights active tab (FS-10)', () => {
    useEditorStore.getState().createTab(null, 'tab1')
    useEditorStore.getState().createTab(null, 'tab2')

    render(<FileSidebar />)

    const activeItem = screen.getByText('Untitled 2').closest('[title]')
    expect(activeItem).toHaveClass('bg-accent/10')
  })

  it('switches tabs on click (FS-06)', () => {
    const tabId1 = useEditorStore.getState().createTab(null, 'content1')
    useEditorStore.getState().createTab(null, 'content2')

    render(<FileSidebar />)

    expect(useEditorStore.getState().activeTabId).not.toBe(tabId1)

    fireEvent.click(screen.getByText('Untitled'))

    expect(useEditorStore.getState().activeTabId).toBe(tabId1)
  })

  it('closes sidebar on X click', () => {
    useEditorStore.getState().createTab(null, 'test')
    render(<FileSidebar />)

    fireEvent.click(screen.getByLabelText('Close sidebar'))

    expect(useViewStore.getState().sidebarOpen).toBe(false)
  })

  it('shows "No files open" when empty', () => {
    render(<FileSidebar />)

    expect(screen.getByText('No files open')).toBeInTheDocument()
  })

  it('shows persisted recent files that are not currently open', () => {
    useFileStore.setState({
      recentFiles: [{ path: '/path/recent.md', name: 'recent.md', lastOpened: new Date().toISOString() }],
    })
    render(<FileSidebar />)

    expect(screen.getByRole('region', { name: 'Recent files' })).toBeInTheDocument()
    expect(screen.getByText('recent.md')).toBeInTheDocument()
  })

  it('displays multiple tabs in correct order (most recent first)', () => {
    useEditorStore.getState().createTab('/path/first.md', 'first')
    useEditorStore.getState().createTab('/path/second.md', 'second')
    useEditorStore.getState().createTab('/path/third.md', 'third')

    render(<FileSidebar />)

    const fileItems = screen.getAllByTitle(/\.md$/)
    expect(fileItems[0]).toHaveTextContent('third.md')
    expect(fileItems[1]).toHaveTextContent('second.md')
    expect(fileItems[2]).toHaveTextContent('first.md')
  })

  it('truncates long file names', () => {
    useEditorStore.getState().createTab('/path/very-long-filename-that-should-be-truncated.md', 'content')
    render(<FileSidebar />)

    const fileName = screen.getByText('very-long-filename-that-should-be-truncated.md')
    expect(fileName).toHaveClass('truncate')
  })

  it('shows tooltip with full path on hover', () => {
    useEditorStore.getState().createTab('/path/to/deep/file.md', 'content')
    render(<FileSidebar />)

    const button = screen.getByText('file.md').closest('[title]')
    expect(button).toHaveAttribute('title', '/path/to/deep/file.md')
  })

  it('shows file name as tooltip for untitled files', () => {
    useEditorStore.getState().createTab(null, 'content')
    render(<FileSidebar />)

    const button = screen.getByText('Untitled').closest('[title]')
    expect(button).toHaveAttribute('title', 'Untitled')
  })
})
