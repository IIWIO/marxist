import ViewToggle from './ViewToggle'
import DocumentName from './DocumentName'
import FormattingToolbar from './FormattingToolbar'
import WordCount from './WordCount'
import { useViewStore, selectActiveView } from '@/stores/viewStore'
import { useFormattingAction } from '@/hooks/useFormattingAction'
import type { EditorRef } from '@/types/editor'

interface TopBarProps {
  documentName: string
  isDirty: boolean
  wordCount: number
  letterCount: number
  windowWidth: number
  editorRef: React.RefObject<EditorRef | null>
}

export default function TopBar({
  documentName,
  isDirty,
  wordCount,
  letterCount,
  windowWidth,
  editorRef,
}: TopBarProps) {
  const activeView = useViewStore(selectActiveView)
  const showFormattingToolbar = activeView !== 'render'
  const executeAction = useFormattingAction(editorRef)

  return (
    <header
      className="h-topbar bg-white dark:bg-topbar-dark border-b border-gray-200 dark:border-gray-700 flex items-center"
      style={
        {
          paddingLeft: '80px',
          paddingRight: '16px',
          WebkitAppRegion: 'drag',
        } as React.CSSProperties
      }
    >
      <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <DocumentName name={documentName} isDirty={isDirty} />
      </div>

      <div className="flex-1 flex justify-center">
        <ViewToggle />
      </div>

      <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div style={{ visibility: showFormattingToolbar ? 'visible' : 'hidden' }}>
          <FormattingToolbar onAction={executeAction} windowWidth={windowWidth} disabled={!showFormattingToolbar} />
        </div>

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

        <WordCount wordCount={wordCount} letterCount={letterCount} />
      </div>
    </header>
  )
}
