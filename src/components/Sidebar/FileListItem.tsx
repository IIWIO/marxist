import { memo } from 'react'
import Icon from '@/components/common/Icon'
import { useEditorStore } from '@/stores/editorStore'
import type { TabState } from '@/types/files'

interface FileListItemProps {
  tab: TabState
  isActive: boolean
  onClick: () => void
}

function FileListItem({ tab, isActive, onClick }: FileListItemProps) {
  const closeTab = useEditorStore((s) => s.closeTab)

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    closeTab(tab.tabId)
  }

  return (
    <div
      onClick={onClick}
      className={`
        group w-full flex items-center justify-between px-4 h-9
        text-left transition-colors duration-150 cursor-pointer
        ${isActive
          ? 'bg-accent/10 dark:bg-accent-dark/10 border-l-2 border-accent dark:border-accent-dark'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 border-l-2 border-transparent'
        }
      `}
      title={tab.filePath || tab.fileName}
    >
      <span
        className={`
          font-sans text-sm truncate mr-2
          ${isActive
            ? 'font-medium text-text-primary-light dark:text-text-primary-dark'
            : 'text-text-secondary-light dark:text-text-secondary-dark'
          }
        `}
      >
        {tab.fileName}
      </span>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={`
            w-1.5 h-1.5 rounded-full
            ${tab.isDirty
              ? 'bg-[#F44336]/60 dark:bg-[#EF5350]/50'
              : 'bg-[#4CAF50]/60 dark:bg-[#66BB6A]/50'
            }
          `}
          aria-label={tab.isDirty ? 'Unsaved changes' : 'Saved'}
        />

        <button
          onClick={handleClose}
          className="p-1 transition-opacity hover:opacity-100 opacity-0 group-hover:opacity-100"
          aria-label="Close file"
        >
          <Icon name="close" size={22} className="brightness-50 hover:brightness-200" />
        </button>
      </div>
    </div>
  )
}

export default memo(FileListItem)
