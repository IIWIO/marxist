import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

export const lightHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, color: '#D32F2F', fontWeight: 'bold' },
  { tag: tags.heading2, color: '#D32F2F', fontWeight: 'bold' },
  { tag: tags.heading3, color: '#D32F2F', fontWeight: 'bold' },
  { tag: tags.heading4, color: '#D32F2F', fontWeight: 'bold' },
  { tag: tags.heading5, color: '#D32F2F', fontWeight: 'bold' },
  { tag: tags.heading6, color: '#D32F2F', fontWeight: 'bold' },

  { tag: tags.processingInstruction, color: '#D32F2F' },

  { tag: tags.strong, color: '#6A1B9A', fontWeight: 'bold' },
  { tag: tags.emphasis, color: '#6A1B9A', fontStyle: 'italic' },

  { tag: tags.strikethrough, color: '#795548', textDecoration: 'line-through' },

  { tag: tags.link, color: '#1565C0', textDecoration: 'underline' },
  { tag: tags.url, color: '#7B8794' },

  { tag: tags.monospace, color: '#E65100', backgroundColor: 'rgba(0,0,0,0.04)' },

  { tag: tags.meta, color: '#546E7A' },

  { tag: tags.quote, color: '#43A047', fontStyle: 'italic' },

  { tag: tags.contentSeparator, color: '#BDBDBD' },

  { tag: tags.angleBracket, color: '#00838F' },
  { tag: tags.tagName, color: '#00838F' },
  { tag: tags.attributeName, color: '#00838F' },
  { tag: tags.attributeValue, color: '#00838F' },

  { tag: tags.documentMeta, color: '#5C6BC0' },

  { tag: tags.punctuation, color: '#6B6B6B' },

  { tag: tags.atom, color: '#F57F17' },
])

export const lightSyntaxHighlighting = syntaxHighlighting(lightHighlightStyle)
