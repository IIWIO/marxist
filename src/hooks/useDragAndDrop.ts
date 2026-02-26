import { useEffect, useCallback } from 'react'
import { useFileOperations } from './useFileOperations'

export function useDragAndDrop() {
  const { openFilePath } = useFileOperations()

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return

    for (const file of Array.from(files)) {
      const path = (file as File & { path?: string }).path

      if (!path) continue

      const ext = path.toLowerCase().split('.').pop()
      if (ext === 'md' || ext === 'markdown' || ext === 'txt') {
        await openFilePath(path)
      } else {
        console.warn('Unsupported file type:', ext)
      }
    }
  }, [openFilePath])

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)

    return () => {
      document.removeEventListener('dragenter', handleDragEnter)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
    }
  }, [handleDragOver, handleDrop])
}
