import { useCallback } from 'react'
import type { EditorRef } from '@/types/editor'
import { formattingCommands, FormattingCommandName } from '@/components/Editor/extensions/formatting'

export function useFormattingAction(editorRef: React.RefObject<EditorRef | null>) {
  const executeAction = useCallback(
    (action: FormattingCommandName) => {
      const editor = editorRef.current
      if (!editor?.view) return

      const command = formattingCommands[action]
      if (command) {
        command({
          state: editor.view.state,
          dispatch: editor.view.dispatch,
        })
        editor.focus()
      }
    },
    [editorRef]
  )

  return executeAction
}
