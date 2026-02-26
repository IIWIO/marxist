import Icon from '@/components/common/Icon'
import { useViewStore } from '@/stores/viewStore'

export default function SidebarHeader() {
  const toggleSidebar = useViewStore((state) => state.toggleSidebar)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <span className="font-sans font-medium text-sm text-text-primary-light dark:text-text-primary-dark">
        Recent Files
      </span>

      <button
        onClick={toggleSidebar}
        className="
          p-1 rounded
          text-text-secondary-light dark:text-text-secondary-dark
          hover:text-text-primary-light dark:hover:text-text-primary-dark
          hover:bg-gray-100 dark:hover:bg-gray-700
          transition-colors duration-150
        "
        aria-label="Close sidebar"
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  )
}
