/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Google Sans Flex', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        'editor-light': '#F5F5F0',
        'preview-light': '#FFFFFF',
        'sidebar-light': '#EBEBEB',
        'text-primary-light': '#1A1A1A',
        'text-secondary-light': '#6B6B6B',
        'accent': '#2962FF',
        
        'editor-dark': '#141414',
        'preview-dark': '#1E1E1E',
        'sidebar-dark': '#181818',
        'topbar-dark': '#1E1E1E',
        'text-primary-dark': '#E0E0E0',
        'text-secondary-dark': '#888888',
        'accent-dark': '#448AFF',
      },
      spacing: {
        'topbar': '44px',
        'sidebar': '240px',
        'ai-panel': '360px',
      },
      minWidth: {
        'panel': '280px',
      },
      minHeight: {
        'window': '500px',
      }
    },
  },
  plugins: [],
}
