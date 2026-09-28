import { describe, expect, it } from 'vitest'
import { applyValidatedReplacements, parseSSEStream } from '@/main/services/openRouterService'

function streamFrom(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)))
      controller.close()
    },
  })
}

describe('OpenRouter transport', () => {
  it('preserves SSE events split across arbitrary network chunks', async () => {
    const stream = streamFrom([
      'data: {"choices":[{"delta":{"con',
      'tent":"hel',
      'lo"}}]}\n',
      'data: [DONE]\n',
    ])
    const events: string[] = []
    for await (const event of parseSSEStream(stream)) events.push(event)
    expect(events).toEqual(['{"choices":[{"delta":{"content":"hello"}}]}', '[DONE]'])
  })

  it('applies only uniquely anchored replacements', () => {
    expect(applyValidatedReplacements('before middle after', [
      { find: 'middle', replace: 'center' },
    ])).toBe('before center after')
  })

  it('fails closed when an edit anchor is missing or ambiguous', () => {
    expect(() => applyValidatedReplacements('same same', [
      { find: 'same', replace: 'changed' },
    ])).toThrow(/ambiguous edit/i)
    expect(() => applyValidatedReplacements('document', [
      { find: 'missing', replace: 'changed' },
    ])).toThrow(/ambiguous edit/i)
  })
})
