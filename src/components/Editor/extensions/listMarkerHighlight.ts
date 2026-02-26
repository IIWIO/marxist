import { Extension } from '@codemirror/state'
import { ViewPlugin, Decoration, DecorationSet, EditorView, ViewUpdate } from '@codemirror/view'

const listMarkerDeco = Decoration.mark({ class: 'cm-list-marker' })

function findListMarkers(view: EditorView): DecorationSet {
  const decorations: { from: number; to: number }[] = []
  
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to)
    const lines = text.split('\n')
    let pos = from
    
    for (const line of lines) {
      const trimmedLine = line.trimStart()
      const leadingSpaces = line.length - trimmedLine.length
      
      // Check for bullet list markers: -, *, +
      const bulletMatch = trimmedLine.match(/^([-*+])\s/)
      if (bulletMatch) {
        const markerStart = pos + leadingSpaces
        const markerEnd = markerStart + 1
        decorations.push({ from: markerStart, to: markerEnd })
      }
      
      // Check for numbered list markers: 1., 2., etc.
      const numberMatch = trimmedLine.match(/^(\d+\.)\s/)
      if (numberMatch) {
        const markerStart = pos + leadingSpaces
        const markerEnd = markerStart + numberMatch[1].length
        decorations.push({ from: markerStart, to: markerEnd })
      }
      
      pos += line.length + 1 // +1 for newline
    }
  }
  
  return Decoration.set(
    decorations.map(({ from, to }) => listMarkerDeco.range(from, to))
  )
}

const listMarkerPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    
    constructor(view: EditorView) {
      this.decorations = findListMarkers(view)
    }
    
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = findListMarkers(update.view)
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
)

export function listMarkerHighlight(isDark: boolean): Extension {
  return [
    listMarkerPlugin,
    EditorView.theme({
      '.cm-line .cm-list-marker': {
        color: `${isDark ? '#FFD54F' : '#F57F17'} !important`,
      },
    }, { dark: isDark }),
  ]
}
