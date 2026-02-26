import { useRef, useMemo } from 'react'
import { useViewStore, selectSplitRatio } from '@/stores/viewStore'
import { ScrollSyncProvider } from '@/contexts/ScrollSyncContext'
import Divider from './Divider'

interface SplitViewProps {
  leftPanel: React.ReactNode
  rightPanel: React.ReactNode
}

const MIN_PANEL_WIDTH = 280

export default function SplitView({ leftPanel, rightPanel }: SplitViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const splitRatio = useViewStore(selectSplitRatio)

  const { leftWidth, rightWidth } = useMemo(() => {
    const left = `${splitRatio * 100}%`
    const right = `${(1 - splitRatio) * 100}%`
    return { leftWidth: left, rightWidth: right }
  }, [splitRatio])

  return (
    <ScrollSyncProvider>
      <div
        ref={containerRef}
        className="flex h-full"
      >
        <div
          className="h-full overflow-hidden bg-editor-light dark:bg-editor-dark"
          style={{
            width: leftWidth,
            minWidth: `${MIN_PANEL_WIDTH}px`,
          }}
        >
          {leftPanel}
        </div>

        <Divider containerRef={containerRef} />

        <div
          className="h-full overflow-hidden bg-preview-light dark:bg-preview-dark"
          style={{
            width: rightWidth,
            minWidth: `${MIN_PANEL_WIDTH}px`,
          }}
        >
          {rightPanel}
        </div>
      </div>
    </ScrollSyncProvider>
  )
}
