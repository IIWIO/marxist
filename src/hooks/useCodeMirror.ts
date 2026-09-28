import { useRef, useEffect, useCallback, useMemo } from 'react'
import { EditorState, Compartment, Transaction } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { openSearchPanel } from '@codemirror/search'
import { createExtensions, ExtensionConfig } from '@/components/Editor/extensions'
import type { EditorRef, EditorSnapshot } from '@/types/editor'

interface UseCodeMirrorOptions extends Omit<ExtensionConfig, 'onUpdate'> {
  initialContent?: string
  onChange?: (content: string) => void
}

export function useCodeMirror(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UseCodeMirrorOptions
): EditorRef {
  const viewRef = useRef<EditorView | null>(null)
  const compartmentRef = useRef<Compartment | null>(null)
  const optionsRef = useRef(options)
  const initializedRef = useRef(false)

  optionsRef.current = options

  useEffect(() => {
    if (!containerRef.current) return

    const compartment = new Compartment()
    compartmentRef.current = compartment

    const extensions = createExtensions({
      isDark: options.isDark,
      fontSize: options.fontSize,
      showLineNumbers: options.showLineNumbers,
      wordWrap: options.wordWrap,
      readOnly: options.readOnly,
      onUpdate: options.onChange,
      spellCheck: options.spellCheck,
      diffResult: options.diffResult,
    })

    const state = EditorState.create({
      doc: options.initialContent || '',
      extensions: compartment.of(extensions),
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view
    initializedRef.current = true

    return () => {
      view.destroy()
      viewRef.current = null
      compartmentRef.current = null
      initializedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef])

  useEffect(() => {
    if (!viewRef.current || !compartmentRef.current || !initializedRef.current) return

    const extensions = createExtensions({
      isDark: options.isDark,
      fontSize: options.fontSize,
      showLineNumbers: options.showLineNumbers,
      wordWrap: options.wordWrap,
      readOnly: options.readOnly,
      onUpdate: options.onChange,
      spellCheck: options.spellCheck,
      diffResult: options.diffResult,
    })

    viewRef.current.dispatch({
      effects: compartmentRef.current.reconfigure(extensions),
    })
  }, [
    options.isDark,
    options.fontSize,
    options.showLineNumbers,
    options.wordWrap,
    options.readOnly,
    options.onChange,
    options.spellCheck,
    options.diffResult,
  ])

  const getContent = useCallback((): string => {
    return viewRef.current?.state.doc.toString() || ''
  }, [])

  const setContent = useCallback((content: string): void => {
    if (!viewRef.current) return

    viewRef.current.dispatch({
      changes: {
        from: 0,
        to: viewRef.current.state.doc.length,
        insert: content,
      },
      annotations: Transaction.addToHistory.of(false),
    })
  }, [])

  const getSnapshot = useCallback((): EditorSnapshot => {
    const view = viewRef.current
    if (!view) {
      return { content: '', selection: { anchor: 0, head: 0 }, scrollTop: 0, scrollLeft: 0 }
    }

    const selection = view.state.selection.main
    return {
      content: view.state.doc.toString(),
      selection: { anchor: selection.anchor, head: selection.head },
      scrollTop: view.scrollDOM.scrollTop,
      scrollLeft: view.scrollDOM.scrollLeft,
    }
  }, [])

  const restoreSnapshot = useCallback((snapshot: EditorSnapshot): void => {
    const view = viewRef.current
    if (!view) return

    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: snapshot.content,
      },
      selection: {
        anchor: Math.min(snapshot.selection.anchor, snapshot.content.length),
        head: Math.min(snapshot.selection.head, snapshot.content.length),
      },
      annotations: Transaction.addToHistory.of(false),
    })

    requestAnimationFrame(() => {
      view.scrollDOM.scrollTop = snapshot.scrollTop
      view.scrollDOM.scrollLeft = snapshot.scrollLeft
    })
  }, [])

  const focus = useCallback((): void => {
    viewRef.current?.focus()
  }, [])

  const setReadOnly = useCallback((readOnly: boolean): void => {
    if (!viewRef.current || !compartmentRef.current) return

    const currentExtensions = createExtensions({
      ...optionsRef.current,
      readOnly,
      onUpdate: optionsRef.current.onChange,
    })

    viewRef.current.dispatch({
      effects: compartmentRef.current.reconfigure(currentExtensions),
    })
  }, [])

  const getState = useCallback(() => viewRef.current?.state || null, [])

  const restoreState = useCallback(
    (state: EditorState | null, content: string, cursor: number, scrollTop: number): void => {
      const view = viewRef.current
      if (!view) return
      if (state) view.setState(state)
      if (view.state.doc.toString() !== content) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: content },
          annotations: Transaction.addToHistory.of(false),
        })
      }
      const position = Math.min(cursor, view.state.doc.length)
      view.dispatch({ selection: { anchor: position } })
      requestAnimationFrame(() => {
        view.scrollDOM.scrollTop = scrollTop
      })
    },
    []
  )

  const find = useCallback((): void => {
    if (viewRef.current) openSearchPanel(viewRef.current)
  }, [])

  return useMemo(
    () => ({
      get view() {
        return viewRef.current
      },
      getContent,
      setContent,
      getSnapshot,
      restoreSnapshot,
      focus,
      setReadOnly,
      getState,
      restoreState,
      find,
    }),
    [find, focus, getContent, getSnapshot, getState, restoreSnapshot, restoreState, setContent, setReadOnly]
  )
}
