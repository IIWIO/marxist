import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useFileStore } from '@/stores/fileStore'

describe('fileStore', () => {
  beforeEach(() => {
    useFileStore.setState({ recentFiles: [] })

    vi.stubGlobal('window', {
      electron: {
        settings: {
          set: vi.fn(),
        },
      },
    })
  })

  describe('addRecentFile', () => {
    it('adds file to the beginning of recent files', () => {
      useFileStore.getState().addRecentFile('/path/file1.md', 'file1.md')

      const recentFiles = useFileStore.getState().recentFiles
      expect(recentFiles.length).toBe(1)
      expect(recentFiles[0].path).toBe('/path/file1.md')
      expect(recentFiles[0].name).toBe('file1.md')
    })

    it('moves existing file to the top', () => {
      useFileStore.getState().addRecentFile('/path/file1.md', 'file1.md')
      useFileStore.getState().addRecentFile('/path/file2.md', 'file2.md')
      useFileStore.getState().addRecentFile('/path/file1.md', 'file1.md')

      const recentFiles = useFileStore.getState().recentFiles
      expect(recentFiles.length).toBe(2)
      expect(recentFiles[0].path).toBe('/path/file1.md')
      expect(recentFiles[1].path).toBe('/path/file2.md')
    })

    it('limits to 20 recent files', () => {
      for (let i = 0; i < 25; i++) {
        useFileStore.getState().addRecentFile(`/path/file${i}.md`, `file${i}.md`)
      }

      expect(useFileStore.getState().recentFiles.length).toBe(20)
    })

    it('persists to settings', () => {
      useFileStore.getState().addRecentFile('/path/file.md', 'file.md')

      expect(window.electron.settings.set).toHaveBeenCalledWith(
        'recentFiles',
        expect.arrayContaining([
          expect.objectContaining({ path: '/path/file.md' }),
        ])
      )
    })

    it('includes lastOpened timestamp', () => {
      useFileStore.getState().addRecentFile('/path/file.md', 'file.md')

      const recentFiles = useFileStore.getState().recentFiles
      expect(recentFiles[0].lastOpened).toBeDefined()
      expect(new Date(recentFiles[0].lastOpened).getTime()).not.toBeNaN()
    })
  })

  describe('removeRecentFile', () => {
    it('removes file from recent files', () => {
      useFileStore.getState().addRecentFile('/path/file1.md', 'file1.md')
      useFileStore.getState().addRecentFile('/path/file2.md', 'file2.md')

      useFileStore.getState().removeRecentFile('/path/file1.md')

      const recentFiles = useFileStore.getState().recentFiles
      expect(recentFiles.length).toBe(1)
      expect(recentFiles[0].path).toBe('/path/file2.md')
    })

    it('does nothing for non-existent file', () => {
      useFileStore.getState().addRecentFile('/path/file.md', 'file.md')
      useFileStore.getState().removeRecentFile('/nonexistent.md')

      expect(useFileStore.getState().recentFiles.length).toBe(1)
    })
  })

  describe('clearRecentFiles', () => {
    it('clears all recent files', () => {
      useFileStore.getState().addRecentFile('/path/file1.md', 'file1.md')
      useFileStore.getState().addRecentFile('/path/file2.md', 'file2.md')

      useFileStore.getState().clearRecentFiles()

      expect(useFileStore.getState().recentFiles.length).toBe(0)
    })
  })

  describe('loadRecentFiles', () => {
    it('loads recent files from array', () => {
      const files = [
        { path: '/path/file1.md', name: 'file1.md', lastOpened: new Date().toISOString() },
        { path: '/path/file2.md', name: 'file2.md', lastOpened: new Date().toISOString() },
      ]

      useFileStore.getState().loadRecentFiles(files)

      expect(useFileStore.getState().recentFiles.length).toBe(2)
      expect(useFileStore.getState().recentFiles[0].path).toBe('/path/file1.md')
    })

    it('truncates to 20 files', () => {
      const files = Array.from({ length: 25 }, (_, i) => ({
        path: `/path/file${i}.md`,
        name: `file${i}.md`,
        lastOpened: new Date().toISOString(),
      }))

      useFileStore.getState().loadRecentFiles(files)

      expect(useFileStore.getState().recentFiles.length).toBe(20)
    })
  })
})
