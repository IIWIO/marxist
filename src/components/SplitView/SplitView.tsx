import { useRef, useMemo } from 'react'
import { useViewStore, selectSplitRatio, selectAiPanelOpen } from '@/stores/viewStore'
import Divider from './Divider'

interface SplitViewProps {
  leftPanel: React.ReactNode
  rightPanel: React.ReactNode
}

const MIN_PANEL_WIDTH = 280

export default function SplitView({ leftPanel, rightPanel }: SplitViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const splitRatio = useViewStore(selectSplitRatio)
  const aiPanelOpen = useViewStore(selectAiPanelOpen)

  const aiPanelWidth = aiPanelOpen ? 360 : 0

  const { leftWidth, rightWidth } = useMemo(() => {
    const left = `${splitRatio * 100}%`
    const right = `${(1 - splitRatio) * 100}%`
    return { leftWidth: left, rightWidth: right }
  }, [splitRatio])

  return (
    <div
      ref={containerRef}
      className="flex h-full"
      style={{
        paddingRight: aiPanelOpen ? `${aiPanelWidth}px` : 0,
        transition: 'padding-right 200ms ease-out',
      }}
    >
      <div
        className="h-full overflow-hidden bg-editor-light dark:bg-editor-dark"
        style={{
          width: leftWidth,
          minWidth: `${MIN_PANEL_WIDTH}px`,
          transition: aiPanelOpen ? 'none' : undefined,
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
          transition: aiPanelOpen ? 'none' : undefined,
        }}
      >
        {rightPanel}
      </div>
    </div>
  )
}
