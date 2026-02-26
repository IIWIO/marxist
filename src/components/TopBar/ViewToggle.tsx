import { useViewStore, ViewMode, selectActiveView, selectIsNarrowWindow } from '@/stores/viewStore'

const views: { id: ViewMode; label: string }[] = [
  { id: 'markdown', label: 'Markdown' },
  { id: 'split', label: 'Split' },
  { id: 'render', label: 'Render' },
]

export default function ViewToggle() {
  const activeView = useViewStore(selectActiveView)
  const isNarrowWindow = useViewStore(selectIsNarrowWindow)
  const setActiveView = useViewStore((state) => state.setActiveView)

  return (
    <div
      className="relative flex items-center h-7 bg-gray-100 dark:bg-gray-800 rounded-full p-0.5"
      style={{ width: '240px' }}
      role="tablist"
      aria-label="View mode"
    >
      <div
        className="absolute h-6 bg-accent dark:bg-accent-dark rounded-full transition-transform duration-150 ease-out"
        style={{
          width: 'calc((100% - 4px) / 3)',
          transform: `translateX(calc(${views.findIndex((v) => v.id === activeView)} * 100%))`,
        }}
        aria-hidden="true"
      />

      {views.map((view) => {
        const isActive = activeView === view.id
        const isDisabled = view.id === 'split' && isNarrowWindow

        return (
          <button
            key={view.id}
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            onClick={() => setActiveView(view.id)}
            className={`
              relative z-10 flex-1 h-6 flex items-center justify-center
              font-sans font-medium text-xs rounded-full
              transition-colors duration-150
              ${
                isActive
                  ? 'text-white'
                  : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark'
              }
              ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            {view.label}
          </button>
        )
      })}
    </div>
  )
}
