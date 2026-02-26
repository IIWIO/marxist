export interface DiffLine {
  type: 'unchanged' | 'added' | 'removed'
  content: string
  lineNumber: number
  originalLineNumber?: number
  newLineNumber?: number
}

export interface DiffResult {
  lines: DiffLine[]
  addedCount: number
  removedCount: number
  unchangedCount: number
}

function splitLines(text: string): string[] {
  if (text === '') return []
  return text.split('\n')
}

export function computeDiff(original: string, modified: string): DiffResult {
  const originalLines = splitLines(original)
  const modifiedLines = splitLines(modified)

  const lcs = buildLCSMatrix(originalLines, modifiedLines)

  const diffLines = backtrackDiff(originalLines, modifiedLines, lcs)

  const addedCount = diffLines.filter((l) => l.type === 'added').length
  const removedCount = diffLines.filter((l) => l.type === 'removed').length
  const unchangedCount = diffLines.filter((l) => l.type === 'unchanged').length

  return { lines: diffLines, addedCount, removedCount, unchangedCount }
}

function buildLCSMatrix(a: string[], b: string[]): number[][] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  return dp
}

function backtrackDiff(original: string[], modified: string[], lcs: number[][]): DiffLine[] {
  const result: DiffLine[] = []
  let i = original.length
  let j = modified.length
  let originalLineNum = original.length
  let modifiedLineNum = modified.length

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && original[i - 1] === modified[j - 1]) {
      result.unshift({
        type: 'unchanged',
        content: original[i - 1],
        lineNumber: modifiedLineNum,
        originalLineNumber: originalLineNum,
        newLineNumber: modifiedLineNum,
      })
      i--
      j--
      originalLineNum--
      modifiedLineNum--
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      result.unshift({
        type: 'added',
        content: modified[j - 1],
        lineNumber: modifiedLineNum,
        newLineNumber: modifiedLineNum,
      })
      j--
      modifiedLineNum--
    } else if (i > 0) {
      result.unshift({
        type: 'removed',
        content: original[i - 1],
        lineNumber: originalLineNum,
        originalLineNumber: originalLineNum,
      })
      i--
      originalLineNum--
    }
  }

  return result
}

export function getAddedLineNumbers(diff: DiffResult): number[] {
  return diff.lines
    .filter((l) => l.type === 'added')
    .map((l) => l.newLineNumber!)
    .filter(Boolean)
}

export function getRemovedLineNumbers(diff: DiffResult): number[] {
  return diff.lines
    .filter((l) => l.type === 'removed')
    .map((l) => l.originalLineNumber!)
    .filter(Boolean)
}
