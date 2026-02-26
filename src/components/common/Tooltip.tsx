import { useState, useRef, ReactNode } from 'react'

interface TooltipProps {
  content: string
  children: ReactNode
  position?: 'top' | 'bottom'
  delay?: number
}

export default function Tooltip({ content, children, position = 'bottom', delay = 500 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  return (
    <div className="relative inline-flex" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {isVisible && (
        <div
          className={`
            absolute z-50 px-2 py-1 text-xs font-sans whitespace-nowrap
            bg-gray-900 dark:bg-gray-700 text-white rounded shadow-lg
            ${position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'}
            left-1/2 -translate-x-1/2
          `}
          role="tooltip"
        >
          {content}
          <div
            className={`
              absolute left-1/2 -translate-x-1/2 w-0 h-0
              border-x-4 border-x-transparent
              ${
                position === 'top'
                  ? 'top-full border-t-4 border-t-gray-900 dark:border-t-gray-700'
                  : 'bottom-full border-b-4 border-b-gray-900 dark:border-b-gray-700'
              }
            `}
          />
        </div>
      )}
    </div>
  )
}
