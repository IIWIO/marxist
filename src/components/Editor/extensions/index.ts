import { EditorState, Extension } from '@codemirror/state'
import {
  EditorView,
  lineNumbers,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
} from '@codemirror/view'
import { history } from '@codemirror/commands'
import { search, highlightSelectionMatches } from '@codemirror/search'
import { bracketMatching } from '@codemirror/language'
import { markdownExtension } from './markdown'
import { allKeymaps } from './keybindings'
import { listMarkerHighlight } from './listMarkerHighlight'
import { createEditorTheme, lightSyntaxHighlighting, darkSyntaxHighlighting } from '../themes'

export interface ExtensionConfig {
  isDark: boolean
  fontSize: number
  showLineNumbers: boolean
  wordWrap: boolean
  readOnly?: boolean
  onUpdate?: (content: string) => void
}

export function createExtensions(config: ExtensionConfig): Extension[] {
  const extensions: Extension[] = [
    history(),
    drawSelection(),
    bracketMatching(),
    highlightSelectionMatches(),
    highlightActiveLine(),

    markdownExtension,

    ...allKeymaps,

    search({
      top: true,
    }),

    createEditorTheme(config.isDark, config.fontSize),

    config.isDark ? darkSyntaxHighlighting : lightSyntaxHighlighting,

    listMarkerHighlight(config.isDark),
  ]

  if (config.showLineNumbers) {
    extensions.push(lineNumbers())
    extensions.push(highlightActiveLineGutter())
  }

  if (config.wordWrap) {
    extensions.push(EditorView.lineWrapping)
  }

  if (config.readOnly) {
    extensions.push(EditorState.readOnly.of(true))
  }

  if (config.onUpdate) {
    extensions.push(
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          config.onUpdate!(update.state.doc.toString())
        }
      })
    )
  }

  return extensions
}
