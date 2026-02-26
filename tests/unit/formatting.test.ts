import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import { formattingCommands } from '@/components/Editor/extensions/formatting'

function createState(doc: string, selection?: { anchor: number; head: number }) {
  return EditorState.create({
    doc,
    selection: selection ? { anchor: selection.anchor, head: selection.head } : undefined,
  })
}

describe('Formatting Commands', () => {
  describe('wrapSelection', () => {
    it('wraps selected text with bold markers', () => {
      const state = createState('hello world', { anchor: 0, head: 5 })
      let newState = state

      formattingCommands.bold({
        state,
        dispatch: (tr) => {
          newState = tr.state
        },
      })

      expect(newState.doc.toString()).toBe('**hello** world')
    })

    it('inserts placeholder when no selection', () => {
      const state = createState('hello world', { anchor: 6, head: 6 })
      let newState = state

      formattingCommands.bold({
        state,
        dispatch: (tr) => {
          newState = tr.state
        },
      })

      expect(newState.doc.toString()).toBe('hello **bold text**world')
    })

    it('wraps with italic markers', () => {
      const state = createState('hello world', { anchor: 0, head: 5 })
      let newState = state

      formattingCommands.italic({
        state,
        dispatch: (tr) => {
          newState = tr.state
        },
      })

      expect(newState.doc.toString()).toBe('_hello_ world')
    })

    it('wraps with inline code markers', () => {
      const state = createState('const x = 1', { anchor: 6, head: 7 })
      let newState = state

      formattingCommands.inlineCode({
        state,
        dispatch: (tr) => {
          newState = tr.state
        },
      })

      expect(newState.doc.toString()).toBe('const `x` = 1')
    })

    it('wraps with strikethrough markers', () => {
      const state = createState('hello world', { anchor: 0, head: 5 })
      let newState = state

      formattingCommands.strikethrough({
        state,
        dispatch: (tr) => {
          newState = tr.state
        },
      })

      expect(newState.doc.toString()).toBe('~~hello~~ world')
    })

    it('wraps with link markers', () => {
      const state = createState('click here', { anchor: 0, head: 10 })
      let newState = state

      formattingCommands.link({
        state,
        dispatch: (tr) => {
          newState = tr.state
        },
      })

      expect(newState.doc.toString()).toBe('[click here](url)')
    })
  })

  describe('toggleLinePrefix', () => {
    it('adds heading prefix', () => {
      const state = createState('Hello', { anchor: 0, head: 0 })
      let newState = state

      formattingCommands.heading1({
        state,
        dispatch: (tr) => {
          newState = tr.state
        },
      })

      expect(newState.doc.toString()).toBe('# Hello')
    })

    it('removes heading prefix when toggled', () => {
      const state = createState('# Hello', { anchor: 2, head: 2 })
      let newState = state

      formattingCommands.heading1({
        state,
        dispatch: (tr) => {
          newState = tr.state
        },
      })

      expect(newState.doc.toString()).toBe('Hello')
    })

    it('replaces heading level', () => {
      const state = createState('## Hello', { anchor: 3, head: 3 })
      let newState = state

      formattingCommands.heading1({
        state,
        dispatch: (tr) => {
          newState = tr.state
        },
      })

      expect(newState.doc.toString()).toBe('# Hello')
    })

    it('adds bullet list prefix', () => {
      const state = createState('Item', { anchor: 0, head: 0 })
      let newState = state

      formattingCommands.bulletList({
        state,
        dispatch: (tr) => {
          newState = tr.state
        },
      })

      expect(newState.doc.toString()).toBe('- Item')
    })

    it('adds numbered list prefix', () => {
      const state = createState('Item', { anchor: 0, head: 0 })
      let newState = state

      formattingCommands.numberList({
        state,
        dispatch: (tr) => {
          newState = tr.state
        },
      })

      expect(newState.doc.toString()).toBe('1. Item')
    })

    it('adds checklist prefix', () => {
      const state = createState('Task', { anchor: 0, head: 0 })
      let newState = state

      formattingCommands.checklist({
        state,
        dispatch: (tr) => {
          newState = tr.state
        },
      })

      expect(newState.doc.toString()).toBe('- [ ] Task')
    })

    it('adds blockquote prefix', () => {
      const state = createState('Quote text', { anchor: 0, head: 0 })
      let newState = state

      formattingCommands.blockquote({
        state,
        dispatch: (tr) => {
          newState = tr.state
        },
      })

      expect(newState.doc.toString()).toBe('> Quote text')
    })
  })

  describe('insertCodeBlock', () => {
    it('inserts empty code block', () => {
      const state = createState('', { anchor: 0, head: 0 })
      let newState = state

      formattingCommands.codeBlock({
        state,
        dispatch: (tr) => {
          newState = tr.state
        },
      })

      expect(newState.doc.toString()).toBe('```\n\n```')
    })

    it('wraps selection in code block', () => {
      const state = createState('const x = 1', { anchor: 0, head: 11 })
      let newState = state

      formattingCommands.codeBlock({
        state,
        dispatch: (tr) => {
          newState = tr.state
        },
      })

      expect(newState.doc.toString()).toBe('```\nconst x = 1\n```')
    })
  })

  describe('insertHorizontalRule', () => {
    it('inserts horizontal rule on empty line', () => {
      const state = createState('', { anchor: 0, head: 0 })
      let newState = state

      formattingCommands.horizontalRule({
        state,
        dispatch: (tr) => {
          newState = tr.state
        },
      })

      expect(newState.doc.toString()).toBe('---\n')
    })

    it('inserts horizontal rule with newline on non-empty line', () => {
      const state = createState('Text', { anchor: 4, head: 4 })
      let newState = state

      formattingCommands.horizontalRule({
        state,
        dispatch: (tr) => {
          newState = tr.state
        },
      })

      expect(newState.doc.toString()).toBe('Text\n---\n')
    })
  })

  describe('insertTable', () => {
    it('inserts 3x3 table template', () => {
      const state = createState('', { anchor: 0, head: 0 })
      let newState = state

      formattingCommands.table({
        state,
        dispatch: (tr) => {
          newState = tr.state
        },
      })

      expect(newState.doc.toString()).toContain('| Header 1 |')
      expect(newState.doc.toString()).toContain('|----------|')
      expect(newState.doc.toString()).toContain('| Cell 1   |')
    })
  })

  describe('indent/outdent', () => {
    it('indents line with 2 spaces', () => {
      const state = createState('Hello', { anchor: 0, head: 0 })
      let newState = state

      formattingCommands.indent({
        state,
        dispatch: (tr) => {
          newState = tr.state
        },
      })

      expect(newState.doc.toString()).toBe('  Hello')
    })

    it('outdents line by removing spaces', () => {
      const state = createState('  Hello', { anchor: 2, head: 2 })
      let newState = state

      formattingCommands.outdent({
        state,
        dispatch: (tr) => {
          newState = tr.state
        },
      })

      expect(newState.doc.toString()).toBe('Hello')
    })

    it('indents multiple lines', () => {
      const state = createState('Line 1\nLine 2\nLine 3', { anchor: 0, head: 20 })
      let newState = state

      formattingCommands.indent({
        state,
        dispatch: (tr) => {
          newState = tr.state
        },
      })

      expect(newState.doc.toString()).toBe('  Line 1\n  Line 2\n  Line 3')
    })
  })
})
