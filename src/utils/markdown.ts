let markdownWorker: Worker | null = null
let workerRequestId = 0
const workerRequests = new Map<number, { resolve: (html: string) => void; reject: (error: Error) => void }>()

async function parseWithoutWorker(content: string): Promise<string> {
  const { parseMarkdown } = await import('./markdownProcessor')
  return parseMarkdown(content)
}

function parseInWorker(content: string): Promise<string> {
  if (typeof Worker === 'undefined') return parseWithoutWorker(content)
  if (!markdownWorker) {
    markdownWorker = new Worker(new URL('../workers/markdown.worker.ts', import.meta.url), { type: 'module' })
    markdownWorker.addEventListener('message', (event: MessageEvent<{ id: number; html?: string; error?: string }>) => {
      const request = workerRequests.get(event.data.id)
      if (!request) return
      workerRequests.delete(event.data.id)
      if (event.data.error) request.reject(new Error(event.data.error))
      else request.resolve(event.data.html || '')
    })
    markdownWorker.addEventListener('error', (event) => {
      const error = new Error(event.message || 'Markdown worker failed')
      for (const request of workerRequests.values()) request.reject(error)
      workerRequests.clear()
      markdownWorker?.terminate()
      markdownWorker = null
    })
  }
  return new Promise((resolve, reject) => {
    const id = ++workerRequestId
    workerRequests.set(id, { resolve, reject })
    markdownWorker?.postMessage({ id, content })
  })
}

export function parseMarkdownOptimized(content: string): Promise<string> {
  return parseInWorker(content)
}

export function estimateWordCount(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length
}

export function isLargeDocument(content: string): boolean {
  return estimateWordCount(content) > 50000
}
