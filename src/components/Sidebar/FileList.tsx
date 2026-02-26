import { useMemo } from 'react'
import { useEditorStore, selectTabs, selectActiveTabId } from '@/stores/editorStore'
import FileListItem from './FileListItem'

export default function FileList() {
  const tabs = useEditorStore(selectTabs)
  const activeTabId = useEditorStore(selectActiveTabId)
  const setActiveTab = useEditorStore((state) => state.setActiveTab)

  const tabList = useMemo(() => {
    return Array.from(tabs.values()).reverse()
  }, [tabs])

  if (tabList.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <span className="text-text-secondary-light dark:text-text-secondary-dark text-sm">
          No files open
        </span>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto py-1">
      {tabList.map((tab) => (
        <FileListItem
          key={tab.tabId}
          tab={tab}
          isActive={tab.tabId === activeTabId}
          onClick={() => setActiveTab(tab.tabId)}
        />
      ))}
    </div>
  )
}
