import { describe, it, expect } from 'vitest'
import { computeDiff, getAddedLineNumbers, getRemovedLineNumbers } from '@/utils/diff'

describe('diff utility', () => {
  describe('computeDiff', () => {
    it('identifies unchanged documents', () => {
      const content = 'Line 1\nLine 2\nLine 3'
      const result = computeDiff(content, content)

      expect(result.addedCount).toBe(0)
      expect(result.removedCount).toBe(0)
      expect(result.unchangedCount).toBe(3)
      expect(result.lines).toHaveLength(3)
      result.lines.forEach((line) => {
        expect(line.type).toBe('unchanged')
      })
    })

    it('identifies added lines', () => {
      const original = 'Line 1\nLine 2'
      const modified = 'Line 1\nLine 2\nLine 3'
      const result = computeDiff(original, modified)

      expect(result.addedCount).toBe(1)
      expect(result.removedCount).toBe(0)
      expect(result.unchangedCount).toBe(2)

      const addedLine = result.lines.find((l) => l.type === 'added')
      expect(addedLine).toBeDefined()
      expect(addedLine?.content).toBe('Line 3')
    })

    it('identifies removed lines', () => {
      const original = 'Line 1\nLine 2\nLine 3'
      const modified = 'Line 1\nLine 3'
      const result = computeDiff(original, modified)

      expect(result.removedCount).toBe(1)
      expect(result.addedCount).toBe(0)

      const removedLine = result.lines.find((l) => l.type === 'removed')
      expect(removedLine).toBeDefined()
      expect(removedLine?.content).toBe('Line 2')
    })

    it('identifies modified lines as remove+add', () => {
      const original = 'Line 1\nOld Line\nLine 3'
      const modified = 'Line 1\nNew Line\nLine 3'
      const result = computeDiff(original, modified)

      expect(result.removedCount).toBe(1)
      expect(result.addedCount).toBe(1)
      expect(result.unchangedCount).toBe(2)

      const removedLine = result.lines.find((l) => l.type === 'removed')
      expect(removedLine?.content).toBe('Old Line')

      const addedLine = result.lines.find((l) => l.type === 'added')
      expect(addedLine?.content).toBe('New Line')
    })

    it('handles empty original document', () => {
      const original = ''
      const modified = 'Line 1\nLine 2'
      const result = computeDiff(original, modified)

      expect(result.addedCount).toBe(2)
      expect(result.removedCount).toBe(0)
    })

    it('handles empty modified document', () => {
      const original = 'Line 1\nLine 2'
      const modified = ''
      const result = computeDiff(original, modified)

      expect(result.removedCount).toBe(2)
      expect(result.addedCount).toBe(0)
    })

    it('handles complex diff with multiple changes', () => {
      const original = 'A\nB\nC\nD\nE'
      const modified = 'A\nX\nC\nY\nZ'
      const result = computeDiff(original, modified)

      expect(result.unchangedCount).toBe(2)
      expect(result.addedCount).toBeGreaterThan(0)
      expect(result.removedCount).toBeGreaterThan(0)
    })

    it('assigns correct line numbers', () => {
      const original = 'A\nB\nC'
      const modified = 'A\nB\nC'
      const result = computeDiff(original, modified)

      expect(result.lines[0].lineNumber).toBe(1)
      expect(result.lines[1].lineNumber).toBe(2)
      expect(result.lines[2].lineNumber).toBe(3)
    })
  })

  describe('getAddedLineNumbers', () => {
    it('returns empty array when no additions', () => {
      const result = computeDiff('A\nB', 'A\nB')
      const addedLines = getAddedLineNumbers(result)
      expect(addedLines).toEqual([])
    })

    it('returns line numbers of added lines', () => {
      const result = computeDiff('A\nB', 'A\nB\nC')
      const addedLines = getAddedLineNumbers(result)
      expect(addedLines.length).toBe(1)
      expect(addedLines[0]).toBeGreaterThan(0)
    })
  })

  describe('getRemovedLineNumbers', () => {
    it('returns empty array when no removals', () => {
      const result = computeDiff('A\nB', 'A\nB')
      const removedLines = getRemovedLineNumbers(result)
      expect(removedLines).toEqual([])
    })

    it('returns line numbers of removed lines', () => {
      const result = computeDiff('A\nB\nC', 'A\nC')
      const removedLines = getRemovedLineNumbers(result)
      expect(removedLines.length).toBe(1)
    })
  })
})
