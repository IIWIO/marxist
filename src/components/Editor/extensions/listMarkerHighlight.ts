import { Extension } from '@codemirror/state'
import { ViewPlugin, Decoration, DecorationSet, EditorView, ViewUpdate } from '@codemirror/view'

const bulletMarkerDeco = Decoration.mark({ class: 'cm-bullet-marker' })
const numberMarkerDeco = Decoration.mark({ class: 'cm-number-marker' })

function findListMarkers(view: EditorView): DecorationSet {
  const decorations: { from: number; to: number; type: 'bullet' | 'number' }[] = []
  
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
        decorations.push({ from: markerStart, to: markerEnd, type: 'bullet' })
      }
      
      // Check for numbered list markers: 1., 2., etc.
      const numberMatch = trimmedLine.match(/^(\d+\.)\s/)
      if (numberMatch) {
        const markerStart = pos + leadingSpaces
        const markerEnd = markerStart + numberMatch[1].length
        decorations.push({ from: markerStart, to: markerEnd, type: 'number' })
      }
      
      pos += line.length + 1 // +1 for newline
    }
  }
  
  return Decoration.set(
    decorations.map(({ from, to, type }) => 
      type === 'bullet' 
        ? bulletMarkerDeco.range(from, to)
        : numberMarkerDeco.range(from, to)
    )
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
      '.cm-line .cm-bullet-marker': {
        color: `${isDark ? '#FFD54F' : '#F57F17'} !important`,
      },
      '.cm-line .cm-number-marker': {
        color: `${isDark ? '#FFCC80' : '#EF6C00'} !important`,
      },
    }, { dark: isDark }),
  ]
}
