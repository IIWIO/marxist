import { useState, useRef, useEffect } from 'react'
import Icon from '@/components/common/Icon'
import type { FormattingCommandName } from '@/components/Editor/extensions/formatting'

interface OverflowItem {
  id: FormattingCommandName
  icon?: string
  label: string
  isHeading?: boolean
  headingLevel?: 1 | 2 | 3 | 4
}

interface OverflowMenuProps {
  items: OverflowItem[]
  onAction: (action: FormattingCommandName) => void
  disabled?: boolean
}

export default function OverflowMenu({ items, onAction, disabled }: OverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleItemClick = (action: FormattingCommandName) => {
    onAction(action)
    setIsOpen(false)
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        aria-label="More formatting options"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={`
          flex items-center justify-center w-6 h-6
          transition-colors duration-150
          ${disabled ? 'opacity-30 cursor-not-allowed' : ''}
        `}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <Icon name="more_horiz" size={20} />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="
            absolute right-0 top-full mt-1 z-50
            min-w-[180px] py-1
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            rounded-lg shadow-lg
          "
        >
          {items.map((item) => (
            <button
              key={item.id}
              role="menuitem"
              onClick={() => handleItemClick(item.id)}
              className="
                w-full flex items-center gap-3 px-3 py-2
                text-sm font-sans text-left
                text-text-primary-light dark:text-text-primary-dark
                hover:bg-gray-100 dark:hover:bg-gray-700
                transition-colors duration-150
              "
            >
              {item.isHeading ? (
                <Icon name={`format_h${item.headingLevel}`} size={20} />
              ) : (
                <Icon name={item.icon!} size={20} />
              )}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
