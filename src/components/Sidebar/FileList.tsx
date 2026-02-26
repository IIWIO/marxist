import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useEditorStore, selectTabs, selectActiveTabId } from '@/stores/editorStore'
import FileListItem from './FileListItem'

export default function FileList() {
  const tabs = useEditorStore(selectTabs)
  const activeTabId = useEditorStore(selectActiveTabId)
  const setActiveTab = useEditorStore((state) => state.setActiveTab)
  const closeAllTabs = useEditorStore((state) => state.closeAllTabs)

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const tabList = useMemo(() => {
    return Array.from(tabs.values()).reverse()
  }, [tabs])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const handleClearHistory = useCallback(async () => {
    closeAllTabs()
    await window.electron?.drafts?.clearAll()
    setContextMenu(null)
  }, [closeAllTabs])

  const handleCloseMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

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

  if (tabList.length === 0) {
    return (
      <div 
        className="flex-1 flex items-center justify-center p-4"
        onContextMenu={handleContextMenu}
      >
        <span className="text-text-secondary-light dark:text-text-secondary-dark text-sm">
          No files open
        </span>
      </div>
    )
  }

  return (
    <>
      <div 
        className="flex-1 overflow-y-auto py-1"
        onContextMenu={handleContextMenu}
      >
        {tabList.map((tab) => (
          <FileListItem
            key={tab.tabId}
            tab={tab}
            isActive={tab.tabId === activeTabId}
            onClick={() => setActiveTab(tab.tabId)}
          />
        ))}
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
            Clear History
          </button>
        </div>
      )}
    </>
  )
}
