import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'

export const markdownExtension = markdown({
  base: markdownLanguage,
  codeLanguages: languages,
  addKeymap: true,
})
