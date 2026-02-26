import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkFrontmatter from 'remark-frontmatter'
import remarkRehype from 'remark-rehype'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), 'className'],
    span: [...(defaultSchema.attributes?.span || []), 'className'],
    input: ['type', 'checked', 'disabled'],
    a: [...(defaultSchema.attributes?.a || []), 'dataFootnoteRef', 'dataFootnoteBackref'],
    li: [...(defaultSchema.attributes?.li || []), 'id'],
    section: [...(defaultSchema.attributes?.section || []), 'dataFootnotes'],
  },
  tagNames: [...(defaultSchema.tagNames || []), 'input', 'section'],
}

function createProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter, ['yaml', 'toml'])
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeHighlight, {
      ignoreMissing: true,
      detect: true,
    })
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify)
}

let processorInstance: ReturnType<typeof createProcessor> | null = null

function getProcessor() {
  if (!processorInstance) {
    processorInstance = createProcessor()
  }
  return processorInstance
}

export async function parseMarkdown(content: string): Promise<string> {
  const processor = getProcessor()
  const result = await processor.process(content)
  return String(result)
}

export function parseMarkdownSync(content: string): string {
  const processor = getProcessor()
  const result = processor.processSync(content)
  return String(result)
}

const LARGE_DOCUMENT_THRESHOLD = 50000

export async function parseMarkdownOptimized(content: string): Promise<string> {
  if (content.length < LARGE_DOCUMENT_THRESHOLD) {
    return parseMarkdownSync(content)
  }
  return parseMarkdown(content)
}

export function estimateWordCount(content: string): number {
  return content
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

export function isLargeDocument(content: string): boolean {
  const wordCount = estimateWordCount(content)
  return wordCount > 50000
}
