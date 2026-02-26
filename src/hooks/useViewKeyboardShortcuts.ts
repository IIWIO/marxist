import { useEffect } from 'react'
import { useViewStore } from '@/stores/viewStore'

export function useViewKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return

      const { setActiveView, isNarrowWindow } = useViewStore.getState()

      switch (e.key) {
        case '1':
          e.preventDefault()
          setActiveView('markdown')
          break
        case '2':
          e.preventDefault()
          if (!isNarrowWindow) {
            setActiveView('split')
          }
          break
        case '3':
          e.preventDefault()
          setActiveView('render')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
