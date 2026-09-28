import type { AIModel, ChatParams, EditParams } from '../../types/ipc'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1'
const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-20250514'
const REQUEST_TIMEOUT_MS = 90_000
const METADATA_TIMEOUT_MS = 15_000
const OUTPUT_RESERVE_TOKENS = 2_048

interface CompletionMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface Replacement {
  find: string
  replace: string
}

export class OpenRouterError extends Error {
  constructor(message: string, readonly code = 'OPENROUTER_ERROR') {
    super(message)
    this.name = 'OpenRouterError'
  }
}

function headers(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://marxist.app',
    'X-Title': 'Marxist',
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const timeoutController = new AbortController()
  const timeout = setTimeout(() => timeoutController.abort(new Error('Request timed out')), timeoutMs)
  const callerSignal = init.signal
  const abortFromCaller = () => timeoutController.abort(callerSignal?.reason)
  callerSignal?.addEventListener('abort', abortFromCaller, { once: true })
  try {
    return await fetch(url, { ...init, signal: timeoutController.signal })
  } catch (error) {
    if (timeoutController.signal.aborted && !callerSignal?.aborted) {
      throw new OpenRouterError('The request timed out. Please try again.', 'TIMEOUT')
    }
    throw error
  } finally {
    clearTimeout(timeout)
    callerSignal?.removeEventListener('abort', abortFromCaller)
  }
}

async function responseError(response: Response): Promise<OpenRouterError> {
  const body = (await response.json().catch(() => ({}))) as {
    error?: { message?: string }
    message?: string
  }
  return new OpenRouterError(
    body.error?.message || body.message || `OpenRouter returned HTTP ${response.status}`,
    `HTTP_${response.status}`
  )
}

export async function* parseSSEStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      let newline = buffer.indexOf('\n')
      while (newline >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, '')
        buffer = buffer.slice(newline + 1)
        if (line.startsWith('data:')) yield line.slice(5).trimStart()
        newline = buffer.indexOf('\n')
      }
      if (done) break
    }
    const finalLine = buffer.replace(/\r$/, '')
    if (finalLine.startsWith('data:')) yield finalLine.slice(5).trimStart()
  } finally {
    reader.releaseLock()
  }
}

function estimateTokens(value: string): number {
  return Math.ceil(value.length / 4)
}

function fitChatMessages(params: ChatParams): CompletionMessage[] {
  const contextLimit = Math.max(params.contextLength || 16_384, 4_096)
  const inputLimit = contextLimit - Math.min(OUTPUT_RESERVE_TOKENS, Math.floor(contextLimit * 0.2))
  const fixed: CompletionMessage[] = [
    { role: 'system', content: params.systemPrompt },
    { role: 'system', content: `Current document:\n\n${params.documentContent}` },
    { role: 'user', content: params.message },
  ]
  const fixedTokens = fixed.reduce((sum, message) => sum + estimateTokens(message.content), 0)
  if (fixedTokens > inputLimit) {
    throw new OpenRouterError(
      'This document is too large for the selected model. Choose a model with a larger context window or shorten the document.',
      'CONTEXT_TOO_LARGE'
    )
  }

  const retained: CompletionMessage[] = []
  let used = fixedTokens
  for (let index = params.history.length - 1; index >= 0; index -= 1) {
    const message = params.history[index]
    const cost = estimateTokens(message.content)
    if (used + cost > inputLimit) break
    retained.unshift(message)
    used += cost
  }
  return [fixed[0], fixed[1], ...retained, fixed[2]]
}

async function streamCompletion(
  apiKey: string,
  request: { model: string; messages: CompletionMessage[]; responseFormat?: unknown },
  signal: AbortSignal,
  onChunk?: (content: string, fullContent: string) => void
): Promise<string> {
  const response = await fetchWithTimeout(
    `${OPENROUTER_API_URL}/chat/completions`,
    {
      method: 'POST',
      headers: headers(apiKey),
      body: JSON.stringify({
        model: request.model || DEFAULT_MODEL,
        messages: request.messages,
        stream: true,
        ...(request.responseFormat ? { response_format: request.responseFormat } : {}),
      }),
      signal,
    },
    REQUEST_TIMEOUT_MS
  )
  if (!response.ok) throw await responseError(response)
  if (!response.body) throw new OpenRouterError('OpenRouter returned an empty response.', 'EMPTY_RESPONSE')

  let fullContent = ''
  for await (const data of parseSSEStream(response.body)) {
    if (data === '[DONE]') continue
    let parsed: { choices?: Array<{ delta?: { content?: string } }> }
    try {
      parsed = JSON.parse(data) as typeof parsed
    } catch {
      throw new OpenRouterError('OpenRouter returned a malformed stream event.', 'INVALID_STREAM')
    }
    const content = parsed.choices?.[0]?.delta?.content || ''
    if (content) {
      fullContent += content
      onChunk?.(content, fullContent)
    }
  }
  return fullContent
}

export async function verifyApiKey(apiKey: string): Promise<void> {
  const response = await fetchWithTimeout(
    `${OPENROUTER_API_URL}/auth/key`,
    { method: 'GET', headers: headers(apiKey) },
    METADATA_TIMEOUT_MS
  )
  if (!response.ok) throw await responseError(response)
}

export async function listModels(apiKey: string): Promise<AIModel[]> {
  const response = await fetchWithTimeout(
    `${OPENROUTER_API_URL}/models`,
    { method: 'GET', headers: headers(apiKey) },
    METADATA_TIMEOUT_MS
  )
  if (!response.ok) throw await responseError(response)
  const data = (await response.json()) as {
    data?: Array<{ id: string; name?: string; context_length?: number }>
  }
  return (data.data || [])
    .map((model) => ({
      id: model.id,
      name: model.name || model.id,
      contextLength: model.context_length || 4_096,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function chat(
  apiKey: string,
  params: ChatParams,
  signal: AbortSignal,
  onChunk: (content: string, fullContent: string) => void
): Promise<string> {
  return streamCompletion(
    apiKey,
    { model: params.model, messages: fitChatMessages(params) },
    signal,
    onChunk
  )
}

function parseReplacements(value: string): Replacement[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new OpenRouterError('The model returned an invalid edit. Your document was not changed.', 'INVALID_EDIT')
  }
  const replacements = (parsed as { replacements?: unknown })?.replacements
  if (!Array.isArray(replacements) || replacements.length > 100) {
    throw new OpenRouterError('The model returned an invalid edit. Your document was not changed.', 'INVALID_EDIT')
  }
  if (
    !replacements.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof (item as Replacement).find === 'string' &&
        (item as Replacement).find.length > 0 &&
        typeof (item as Replacement).replace === 'string'
    )
  ) {
    throw new OpenRouterError('The model returned an invalid edit. Your document was not changed.', 'INVALID_EDIT')
  }
  return replacements as Replacement[]
}

export function applyValidatedReplacements(document: string, replacements: Replacement[]): string {
  let content = document
  for (const replacement of replacements) {
    const first = content.indexOf(replacement.find)
    const second = first < 0 ? -1 : content.indexOf(replacement.find, first + replacement.find.length)
    if (first < 0 || second >= 0) {
      throw new OpenRouterError(
        'The model produced an ambiguous edit. Your document was not changed.',
        'AMBIGUOUS_EDIT'
      )
    }
    content = `${content.slice(0, first)}${replacement.replace}${content.slice(first + replacement.find.length)}`
  }
  return content
}

export async function edit(apiKey: string, params: EditParams, signal: AbortSignal): Promise<string> {
  const contextLimit = Math.max(params.contextLength || 16_384, 4_096)
  const prompt = `${params.systemPrompt}\n\nYou are editing a Markdown document. Return one JSON object with a "replacements" array. Each item must have exact string "find" and "replace" fields. Every "find" must occur exactly once. Return no prose.\n\nCURRENT DOCUMENT:\n${params.documentContent}\n\nUSER REQUEST:\n${params.instruction}`
  if (estimateTokens(prompt) > contextLimit - OUTPUT_RESERVE_TOKENS) {
    throw new OpenRouterError(
      'This document is too large for the selected model. Choose a model with a larger context window or shorten the document.',
      'CONTEXT_TOO_LARGE'
    )
  }
  const response = await streamCompletion(
    apiKey,
    {
      model: params.model,
      messages: [{ role: 'user', content: prompt }],
      responseFormat: {
        type: 'json_schema',
        json_schema: {
          name: 'markdown_edit',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              replacements: {
                type: 'array',
                maxItems: 100,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: { find: { type: 'string' }, replace: { type: 'string' } },
                  required: ['find', 'replace'],
                },
              },
            },
            required: ['replacements'],
          },
        },
      },
    },
    signal
  )
  return applyValidatedReplacements(params.documentContent, parseReplacements(response))
}
