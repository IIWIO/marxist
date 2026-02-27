import { useEffect, useRef, useCallback } from 'react'

export function useScrollbarAutohide(elementRef: React.RefObject<HTMLElement | null>) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleScroll = useCallback(() => {
    const element = elementRef.current
    if (!element) return

    element.classList.add('is-scrolling')

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      element.classList.remove('is-scrolling')
    }, 1000)
  }, [elementRef])

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    element.classList.add('scrollbar-autohide')
    element.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      element.classList.remove('scrollbar-autohide', 'is-scrolling')
      element.removeEventListener('scroll', handleScroll)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [elementRef, handleScroll])
}
