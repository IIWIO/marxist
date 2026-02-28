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

  { tag: tags.strong, color: '#AD1457', fontWeight: 'bold' },
  { tag: tags.emphasis, color: '#6A1B9A', fontStyle: 'italic' },

  { tag: tags.strikethrough, color: '#795548', textDecoration: 'line-through' },

  { tag: tags.link, color: '#1565C0', textDecoration: 'underline' },
  { tag: tags.url, color: '#7B8794' },

  { tag: tags.monospace, color: '#E65100', backgroundColor: 'rgba(0,0,0,0.04)' },

  { tag: tags.meta, color: '#546E7A' },

  { tag: tags.quote, color: '#43A047', fontStyle: 'italic' },

  { tag: tags.contentSeparator, color: '#BDBDBD' },

  { tag: tags.angleBracket, color: '#00695C' },
  { tag: tags.tagName, color: '#00796B' },
  { tag: tags.attributeName, color: '#00897B' },
  { tag: tags.attributeValue, color: '#0097A7' },

  { tag: tags.documentMeta, color: '#5C6BC0' },

  { tag: tags.punctuation, color: '#6B6B6B' },

  { tag: tags.atom, color: '#FBC02D' },
])

export const lightSyntaxHighlighting = syntaxHighlighting(lightHighlightStyle)
