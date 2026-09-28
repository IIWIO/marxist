import { markdown, markdownLanguage } from '@codemirror/lang-markdown'

export const markdownExtension = markdown({
  base: markdownLanguage,
  addKeymap: true,
})
