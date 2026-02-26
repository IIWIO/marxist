import { keymap } from '@codemirror/view'
import { defaultKeymap, historyKeymap } from '@codemirror/commands'
import { searchKeymap } from '@codemirror/search'
import { formattingCommands } from './formatting'

export const customKeymap = keymap.of([
  { key: 'Mod-b', run: formattingCommands.bold },
  { key: 'Mod-i', run: formattingCommands.italic },
  { key: 'Mod-e', run: formattingCommands.inlineCode },

  { key: 'Mod-Shift-s', run: formattingCommands.strikethrough },
  { key: 'Mod-k', run: formattingCommands.link },
])

export const allKeymaps = [
  customKeymap,
  keymap.of(searchKeymap),
  keymap.of(historyKeymap),
  keymap.of(defaultKeymap),
]
