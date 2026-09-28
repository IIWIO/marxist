import { useCallback } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { useFileStore } from '@/stores/fileStore'

async function showOperationError(operation: string, error: string): Promise<void> {
  await window.electron.file.showError(
    `${operation} Failed`,
    `Marxist could not ${operation.toLowerCase()} the file.`,
    error
  )
}

export function useFileOperations() {
  const createTab = useEditorStore((state) => state.createTab)
  const setActiveTab = useEditorStore((state) => state.setActiveTab)
  const getTabByPath = useEditorStore((state) => state.getTabByPath)
  const markTabSaved = useEditorStore((state) => state.markTabSaved)
  const addRecentFile = useFileStore((state) => state.addRecentFile)

  const createNewFile = useCallback(() => createTab(null, ''), [createTab])

  const openFilePath = useCallback(async (path: string): Promise<string | null> => {
    const existing = getTabByPath(path)
    if (existing) {
      setActiveTab(existing.tabId)
      return existing.tabId
    }
    const result = await window.electron.file.drop(path)
    if (!result.ok) {
      await showOperationError('Open', result.error)
      return null
    }
    const tabId = createTab(result.value.path, result.value.content)
    addRecentFile(result.value.path, result.value.name)
    return tabId
  }, [addRecentFile, createTab, getTabByPath, setActiveTab])

  const openFile = useCallback(async (): Promise<string | null> => {
    const result = await window.electron.file.open()
    if (!result.ok) {
      await showOperationError('Open', result.error)
      return null
    }
    if (!result.value.path) return null
    const existing = getTabByPath(result.value.path)
    if (existing) {
      setActiveTab(existing.tabId)
      return existing.tabId
    }
    const tabId = createTab(result.value.path, result.value.content)
    addRecentFile(result.value.path, result.value.name)
    return tabId
  }, [addRecentFile, createTab, getTabByPath, setActiveTab])

  const saveTabAs = useCallback(async (tabId: string): Promise<boolean> => {
    const tab = useEditorStore.getState().tabs.get(tabId)
    if (!tab) return false
    const result = await window.electron.file.saveAs(tab.content)
    if (!result.ok) {
      await showOperationError('Save', result.error)
      return false
    }
    if (!result.value.path) return false
    const fileName = result.value.name || result.value.path.split('/').pop() || 'Untitled'
    markTabSaved(tabId, result.value.path, fileName)
    addRecentFile(result.value.path, fileName)
    await window.electron.drafts.clear(tabId)
    return true
  }, [addRecentFile, markTabSaved])

  const saveTab = useCallback(async (tabId: string): Promise<boolean> => {
    const tab = useEditorStore.getState().tabs.get(tabId)
    if (!tab) return false
    if (!tab.filePath) return saveTabAs(tabId)
    const result = await window.electron.file.save(tab.filePath, tab.content)
    if (!result.ok) {
      await showOperationError('Save', result.error)
      return false
    }
    markTabSaved(tabId)
    await window.electron.drafts.clear(tabId)
    return true
  }, [markTabSaved, saveTabAs])

  const saveFile = useCallback(async () => {
    const tabId = useEditorStore.getState().activeTabId
    return tabId ? saveTab(tabId) : false
  }, [saveTab])

  const saveFileAs = useCallback(async () => {
    const tabId = useEditorStore.getState().activeTabId
    return tabId ? saveTabAs(tabId) : false
  }, [saveTabAs])

  return { createNewFile, openFile, openFilePath, saveFile, saveFileAs, saveTab }
}
