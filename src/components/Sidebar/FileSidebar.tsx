import { useViewStore, selectSidebarOpen, selectActiveView } from '@/stores/viewStore'
import SidebarHeader from './SidebarHeader'
import FileList from './FileList'

export default function FileSidebar() {
  const sidebarOpen = useViewStore(selectSidebarOpen)
  const activeView = useViewStore(selectActiveView)

  if (activeView === 'render') {
    return null
  }

  return (
    <div
      className={`
        fixed top-[44px] left-0 h-[calc(100vh-44px)] z-20
        bg-[#F8F8F8] dark:bg-[#181818]
        border-r border-gray-200 dark:border-gray-700
        flex flex-col
        transform transition-transform
        ${sidebarOpen
          ? 'translate-x-0 duration-200 ease-out'
          : '-translate-x-full duration-150 ease-in'
        }
      `}
      style={{ width: '240px' }}
      aria-hidden={!sidebarOpen}
    >
      <SidebarHeader />
      <FileList />
    </div>
  )
}
