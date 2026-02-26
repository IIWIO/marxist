import { EditorSelection, StateCommand } from '@codemirror/state'

type WrapConfig = {
  before: string
  after: string
  placeholder: string
}

const wrapConfigs: Record<string, WrapConfig> = {
  bold: { before: '**', after: '**', placeholder: 'bold text' },
  italic: { before: '_', after: '_', placeholder: 'italic text' },
  underline: { before: '<u>', after: '</u>', placeholder: 'underlined text' },
  strikethrough: { before: '~~', after: '~~', placeholder: 'strikethrough text' },
  inlineCode: { before: '`', after: '`', placeholder: 'code' },
  link: { before: '[', after: '](url)', placeholder: 'link text' },
  image: { before: '![', after: '](url)', placeholder: 'alt text' },
}

export const wrapSelection = (type: keyof typeof wrapConfigs): StateCommand => {
  return ({ state, dispatch }) => {
    const config = wrapConfigs[type]
    if (!config) return false

    const changes = state.changeByRange((range) => {
      const hasSelection = range.from !== range.to
      const selectedText = hasSelection
        ? state.sliceDoc(range.from, range.to)
        : config.placeholder

      const newText = `${config.before}${selectedText}${config.after}`

      const newFrom = range.from + config.before.length
      const newTo = newFrom + selectedText.length

      return {
        changes: { from: range.from, to: range.to, insert: newText },
        range: EditorSelection.range(newFrom, newTo),
      }
    })

    dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input.format' }))
    return true
  }
}

type LinePrefix = {
  prefix: string
  toggle: boolean
}

const linePrefixes: Record<string, LinePrefix> = {
  heading1: { prefix: '# ', toggle: true },
  heading2: { prefix: '## ', toggle: true },
  heading3: { prefix: '### ', toggle: true },
  heading4: { prefix: '#### ', toggle: true },
  bulletList: { prefix: '- ', toggle: false },
  numberList: { prefix: '1. ', toggle: false },
  checklist: { prefix: '- [ ] ', toggle: false },
  blockquote: { prefix: '> ', toggle: true },
}

export const toggleLinePrefix = (type: keyof typeof linePrefixes): StateCommand => {
  return ({ state, dispatch }) => {
    const config = linePrefixes[type]
    if (!config) return false

    const changes = state.changeByRange((range) => {
      const line = state.doc.lineAt(range.from)
      const lineText = line.text

      const hasPrefix = lineText.startsWith(config.prefix)

      const headingMatch = lineText.match(/^#{1,6}\s/)
      const isHeading = type.startsWith('heading')

      let newText: string
      let newFrom: number
      let newTo: number

      if (hasPrefix && config.toggle) {
        newText = lineText.slice(config.prefix.length)
        newFrom = line.from
        newTo = line.to
      } else if (isHeading && headingMatch) {
        newText = config.prefix + lineText.slice(headingMatch[0].length)
        newFrom = line.from
        newTo = line.to
      } else {
        newText = config.prefix + lineText
        newFrom = line.from
        newTo = line.to
      }

      const cursorOffset = range.from - line.from
      const newCursorPos =
        line.from + Math.min(cursorOffset + (newText.length - lineText.length), newText.length)

      return {
        changes: { from: newFrom, to: newTo, insert: newText },
        range: EditorSelection.cursor(Math.max(line.from, newCursorPos)),
      }
    })

    dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input.format' }))
    return true
  }
}

export const insertCodeBlock: StateCommand = ({ state, dispatch }) => {
  const changes = state.changeByRange((range) => {
    const hasSelection = range.from !== range.to
    const selectedText = hasSelection ? state.sliceDoc(range.from, range.to) : ''

    const newText = hasSelection ? `\`\`\`\n${selectedText}\n\`\`\`` : '```\n\n```'

    const cursorPos = range.from + 4 + (hasSelection ? selectedText.length : 0)

    return {
      changes: { from: range.from, to: range.to, insert: newText },
      range: EditorSelection.cursor(hasSelection ? cursorPos : range.from + 4),
    }
  })

  dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input.format' }))
  return true
}

export const insertHorizontalRule: StateCommand = ({ state, dispatch }) => {
  const changes = state.changeByRange((range) => {
    const line = state.doc.lineAt(range.from)
    const isEmptyLine = line.text.trim() === ''

    const prefix = isEmptyLine ? '' : '\n'
    const newText = `${prefix}---\n`

    return {
      changes: { from: range.from, to: range.to, insert: newText },
      range: EditorSelection.cursor(range.from + newText.length),
    }
  })

  dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input.format' }))
  return true
}

export const insertTable: StateCommand = ({ state, dispatch }) => {
  const tableTemplate = `| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
| Cell 7   | Cell 8   | Cell 9   |`

  const changes = state.changeByRange((range) => {
    const line = state.doc.lineAt(range.from)
    const isEmptyLine = line.text.trim() === ''
    const prefix = isEmptyLine ? '' : '\n\n'
    const newText = `${prefix}${tableTemplate}\n`

    return {
      changes: { from: range.from, to: range.to, insert: newText },
      range: EditorSelection.cursor(range.from + prefix.length + 2),
    }
  })

  dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input.format' }))
  return true
}

export const indentLine: StateCommand = ({ state, dispatch }) => {
  const indentStr = '  '

  const changes = state.changeByRange((range) => {
    const fromLine = state.doc.lineAt(range.from)
    const toLine = state.doc.lineAt(range.to)

    const linesToIndent: Array<{ from: number; insert: string }> = []

    for (let lineNum = fromLine.number; lineNum <= toLine.number; lineNum++) {
      const line = state.doc.line(lineNum)
      linesToIndent.push({ from: line.from, insert: indentStr })
    }

    return {
      changes: linesToIndent,
      range: EditorSelection.range(
        range.from + indentStr.length,
        range.to + indentStr.length * (toLine.number - fromLine.number + 1)
      ),
    }
  })

  dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input.format' }))
  return true
}

export const outdentLine: StateCommand = ({ state, dispatch }) => {
  const changes = state.changeByRange((range) => {
    const fromLine = state.doc.lineAt(range.from)
    const toLine = state.doc.lineAt(range.to)

    const linesToOutdent: Array<{ from: number; to: number }> = []
    let totalRemoved = 0

    for (let lineNum = fromLine.number; lineNum <= toLine.number; lineNum++) {
      const line = state.doc.line(lineNum)
      const match = line.text.match(/^(\t|  )/)

      if (match) {
        linesToOutdent.push({
          from: line.from,
          to: line.from + match[1].length,
        })
        if (lineNum === fromLine.number) {
          totalRemoved = match[1].length
        }
      }
    }

    if (linesToOutdent.length === 0) {
      return { range }
    }

    return {
      changes: linesToOutdent.map((c) => ({ from: c.from, to: c.to })),
      range: EditorSelection.range(
        Math.max(fromLine.from, range.from - totalRemoved),
        Math.max(fromLine.from, range.to - totalRemoved * (toLine.number - fromLine.number + 1))
      ),
    }
  })

  dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input.format' }))
  return true
}

export const formattingCommands = {
  bold: wrapSelection('bold'),
  italic: wrapSelection('italic'),
  underline: wrapSelection('underline'),
  strikethrough: wrapSelection('strikethrough'),
  inlineCode: wrapSelection('inlineCode'),
  link: wrapSelection('link'),
  image: wrapSelection('image'),
  heading1: toggleLinePrefix('heading1'),
  heading2: toggleLinePrefix('heading2'),
  heading3: toggleLinePrefix('heading3'),
  heading4: toggleLinePrefix('heading4'),
  bulletList: toggleLinePrefix('bulletList'),
  numberList: toggleLinePrefix('numberList'),
  checklist: toggleLinePrefix('checklist'),
  blockquote: toggleLinePrefix('blockquote'),
  codeBlock: insertCodeBlock,
  horizontalRule: insertHorizontalRule,
  table: insertTable,
  indent: indentLine,
  outdent: outdentLine,
} as const

export type FormattingCommandName = keyof typeof formattingCommands
