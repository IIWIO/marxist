import { useCallback } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { useFileStore } from '@/stores/fileStore'
import type { OpenFileResult, SaveFileResult } from '@/types/files'

export function useFileOperations() {
  const createTab = useEditorStore((state) => state.createTab)
  const setActiveTab = useEditorStore((state) => state.setActiveTab)
  const getActiveTab = useEditorStore((state) => state.getActiveTab)
  const getTabByPath = useEditorStore((state) => state.getTabByPath)
  const markTabSaved = useEditorStore((state) => state.markTabSaved)
  const addRecentFile = useFileStore((state) => state.addRecentFile)

  const createNewFile = useCallback(() => {
    const tabId = createTab(null, '')
    return tabId
  }, [createTab])

  const openFile = useCallback(async (): Promise<string | null> => {
    try {
      const result: OpenFileResult = await window.electron.file.open()

      if (!result.path) return null

      const existingTab = getTabByPath(result.path)
      if (existingTab) {
        setActiveTab(existingTab.tabId)
        return existingTab.tabId
      }

      const tabId = createTab(result.path, result.content)

      addRecentFile(result.path, result.name)

      return tabId
    } catch (error) {
      console.error('Failed to open file:', error)
      return null
    }
  }, [createTab, setActiveTab, getTabByPath, addRecentFile])

  const openFilePath = useCallback(async (filePath: string): Promise<string | null> => {
    try {
      const existingTab = getTabByPath(filePath)
      if (existingTab) {
        setActiveTab(existingTab.tabId)
        return existingTab.tabId
      }

      const result: OpenFileResult = await window.electron.file.drop(filePath)

      if (!result.path) return null

      const tabId = createTab(result.path, result.content)
      addRecentFile(result.path, result.name)

      return tabId
    } catch (error) {
      console.error('Failed to open file path:', error)
      return null
    }
  }, [createTab, setActiveTab, getTabByPath, addRecentFile])

  const saveFile = useCallback(async (): Promise<boolean> => {
    const activeTab = getActiveTab()
    if (!activeTab) return false

    try {
      if (activeTab.filePath) {
        const result: SaveFileResult = await window.electron.file.save(
          activeTab.filePath,
          activeTab.content
        )

        if (result.success) {
          markTabSaved(activeTab.tabId)
          await window.electron.drafts.clear(activeTab.tabId)
          return true
        }

        console.error('Save failed:', result.error)
        return false
      } else {
        return await saveFileAs()
      }
    } catch (error) {
      console.error('Failed to save file:', error)
      return false
    }
  }, [getActiveTab, markTabSaved])

  const saveFileAs = useCallback(async (): Promise<boolean> => {
    const activeTab = getActiveTab()
    if (!activeTab) return false

    try {
      const result = await window.electron.file.saveAs(activeTab.content)

      if (result.path) {
        const fileName = result.name || result.path.split('/').pop() || 'Untitled'
        markTabSaved(activeTab.tabId, result.path, fileName)
        addRecentFile(result.path, fileName)
        await window.electron.drafts.clear(activeTab.tabId)
        return true
      }

      return false
    } catch (error) {
      console.error('Failed to save file as:', error)
      return false
    }
  }, [getActiveTab, markTabSaved, addRecentFile])

  return {
    createNewFile,
    openFile,
    openFilePath,
    saveFile,
    saveFileAs,
  }
}
