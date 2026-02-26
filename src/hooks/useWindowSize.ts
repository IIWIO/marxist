import { useEffect } from 'react'
import { useViewStore } from '@/stores/viewStore'

export function useWindowSize() {
  const setWindowWidth = useViewStore((state) => state.setWindowWidth)

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    handleResize()

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [setWindowWidth])
}
