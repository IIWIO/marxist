import { useEffect, useRef } from 'react'
import { useEditorStore } from '@/stores/editorStore'

const AUTO_SAVE_INTERVAL = 30000

export function useAutoSave(enabled: boolean): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!enabled) return

    const saveDrafts = async () => {
      const { tabs } = useEditorStore.getState()

      if (tabs.size === 0) return

      const drafts = Array.from(tabs.values()).map((tab) => ({
        tabId: tab.tabId,
        content: tab.content,
        filePath: tab.filePath,
        fileName: tab.fileName,
        isDirty: tab.isDirty,
        cursorPosition: tab.cursorPosition,
        scrollPosition: tab.scrollPosition,
      }))

      try {
        await window.electron.drafts.saveAll(drafts)
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    }

    const initialTimeout = setTimeout(saveDrafts, 5000)

    intervalRef.current = setInterval(saveDrafts, AUTO_SAVE_INTERVAL)

    return () => {
      clearTimeout(initialTimeout)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled])
}
