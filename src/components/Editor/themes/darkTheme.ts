import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

export const darkHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, color: '#EF5350', fontWeight: 'bold' },
  { tag: tags.heading2, color: '#EF5350', fontWeight: 'bold' },
  { tag: tags.heading3, color: '#EF5350', fontWeight: 'bold' },
  { tag: tags.heading4, color: '#EF5350', fontWeight: 'bold' },
  { tag: tags.heading5, color: '#EF5350', fontWeight: 'bold' },
  { tag: tags.heading6, color: '#EF5350', fontWeight: 'bold' },

  { tag: tags.processingInstruction, color: '#EF5350' },

  { tag: tags.strong, color: '#CE93D8', fontWeight: 'bold' },
  { tag: tags.emphasis, color: '#CE93D8', fontStyle: 'italic' },

  { tag: tags.strikethrough, color: '#A1887F', textDecoration: 'line-through' },

  { tag: tags.link, color: '#64B5F6', textDecoration: 'underline' },
  { tag: tags.url, color: '#78909C' },

  { tag: tags.monospace, color: '#FFB74D', backgroundColor: 'rgba(255,255,255,0.04)' },

  { tag: tags.meta, color: '#78909C' },

  { tag: tags.quote, color: '#81C784', fontStyle: 'italic' },

  { tag: tags.contentSeparator, color: '#616161' },

  { tag: tags.angleBracket, color: '#4DD0E1' },
  { tag: tags.tagName, color: '#4DD0E1' },
  { tag: tags.attributeName, color: '#4DD0E1' },
  { tag: tags.attributeValue, color: '#4DD0E1' },

  { tag: tags.documentMeta, color: '#9FA8DA' },

  { tag: tags.punctuation, color: '#888888' },

  { tag: tags.atom, color: '#FFD54F' },
])

export const darkSyntaxHighlighting = syntaxHighlighting(darkHighlightStyle)
