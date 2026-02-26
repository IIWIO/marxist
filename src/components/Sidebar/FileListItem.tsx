import { memo } from 'react'
import type { TabState } from '@/types/files'

interface FileListItemProps {
  tab: TabState
  isActive: boolean
  onClick: () => void
}

function FileListItem({ tab, isActive, onClick }: FileListItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center justify-between px-4 h-9
        text-left transition-colors duration-150
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

      <span
        className={`
          flex-shrink-0 w-1.5 h-1.5 rounded-full
          ${tab.isDirty
            ? 'bg-[#F44336]/60 dark:bg-[#EF5350]/50'
            : 'bg-[#4CAF50]/60 dark:bg-[#66BB6A]/50'
          }
        `}
        aria-label={tab.isDirty ? 'Unsaved changes' : 'Saved'}
      />
    </button>
  )
}

export default memo(FileListItem)
