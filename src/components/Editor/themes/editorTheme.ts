import { EditorView } from '@codemirror/view'

export const createEditorTheme = (isDark: boolean, fontSize: number) => {
  const colors = isDark
    ? {
        background: '#141414',
        foreground: '#E0E0E0',
        cursor: '#E0E0E0',
        selection: 'rgba(68, 138, 255, 0.3)',
        selectionMatch: 'rgba(68, 138, 255, 0.15)',
        lineHighlight: 'rgba(255, 255, 255, 0.03)',
        gutterBackground: '#141414',
        gutterForeground: '#555555',
        gutterBorder: '#333333',
        searchMatch: 'rgba(255, 183, 77, 0.3)',
        searchMatchSelected: 'rgba(255, 183, 77, 0.5)',
      }
    : {
        background: '#F5F5F0',
        foreground: '#1A1A1A',
        cursor: '#1A1A1A',
        selection: 'rgba(41, 98, 255, 0.2)',
        selectionMatch: 'rgba(41, 98, 255, 0.1)',
        lineHighlight: 'rgba(0, 0, 0, 0.02)',
        gutterBackground: '#F5F5F0',
        gutterForeground: '#999999',
        gutterBorder: '#E5E5E5',
        searchMatch: 'rgba(255, 152, 0, 0.3)',
        searchMatchSelected: 'rgba(255, 152, 0, 0.5)',
      }

  return EditorView.theme(
    {
      '&': {
        backgroundColor: colors.background,
        color: colors.foreground,
        fontSize: `${fontSize}px`,
        fontFamily: "'Google Sans Code', monospace",
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      },
      '.cm-scroller': {
        overflow: 'auto',
        flex: '1 1 0',
        minHeight: 0,
        fontFamily: "'Google Sans Code', monospace",
      },
      '.cm-content': {
        caretColor: colors.cursor,
        padding: '64px',
        fontFamily: "'Google Sans Code', monospace",
        lineHeight: '1.6',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: colors.cursor,
        borderLeftWidth: '2px',
      },
      '.cm-selectionBackground, ::selection': {
        backgroundColor: colors.selection,
      },
      '.cm-focused .cm-selectionBackground': {
        backgroundColor: colors.selection,
      },
      '.cm-selectionMatch': {
        backgroundColor: colors.selectionMatch,
      },
      '.cm-activeLine': {
        backgroundColor: colors.lineHighlight,
      },
      '.cm-gutters': {
        backgroundColor: colors.gutterBackground,
        color: colors.gutterForeground,
        border: 'none',
        borderRight: `1px solid ${colors.gutterBorder}`,
      },
      '.cm-activeLineGutter': {
        backgroundColor: colors.lineHighlight,
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 8px 0 16px',
        minWidth: '40px',
      },
      '.cm-panels': {
        backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
        color: colors.foreground,
        borderBottom: `1px solid ${colors.gutterBorder}`,
        fontFamily: "'Google Sans Flex', sans-serif",
      },
      '.cm-panel.cm-search': {
        padding: '12px 16px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignItems: 'center',
      },
      '.cm-panel.cm-search label': {
        fontFamily: "'Google Sans Flex', sans-serif",
        fontSize: '13px',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      },
      '.cm-panel.cm-search br': {
        display: 'none',
      },
      '.cm-searchMatch': {
        backgroundColor: colors.searchMatch,
        borderRadius: '2px',
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: colors.searchMatchSelected,
      },
      '.cm-panel input, .cm-panel button, .cm-panel label': {
        fontFamily: "'Google Sans Flex', sans-serif",
        fontSize: '13px',
      },
      '.cm-panel input[type="text"], .cm-panel input:not([type])': {
        backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF',
        color: colors.foreground,
        border: `1px solid ${isDark ? '#404040' : '#D1D5DB'}`,
        borderRadius: '8px',
        padding: '6px 12px',
        outline: 'none',
        minWidth: '180px',
        transition: 'border-color 0.15s ease',
      },
      '.cm-panel input[type="text"]:focus, .cm-panel input:not([type]):focus': {
        borderColor: isDark ? '#448AFF' : '#2962FF',
        boxShadow: isDark ? '0 0 0 2px rgba(68, 138, 255, 0.2)' : '0 0 0 2px rgba(41, 98, 255, 0.15)',
      },
      '.cm-panel input[type="checkbox"]': {
        width: '16px',
        height: '16px',
        accentColor: isDark ? '#448AFF' : '#2962FF',
        cursor: 'pointer',
      },
      '.cm-panel button': {
        backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF',
        color: colors.foreground,
        border: `1px solid ${isDark ? '#404040' : '#D1D5DB'}`,
        borderRadius: '8px',
        padding: '6px 14px',
        cursor: 'pointer',
        fontWeight: '500',
        transition: 'all 0.15s ease',
      },
      '.cm-panel button:hover': {
        backgroundColor: isDark ? '#363636' : '#F3F4F6',
        borderColor: isDark ? '#505050' : '#9CA3AF',
      },
      '.cm-panel button:active': {
        backgroundColor: isDark ? '#404040' : '#E5E7EB',
      },
      '.cm-panel button[name="close"]': {
        backgroundColor: 'transparent',
        border: 'none',
        padding: '4px 8px',
        opacity: '0.7',
      },
      '.cm-panel button[name="close"]:hover': {
        opacity: '1',
        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      },
      '.cm-tooltip': {
        backgroundColor: isDark ? '#2D2D2D' : '#FFFFFF',
        border: `1px solid ${colors.gutterBorder}`,
        borderRadius: '4px',
      },
      '.cm-scroller::-webkit-scrollbar': {
        width: '5px',
        height: '5px',
      },
      '.cm-scroller::-webkit-scrollbar-track': {
        background: 'transparent',
      },
      '.cm-scroller::-webkit-scrollbar-thumb': {
        backgroundColor: 'transparent',
        borderRadius: '3px',
        transition: 'background-color 0.3s ease',
      },
      '.cm-scroller.is-scrolling::-webkit-scrollbar-thumb': {
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.1)',
      },
      '.cm-line': {
        color: colors.foreground,
      },
    },
    { dark: isDark }
  )
}
