import { Decoration, EditorView, WidgetType } from '@codemirror/view'
import type { DiffResult } from '@/utils/diff'

class RemovedLineWidget extends WidgetType {
  constructor(private readonly content: string) {
    super()
  }

  eq(other: RemovedLineWidget): boolean {
    return other.content === this.content
  }

  toDOM(): HTMLElement {
    const line = document.createElement('div')
    line.className = 'cm-ai-removed-line'
    line.setAttribute('aria-label', 'Removed line')
    line.textContent = `− ${this.content}`
    return line
  }
}

export function diffHighlight(diff: DiffResult | null) {
  return EditorView.decorations.compute([], (state) => {
    if (!diff) return Decoration.none

    const ranges = []
    let insertionLine = 1
    for (const line of diff.lines) {
      if (line.type === 'added' && line.newLineNumber !== undefined && line.newLineNumber <= state.doc.lines) {
        const position = state.doc.line(line.newLineNumber).from
        ranges.push(Decoration.line({ class: 'cm-ai-added-line' }).range(position))
      }
      if (line.type === 'removed') {
        const position = insertionLine <= state.doc.lines
          ? state.doc.line(insertionLine).from
          : state.doc.length
        ranges.push(Decoration.widget({
          widget: new RemovedLineWidget(line.content),
          block: true,
          side: insertionLine <= state.doc.lines ? -1 : 1,
        }).range(position))
      }
      if (line.newLineNumber !== undefined) insertionLine = line.newLineNumber + 1
    }
    return Decoration.set(ranges, true)
  })
}
