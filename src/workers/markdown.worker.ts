import { parseMarkdownSync } from '@/utils/markdownProcessor'

self.addEventListener('message', (event: MessageEvent<{ id: number; content: string }>) => {
  try {
    self.postMessage({ id: event.data.id, html: parseMarkdownSync(event.data.content) })
  } catch (error) {
    self.postMessage({
      id: event.data.id,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})
