import { useState, useCallback, useEffect, useRef } from 'react'
import { useViewStore, selectSplitRatio } from '@/stores/viewStore'

interface DividerProps {
  containerRef: React.RefObject<HTMLDivElement | null>
}

export default function Divider({ containerRef }: DividerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const splitRatio = useViewStore(selectSplitRatio)
  const setSplitRatio = useViewStore((state) => state.setSplitRatio)
  const resetSplitRatio = useViewStore((state) => state.resetSplitRatio)
  const lastClickTime = useRef(0)

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return

      const container = containerRef.current
      const rect = container.getBoundingClientRect()
      const newRatio = (e.clientX - rect.left) / rect.width

      setSplitRatio(newRatio)
    },
    [isDragging, containerRef, setSplitRatio]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()

    const now = Date.now()
    if (now - lastClickTime.current < 300) {
      resetSplitRatio()
      lastClickTime.current = 0
      return
    }
    lastClickTime.current = now

    setIsDragging(true)
  }

  const isActive = isDragging || isHovering

  return (
    <div
      className="relative flex items-center justify-center cursor-col-resize"
      style={{ width: '9px', marginLeft: '-4px', marginRight: '-4px' }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={Math.round(splitRatio * 100)}
      aria-valuemin={20}
      aria-valuemax={80}
      aria-label="Resize panels"
    >
      <div
        className={`
          absolute inset-y-0 w-px transition-colors duration-150
          ${isActive ? 'bg-accent dark:bg-accent-dark' : 'bg-gray-200 dark:bg-gray-700'}
        `}
        style={{ left: '4px' }}
      />

      <div
        className={`
          relative z-10 w-1 h-8 rounded-sm transition-colors duration-150
          ${isActive ? 'bg-accent dark:bg-accent-dark' : 'bg-gray-300 dark:bg-gray-600'}
        `}
      />
    </div>
  )
}
