import { describe, it, expect } from 'vitest'
import { parseMarkdownSync, parseMarkdown, estimateWordCount, isLargeDocument } from '@/utils/markdown'

describe('Markdown Parser', () => {
  describe('parseMarkdownSync', () => {
    it('parses basic markdown', () => {
      const result = parseMarkdownSync('# Hello World')
      expect(result).toContain('<h1>')
      expect(result).toContain('Hello World')
    })

    it('parses paragraphs', () => {
      const result = parseMarkdownSync('This is a paragraph.')
      expect(result).toContain('<p>')
      expect(result).toContain('This is a paragraph.')
    })

    it('supports GFM tables (RN-03)', () => {
      const markdown = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`
      const result = parseMarkdownSync(markdown)
      expect(result).toContain('<table>')
      expect(result).toContain('<th>')
      expect(result).toContain('Header 1')
    })

    it('supports task lists (RN-03)', () => {
      const markdown = `
- [x] Completed task
- [ ] Incomplete task
`
      const result = parseMarkdownSync(markdown)
      expect(result).toContain('type="checkbox"')
      expect(result).toContain('checked')
    })

    it('supports strikethrough (RN-03)', () => {
      const result = parseMarkdownSync('~~deleted~~')
      expect(result).toContain('<del>')
      expect(result).toContain('deleted')
    })

    it('supports autolinks (RN-03)', () => {
      const result = parseMarkdownSync('Visit https://example.com')
      expect(result).toContain('<a')
      expect(result).toContain('href="https://example.com"')
    })

    it('highlights code blocks (RN-03)', () => {
      const markdown = '```javascript\nconst x = 1;\n```'
      const result = parseMarkdownSync(markdown)
      expect(result).toContain('<pre>')
      expect(result).toContain('<code')
    })

    it('parses YAML frontmatter without rendering it (RN-07)', () => {
      const markdown = `---
title: Test
---

# Content`
      const result = parseMarkdownSync(markdown)
      expect(result).not.toContain('title: Test')
      expect(result).toContain('<h1>')
      expect(result).toContain('Content')
    })

    it('handles inline code', () => {
      const result = parseMarkdownSync('Use `const x = 1` for variables')
      expect(result).toContain('<code>')
      expect(result).toContain('const x = 1')
    })

    it('handles blockquotes', () => {
      const result = parseMarkdownSync('> This is a quote')
      expect(result).toContain('<blockquote>')
      expect(result).toContain('This is a quote')
    })

    it('handles horizontal rules', () => {
      const result = parseMarkdownSync('---')
      expect(result).toContain('<hr')
    })

    it('handles images', () => {
      const result = parseMarkdownSync('![alt text](image.png)')
      expect(result).toContain('<img')
      expect(result).toContain('alt="alt text"')
    })

    it('handles links', () => {
      const result = parseMarkdownSync('[Link](https://example.com)')
      expect(result).toContain('<a')
      expect(result).toContain('href="https://example.com"')
      expect(result).toContain('Link')
    })
  })

  describe('parseMarkdown (async)', () => {
    it('parses markdown asynchronously', async () => {
      const result = await parseMarkdown('# Async Test')
      expect(result).toContain('<h1>')
      expect(result).toContain('Async Test')
    })

    it('handles large content', async () => {
      const largeContent = '# Test\n'.repeat(1000)
      const result = await parseMarkdown(largeContent)
      expect(result).toContain('<h1>')
    })
  })

  describe('estimateWordCount', () => {
    it('counts words correctly', () => {
      expect(estimateWordCount('one two three')).toBe(3)
      expect(estimateWordCount('  spaced   words  ')).toBe(2)
      expect(estimateWordCount('')).toBe(0)
    })

    it('handles single word', () => {
      expect(estimateWordCount('hello')).toBe(1)
    })

    it('handles newlines', () => {
      expect(estimateWordCount('one\ntwo\nthree')).toBe(3)
    })
  })

  describe('isLargeDocument', () => {
    it('returns false for small documents', () => {
      expect(isLargeDocument('small document')).toBe(false)
    })

    it('returns true for documents over 50k words', () => {
      const largeContent = 'word '.repeat(50001)
      expect(isLargeDocument(largeContent)).toBe(true)
    })
  })
})
