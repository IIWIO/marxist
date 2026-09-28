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

type Operation = Pick<DiffLine, 'type' | 'content'>
const MAX_EXACT_LINES = 5_000
const MAX_TRACE_CELLS = 2_000_000

function splitLines(text: string): string[] {
  return text === '' ? [] : text.split('\n')
}

function value(map: Map<number, number>, key: number): number {
  return map.get(key) ?? 0
}

function backtrack(trace: Array<Map<number, number>>, original: string[], modified: string[]): Operation[] {
  const reversed: Operation[] = []
  let x = original.length
  let y = modified.length
  for (let depth = trace.length - 1; depth >= 0; depth -= 1) {
    const diagonal = x - y
    const previous = trace[depth]
    const previousDiagonal =
      diagonal === -depth ||
      (diagonal !== depth && value(previous, diagonal - 1) < value(previous, diagonal + 1))
        ? diagonal + 1
        : diagonal - 1
    const previousX = value(previous, previousDiagonal)
    const previousY = previousX - previousDiagonal
    while (x > previousX && y > previousY) {
      reversed.push({ type: 'unchanged', content: original[x - 1] })
      x -= 1
      y -= 1
    }
    if (depth === 0) break
    if (x === previousX) {
      reversed.push({ type: 'added', content: modified[y - 1] })
      y -= 1
    } else {
      reversed.push({ type: 'removed', content: original[x - 1] })
      x -= 1
    }
  }
  return reversed.reverse()
}

function myers(original: string[], modified: string[]): Operation[] | null {
  const maximum = original.length + modified.length
  const frontier = new Map<number, number>([[1, 0]])
  const trace: Array<Map<number, number>> = []
  for (let depth = 0; depth <= maximum; depth += 1) {
    if ((depth + 1) * (depth + 1) > MAX_TRACE_CELLS) return null
    trace.push(new Map(frontier))
    for (let diagonal = -depth; diagonal <= depth; diagonal += 2) {
      let x =
        diagonal === -depth ||
        (diagonal !== depth && value(frontier, diagonal - 1) < value(frontier, diagonal + 1))
          ? value(frontier, diagonal + 1)
          : value(frontier, diagonal - 1) + 1
      let y = x - diagonal
      while (x < original.length && y < modified.length && original[x] === modified[y]) {
        x += 1
        y += 1
      }
      frontier.set(diagonal, x)
      if (x >= original.length && y >= modified.length) return backtrack(trace, original, modified)
    }
  }
  return []
}

function coarseDiff(original: string[], modified: string[]): Operation[] {
  let prefix = 0
  while (prefix < original.length && prefix < modified.length && original[prefix] === modified[prefix]) prefix += 1
  let suffix = 0
  while (
    suffix < original.length - prefix &&
    suffix < modified.length - prefix &&
    original[original.length - 1 - suffix] === modified[modified.length - 1 - suffix]
  ) suffix += 1
  return [
    ...original.slice(0, prefix).map((content) => ({ type: 'unchanged' as const, content })),
    ...original.slice(prefix, original.length - suffix).map((content) => ({ type: 'removed' as const, content })),
    ...modified.slice(prefix, modified.length - suffix).map((content) => ({ type: 'added' as const, content })),
    ...original.slice(original.length - suffix).map((content) => ({ type: 'unchanged' as const, content })),
  ]
}

export function computeDiff(originalText: string, modifiedText: string): DiffResult {
  const original = splitLines(originalText)
  const modified = splitLines(modifiedText)
  const operations =
    original.length + modified.length <= MAX_EXACT_LINES ? myers(original, modified) : null
  const selected = operations || coarseDiff(original, modified)
  let originalLine = 0
  let modifiedLine = 0
  const lines = selected.map((operation): DiffLine => {
    if (operation.type !== 'added') originalLine += 1
    if (operation.type !== 'removed') modifiedLine += 1
    return {
      ...operation,
      lineNumber: operation.type === 'removed' ? originalLine : modifiedLine,
      ...(operation.type !== 'added' ? { originalLineNumber: originalLine } : {}),
      ...(operation.type !== 'removed' ? { newLineNumber: modifiedLine } : {}),
    }
  })
  return {
    lines,
    addedCount: lines.filter((line) => line.type === 'added').length,
    removedCount: lines.filter((line) => line.type === 'removed').length,
    unchangedCount: lines.filter((line) => line.type === 'unchanged').length,
  }
}

export function getAddedLineNumbers(diff: DiffResult): number[] {
  return diff.lines.flatMap((line) =>
    line.type === 'added' && line.newLineNumber !== undefined ? [line.newLineNumber] : []
  )
}

export function getRemovedLineNumbers(diff: DiffResult): number[] {
  return diff.lines.flatMap((line) =>
    line.type === 'removed' && line.originalLineNumber !== undefined ? [line.originalLineNumber] : []
  )
}
