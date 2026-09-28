import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useEditorStore, selectTabs, selectActiveTabId } from '@/stores/editorStore'
import { useFileStore, selectRecentFiles } from '@/stores/fileStore'
import FileListItem from './FileListItem'
import { useFileOperations } from '@/hooks/useFileOperations'

export default function FileList() {
  const tabs = useEditorStore(selectTabs)
  const activeTabId = useEditorStore(selectActiveTabId)
  const setActiveTab = useEditorStore((state) => state.setActiveTab)
  const closeAllTabs = useEditorStore((state) => state.closeAllTabs)
  const recentFiles = useFileStore(selectRecentFiles)
  const clearRecentFiles = useFileStore((state) => state.clearRecentFiles)
  const removeRecentFile = useFileStore((state) => state.removeRecentFile)
  const { saveTab, openFilePath } = useFileOperations()

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const tabList = useMemo(() => {
    return Array.from(tabs.values()).reverse()
  }, [tabs])

  const closedRecentFiles = useMemo(() => {
    const openPaths = new Set(tabList.flatMap((tab) => tab.filePath ? [tab.filePath] : []))
    return recentFiles.filter((file) => !openPaths.has(file.path))
  }, [recentFiles, tabList])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const handleClearHistory = useCallback(async () => {
    const dirtyTabs = Array.from(useEditorStore.getState().tabs.values()).filter((tab) => tab.isDirty)
    if (dirtyTabs.length > 0) {
      const action = await window.electron.file.confirmClose('all open files')
      if (action === 'cancel') return
      if (action === 'save') {
        for (const tab of dirtyTabs) {
          if (!(await saveTab(tab.tabId))) return
        }
      }
    }
    closeAllTabs()
    await window.electron?.drafts?.clearAll()
    setContextMenu(null)
  }, [closeAllTabs, saveTab])

  useEffect(() => {
    if (!contextMenu) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [contextMenu])

  return (
    <>
      <div 
        className="flex-1 overflow-y-auto py-1"
        onContextMenu={handleContextMenu}
      >
        {tabList.length === 0 ? (
          <div className="px-4 py-5 text-text-secondary-light dark:text-text-secondary-dark text-sm">
            No files open
          </div>
        ) : (
          tabList.map((tab) => (
            <FileListItem
              key={tab.tabId}
              tab={tab}
              isActive={tab.tabId === activeTabId}
              onClick={() => setActiveTab(tab.tabId)}
            />
          ))
        )}

        {closedRecentFiles.length > 0 && (
          <section className="mt-3 border-t border-gray-200 dark:border-gray-700" aria-label="Recent files">
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-xs font-medium uppercase tracking-wide text-text-secondary-light dark:text-text-secondary-dark">
                Recent
              </span>
              <button
                type="button"
                onClick={clearRecentFiles}
                className="text-xs text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark"
              >
                Clear
              </button>
            </div>
            {closedRecentFiles.map((file) => (
              <button
                type="button"
                key={file.path}
                title={file.path}
                className="block w-full truncate px-4 py-2 text-left text-sm text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={async () => {
                  if (!(await openFilePath(file.path))) removeRecentFile(file.path)
                }}
              >
                {file.name}
              </button>
            ))}
          </section>
        )}
      </div>

      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={handleClearHistory}
            className="w-full px-4 py-2 text-left text-sm text-text-primary-light dark:text-text-primary-dark hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Close All Open Files
          </button>
        </div>
      )}
    </>
  )
}
