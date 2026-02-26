import { useEffect, useRef, useCallback } from 'react'
import { useMarkdownParser } from '@/hooks/useMarkdownParser'

import '@/styles/github-markdown.css'
import '@/styles/highlight-themes/github-light.css'
import '@/styles/highlight-themes/github-dark.css'

interface MarkdownPreviewProps {
  content: string
  isDark: boolean
  fontSize?: number
  onLinkClick?: (url: string) => void
}

export default function MarkdownPreview({
  content,
  isDark: _isDark,
  fontSize = 16,
  onLinkClick,
}: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { html, isProcessing, error } = useMarkdownParser(content)

  const handleClick = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')

      if (anchor && anchor.href) {
        e.preventDefault()

        const url = anchor.href
        if (url.startsWith('http://') || url.startsWith('https://')) {
          onLinkClick?.(url)
        } else if (url.startsWith('#')) {
          const targetId = url.slice(1)
          const targetElement = containerRef.current?.querySelector(`#${CSS.escape(targetId)}`)
          targetElement?.scrollIntoView({ behavior: 'smooth' })
        }
      }
    },
    [onLinkClick]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('click', handleClick)
    return () => container.removeEventListener('click', handleClick)
  }, [handleClick])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const checkboxes = container.querySelectorAll('input[type="checkbox"]')
    checkboxes.forEach((checkbox) => {
      ;(checkbox as HTMLInputElement).disabled = true
    })
  }, [html])

  if (error) {
    return (
      <div className="p-6 text-red-500 dark:text-red-400">
        <p className="font-medium">Error rendering preview:</p>
        <pre className="mt-2 text-sm">{error.message}</pre>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`
        markdown-body
        h-full w-full overflow-auto p-6
        bg-preview-light dark:bg-preview-dark
        ${isProcessing ? 'opacity-75' : ''}
      `}
      style={{
        fontSize: `${fontSize}px`,
        lineHeight: 1.6,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
      data-testid="markdown-preview"
    />
  )
}
