import { useState, useEffect, useRef } from 'react'
import { parseMarkdownOptimized, isLargeDocument } from '@/utils/markdown'
import { useDebounce } from './useDebounce'

interface UseMarkdownParserOptions {
  debounceMs?: number
}

interface UseMarkdownParserResult {
  html: string
  isProcessing: boolean
  error: Error | null
}

const DEFAULT_DEBOUNCE_MS = 200

export function useMarkdownParser(
  content: string,
  options: UseMarkdownParserOptions = {}
): UseMarkdownParserResult {
  const { debounceMs = DEFAULT_DEBOUNCE_MS } = options

  const [html, setHtml] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isLarge, setIsLarge] = useState(false)

  const isMountedRef = useRef(true)
  const processingIdRef = useRef(0)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    setIsLarge(isLargeDocument(content))
  }, [content])

  const effectiveDebounce = isLarge ? debounceMs * 2 : debounceMs
  const debouncedContent = useDebounce(content, effectiveDebounce)

  useEffect(() => {
    const currentId = ++processingIdRef.current

    const processMarkdown = async () => {
      if (!debouncedContent.trim()) {
        setHtml('')
        return
      }

      setIsProcessing(true)
      setError(null)

      try {
        const startTime = performance.now()
        const result = await parseMarkdownOptimized(debouncedContent)
        const processingTime = performance.now() - startTime

        if (processingTime > 100) {
          console.warn(`Markdown parsing took ${processingTime.toFixed(2)}ms`)
        }

        if (isMountedRef.current && currentId === processingIdRef.current) {
          setHtml(result)
        }
      } catch (err) {
        if (isMountedRef.current && currentId === processingIdRef.current) {
          setError(err instanceof Error ? err : new Error('Failed to parse markdown'))
          console.error('Markdown parsing error:', err)
        }
      } finally {
        if (isMountedRef.current && currentId === processingIdRef.current) {
          setIsProcessing(false)
        }
      }
    }

    processMarkdown()
  }, [debouncedContent])

  return { html, isProcessing, error }
}
