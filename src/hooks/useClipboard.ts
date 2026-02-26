import { useState, useCallback } from 'react'

interface UseClipboardResult {
  copy: (text: string) => Promise<boolean>
  copied: boolean
}

export function useClipboard(resetDelay = 2000): UseClipboardResult {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)

        setTimeout(() => {
          setCopied(false)
        }, resetDelay)

        return true
      } catch (error) {
        console.error('Failed to copy to clipboard:', error)
        return false
      }
    },
    [resetDelay]
  )

  return { copy, copied }
}
