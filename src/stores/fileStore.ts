import { create } from 'zustand'
import type { RecentFile } from '@/types/files'

interface FileStoreState {
  recentFiles: RecentFile[]

  addRecentFile: (path: string, name: string) => void
  removeRecentFile: (path: string) => void
  clearRecentFiles: () => void
  loadRecentFiles: (files: RecentFile[]) => void
}

const MAX_RECENT_FILES = 20

export const useFileStore = create<FileStoreState>()((set, get) => ({
  recentFiles: [],

  addRecentFile: (path, name) => {
    const { recentFiles } = get()

    const filtered = recentFiles.filter((f) => f.path !== path)

    const newFile: RecentFile = {
      path,
      name,
      lastOpened: new Date().toISOString(),
    }

    const updated = [newFile, ...filtered].slice(0, MAX_RECENT_FILES)

    set({ recentFiles: updated })

    window.electron?.settings?.set('recentFiles', updated)
  },

  removeRecentFile: (path) => {
    const { recentFiles } = get()
    const updated = recentFiles.filter((f) => f.path !== path)
    set({ recentFiles: updated })
    window.electron?.settings?.set('recentFiles', updated)
  },

  clearRecentFiles: () => {
    set({ recentFiles: [] })
    window.electron?.settings?.set('recentFiles', [])
  },

  loadRecentFiles: (files) => {
    set({ recentFiles: files.slice(0, MAX_RECENT_FILES) })
  },
}))

export const selectRecentFiles = (state: FileStoreState) => state.recentFiles
