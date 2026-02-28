import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), 'className'],
    span: [...(defaultSchema.attributes?.span || []), 'className', 'style', 'aria-hidden'],
    input: ['type', 'checked', 'disabled'],
    a: [...(defaultSchema.attributes?.a || []), 'dataFootnoteRef', 'dataFootnoteBackref'],
    li: [...(defaultSchema.attributes?.li || []), 'id'],
    section: [...(defaultSchema.attributes?.section || []), 'dataFootnotes'],
    div: [...(defaultSchema.attributes?.div || []), 'className', 'style'],
    svg: ['xmlns', 'width', 'height', 'viewBox', 'style', 'role', 'focusable', 'aria-hidden', 'preserveAspectRatio'],
    line: ['x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width'],
    path: ['d', 'stroke', 'fill', 'stroke-width'],
    rect: ['x', 'y', 'width', 'height', 'fill', 'stroke'],
    g: ['fill', 'stroke', 'stroke-width', 'transform'],
    math: ['xmlns', 'display'],
    semantics: [],
    annotation: ['encoding'],
    '*': ['className', 'style'],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'input',
    'section',
    'svg',
    'line',
    'path',
    'rect',
    'g',
    'math',
    'semantics',
    'mrow',
    'mi',
    'mo',
    'mn',
    'msup',
    'msub',
    'mfrac',
    'msqrt',
    'mroot',
    'mover',
    'munder',
    'munderover',
    'mtable',
    'mtr',
    'mtd',
    'mtext',
    'mspace',
    'annotation',
  ],
}

function createProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter, ['yaml', 'toml'])
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeHighlight, {
      ignoreMissing: true,
      detect: true,
    })
    .use(rehypeKatex)
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
