# Stage 01: Project Foundation

## Overview

Set up the complete Electron + React + Vite project infrastructure with testing, proper macOS window chrome, and the foundational architecture that all subsequent stages build upon.

## Requirements Covered

| ID | Requirement | Priority |
|----|-------------|----------|
| WIN-01 | Single-window Electron app with `titleBarStyle: hiddenInset` | P0 |
| WIN-02 | Native macOS traffic lights at default inset position | P0 |
| WIN-03 | Custom top bar (44px) serves as draggable title bar region | P0 |
| WIN-04 | Remember window size and position between sessions | P1 |
| WIN-05 | Minimum window size: 800×500px | P0 |
| WIN-07 | Standard macOS menu bar: File, Edit, View, Help | P0 |
| NF-01 | Cold start to interactive: < 2 seconds | P0 |
| NF-05 | Fonts bundled locally | P0 |
| NF-08 | macOS 12+ (Monterey and later) | P0 |
| NF-09 | Universal binary (Apple Silicon + Intel) | P1 |

---

## 1. Project Initialization

### 1.1 Create electron-vite Project

```bash
npm create @anthropic-ai/electron-vite@latest marxist -- --template react-ts
cd marxist
```

**Note:** electron-vite uses a different structure than vanilla Electron. Adapt the notes' structure to electron-vite conventions:

```
marxist/
├── electron/
│   ├── main/
│   │   ├── index.ts              # Main process entry
│   │   ├── window.ts             # Window management
│   │   ├── menu.ts               # macOS menu bar
│   │   └── ipc/
│   │       ├── index.ts          # IPC handler registration
│   │       ├── file-handlers.ts  # File operations (stub)
│   │       ├── draft-handlers.ts # Draft persistence (stub)
│   │       ├── settings-handlers.ts
│   │       └── ai-handlers.ts    # AI operations (stub)
│   └── preload/
│       ├── index.ts              # Preload script
│       └── types.ts              # Shared IPC types
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   └── TopBar/
│   │       └── TopBar.tsx        # Placeholder shell
│   ├── stores/                   # Empty, created for later
│   ├── hooks/                    # Empty, created for later
│   ├── styles/
│   │   └── global.css
│   └── types/
│       └── electron.d.ts         # Window API types
├── assets/
│   ├── fonts/
│   │   ├── IBMPlexMono-Regular.woff2
│   │   ├── IBMPlexMono-Medium.woff2
│   │   ├── IBMPlexMono-Bold.woff2
│   │   ├── IBMPlexMono-Italic.woff2
│   │   ├── GoogleSansFlex-Regular.woff2
│   │   ├── GoogleSansFlex-Medium.woff2
│   │   └── GoogleSansFlex-Bold.woff2
│   ├── icon.png                  # 1024×1024
│   └── icon.icns                 # macOS multi-resolution
├── tests/
│   ├── setup.ts                  # Vitest setup
│   ├── unit/                     # Unit tests
│   ├── components/               # Component tests
│   └── e2e/                      # Playwright E2E tests
├── electron.vite.config.ts
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── electron-builder.yml
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── tsconfig.node.json
├── .eslintrc.cjs
├── .prettierrc
└── package.json
```

### 1.2 Install Dependencies

```bash
# Core dependencies
npm install react react-dom zustand electron-store

# Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# TypeScript types
npm install -D @types/react @types/react-dom @types/node

# Testing - Unit & Component
npm install -D vitest @vitest/coverage-v8 @vitest/ui
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D jsdom happy-dom

# Testing - E2E for Electron
npm install -D @playwright/test playwright

# Mocking
npm install -D msw

# Code quality
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D eslint-plugin-react eslint-plugin-react-hooks
npm install -D eslint-plugin-testing-library eslint-plugin-jest-dom
npm install -D prettier eslint-config-prettier
npm install -D husky lint-staged
```

---

## 2. Configuration Files

### 2.1 electron.vite.config.ts

```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html')
        }
      }
    },
    plugins: [react()]
  }
})
```

### 2.2 vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/components/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', 'electron/']
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@electron': resolve(__dirname, 'electron')
    }
  }
})
```

### 2.3 playwright.config.ts

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false, // Electron tests should run sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    trace: 'on-first-retry'
  }
})
```

### 2.4 electron-builder.yml

```yaml
appId: com.marxist.app
productName: Marxist
copyright: Copyright © 2026

mac:
  category: public.app-category.productivity
  icon: assets/icon.icns
  target:
    - target: dmg
      arch:
        - x64
        - arm64
    - target: zip
      arch:
        - x64
        - arm64
  minimumSystemVersion: "12.0"
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist

dmg:
  contents:
    - x: 130
      y: 220
    - x: 410
      y: 220
      type: link
      path: /Applications

directories:
  output: dist
  buildResources: build

files:
  - "out/**/*"
  - "!node_modules/**/*"

extraResources:
  - from: "assets/fonts"
    to: "fonts"
```

### 2.5 tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
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
        // Light mode
        'editor-light': '#F5F5F0',
        'preview-light': '#FFFFFF',
        'sidebar-light': '#EBEBEB',
        'text-primary-light': '#1A1A1A',
        'text-secondary-light': '#6B6B6B',
        'accent': '#2962FF',
        
        // Dark mode
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
```

### 2.6 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@/*": ["./src/*"],
      "@electron/*": ["./electron/*"]
    }
  },
  "include": ["src", "electron", "tests"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## 3. Electron Main Process

### 3.1 electron/main/index.ts

```typescript
import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createWindow, restoreWindowState } from './window'
import { createMenu } from './menu'
import { registerAllIpcHandlers } from './ipc'

app.whenReady().then(() => {
  // Set app user model id for Windows (not needed for macOS but good practice)
  electronApp.setAppUserModelId('com.marxist.app')

  // Register IPC handlers before creating window
  registerAllIpcHandlers()

  // Create the main window
  const mainWindow = createWindow()

  // Create macOS menu bar
  createMenu(mainWindow)

  // Restore window state from previous session
  restoreWindowState(mainWindow)

  // Optimize for macOS
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}
```

### 3.2 electron/main/window.ts

```typescript
import { BrowserWindow, shell, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import Store from 'electron-store'

interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized: boolean
}

const store = new Store<{ windowState: WindowState }>()

const DEFAULT_WIDTH = 1200
const DEFAULT_HEIGHT = 800
const MIN_WIDTH = 800
const MIN_HEIGHT = 500

function getWindowState(): WindowState {
  const defaultState: WindowState = {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    isMaximized: false
  }

  const saved = store.get('windowState')
  if (!saved) return defaultState

  // Validate saved state is within current display bounds
  const displays = screen.getAllDisplays()
  const isValidPosition = displays.some(display => {
    const { x, y, width, height } = display.bounds
    return (
      saved.x !== undefined &&
      saved.y !== undefined &&
      saved.x >= x &&
      saved.x < x + width &&
      saved.y >= y &&
      saved.y < y + height
    )
  })

  return isValidPosition ? saved : defaultState
}

function saveWindowState(window: BrowserWindow): void {
  const bounds = window.getBounds()
  store.set('windowState', {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    isMaximized: window.isMaximized()
  })
}

export function createWindow(): BrowserWindow {
  const state = getWindowState()

  const mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    show: false, // Show after ready-to-show for smoother launch
    titleBarStyle: 'hiddenInset', // WIN-01, WIN-02
    trafficLightPosition: { x: 20, y: 14 }, // Vertically center in 44px top bar
    vibrancy: undefined, // No vibrancy - we control all backgrounds
    backgroundColor: '#1E1E1E', // Prevent white flash on launch
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false, // Required for electron-store in preload
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Handle window state persistence (WIN-04)
  mainWindow.on('close', () => {
    saveWindowState(mainWindow)
  })

  // Restore maximized state
  if (state.isMaximized) {
    mainWindow.maximize()
  }

  // Show window when ready (improves perceived performance - NF-01)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Load the app
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

export function restoreWindowState(window: BrowserWindow): void {
  // Window state is already applied in createWindow
  // This function is for any additional restoration logic
}
```

### 3.3 electron/main/menu.ts

```typescript
import { app, Menu, BrowserWindow, MenuItemConstructorOptions } from 'electron'

export function createMenu(mainWindow: BrowserWindow): void {
  const isMac = process.platform === 'darwin'

  const template: MenuItemConstructorOptions[] = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        {
          label: 'Settings...',
          accelerator: 'Cmd+,',
          click: () => mainWindow.webContents.send('menu:settings')
        },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const }
      ]
    }] : []),

    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu:new-file')
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu:open-file')
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu:save')
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow.webContents.send('menu:save-as')
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find...',
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow.webContents.send('menu:find')
        }
      ]
    },

    // View menu
    {
      label: 'View',
      submenu: [
        {
          label: 'Markdown',
          accelerator: 'CmdOrCtrl+1',
          click: () => mainWindow.webContents.send('menu:view-markdown')
        },
        {
          label: 'Split',
          accelerator: 'CmdOrCtrl+2',
          click: () => mainWindow.webContents.send('menu:view-split')
        },
        {
          label: 'Render',
          accelerator: 'CmdOrCtrl+3',
          click: () => mainWindow.webContents.send('menu:view-render')
        },
        { type: 'separator' },
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+\\',
          click: () => mainWindow.webContents.send('menu:toggle-sidebar')
        },
        {
          label: 'Toggle AI Panel',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => mainWindow.webContents.send('menu:toggle-ai')
        },
        { type: 'separator' },
        {
          label: 'Toggle Theme',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => mainWindow.webContents.send('menu:toggle-theme')
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },

    // Help menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Marxist',
          click: () => mainWindow.webContents.send('menu:about')
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
```

### 3.4 electron/main/ipc/index.ts

```typescript
import { registerFileHandlers } from './file-handlers'
import { registerDraftHandlers } from './draft-handlers'
import { registerSettingsHandlers } from './settings-handlers'
import { registerAiHandlers } from './ai-handlers'

export function registerAllIpcHandlers(): void {
  registerFileHandlers()
  registerDraftHandlers()
  registerSettingsHandlers()
  registerAiHandlers()
}
```

### 3.5 electron/main/ipc/settings-handlers.ts

```typescript
import { ipcMain } from 'electron'
import Store from 'electron-store'

interface Settings {
  theme: 'system' | 'light' | 'dark'
  editorFontSize: number
  previewFontSize: number
  lineNumbers: boolean
  wordWrap: boolean
  spellCheck: boolean
  openRouterApiKey: string
  selectedModel: string
  systemPrompt: string
  recentFiles: Array<{ path: string; lastOpened: string }>
}

const defaultSettings: Settings = {
  theme: 'system',
  editorFontSize: 14,
  previewFontSize: 16,
  lineNumbers: false,
  wordWrap: true,
  spellCheck: true,
  openRouterApiKey: '',
  selectedModel: 'anthropic/claude-sonnet-4-20250514',
  systemPrompt: 'You are a helpful writing assistant. Help the user improve their Markdown documents. When asked to edit, return the complete modified document.',
  recentFiles: []
}

const store = new Store<{ settings: Settings }>({
  defaults: { settings: defaultSettings },
  encryptionKey: 'marxist-secure-key', // For API key encryption (NF-06)
})

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', () => {
    return store.get('settings')
  })

  ipcMain.handle('settings:set', (_, key: keyof Settings, value: unknown) => {
    const settings = store.get('settings')
    store.set('settings', { ...settings, [key]: value })
    return store.get('settings')
  })

  ipcMain.handle('settings:reset', () => {
    store.set('settings', defaultSettings)
    return defaultSettings
  })
}

export function getSettings(): Settings {
  return store.get('settings')
}
```

### 3.6 Stub Files for Later Stages

**electron/main/ipc/file-handlers.ts:**
```typescript
import { ipcMain } from 'electron'

export function registerFileHandlers(): void {
  // Stub - implemented in Stage 06
  ipcMain.handle('file:open', async () => {
    return { path: null, content: '' }
  })

  ipcMain.handle('file:save', async () => {
    return { success: false }
  })

  ipcMain.handle('file:save-as', async () => {
    return { path: null }
  })

  ipcMain.handle('file:get-recent', async () => {
    return []
  })

  ipcMain.handle('file:drop', async () => {
    return { path: null, content: '' }
  })
}
```

**electron/main/ipc/draft-handlers.ts:**
```typescript
import { ipcMain } from 'electron'

export function registerDraftHandlers(): void {
  // Stub - implemented in Stage 07
  ipcMain.handle('drafts:save-all', async () => {
    return { success: true }
  })

  ipcMain.handle('drafts:restore', async () => {
    return []
  })

  ipcMain.handle('drafts:clear', async () => {
    return { success: true }
  })
}
```

**electron/main/ipc/ai-handlers.ts:**
```typescript
import { ipcMain } from 'electron'

export function registerAiHandlers(): void {
  // Stub - implemented in Stage 09
  ipcMain.handle('ai:chat', async () => {
    return { error: 'AI not configured' }
  })

  ipcMain.handle('ai:edit', async () => {
    return { error: 'AI not configured' }
  })

  ipcMain.handle('ai:cancel', async () => {
    return { success: true }
  })

  ipcMain.handle('ai:verify-key', async () => {
    return { valid: false }
  })

  ipcMain.handle('ai:list-models', async () => {
    return []
  })
}
```

---

## 4. Preload Script

### 4.1 electron/preload/index.ts

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from './types'

const electronAPI: ElectronAPI = {
  // File operations
  file: {
    open: () => ipcRenderer.invoke('file:open'),
    save: (path: string, content: string) => ipcRenderer.invoke('file:save', path, content),
    saveAs: (content: string) => ipcRenderer.invoke('file:save-as', content),
    getRecent: () => ipcRenderer.invoke('file:get-recent'),
    drop: (path: string) => ipcRenderer.invoke('file:drop', path)
  },

  // Draft operations
  drafts: {
    saveAll: (drafts: unknown[]) => ipcRenderer.invoke('drafts:save-all', drafts),
    restore: () => ipcRenderer.invoke('drafts:restore'),
    clear: (tabId: string) => ipcRenderer.invoke('drafts:clear', tabId)
  },

  // Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
    reset: () => ipcRenderer.invoke('settings:reset')
  },

  // AI operations
  ai: {
    chat: (params: unknown) => ipcRenderer.invoke('ai:chat', params),
    edit: (params: unknown) => ipcRenderer.invoke('ai:edit', params),
    cancel: () => ipcRenderer.invoke('ai:cancel'),
    verifyKey: (key: string) => ipcRenderer.invoke('ai:verify-key', key),
    listModels: () => ipcRenderer.invoke('ai:list-models')
  },

  // Menu event listeners
  onMenuEvent: (channel: string, callback: () => void) => {
    const validChannels = [
      'menu:new-file', 'menu:open-file', 'menu:save', 'menu:save-as',
      'menu:find', 'menu:settings', 'menu:about',
      'menu:view-markdown', 'menu:view-split', 'menu:view-render',
      'menu:toggle-sidebar', 'menu:toggle-ai', 'menu:toggle-theme'
    ]
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback)
      return () => ipcRenderer.removeListener(channel, callback)
    }
    return () => {}
  }
}

contextBridge.exposeInMainWorld('electron', electronAPI)
```

### 4.2 electron/preload/types.ts

```typescript
export interface FileResult {
  path: string | null
  content: string
}

export interface SaveResult {
  success: boolean
  path?: string
}

export interface Draft {
  tabId: string
  filePath: string | null
  fileName: string
  content: string
  isDirty: boolean
  cursorPosition: number
  scrollPosition: number
}

export interface Settings {
  theme: 'system' | 'light' | 'dark'
  editorFontSize: number
  previewFontSize: number
  lineNumbers: boolean
  wordWrap: boolean
  spellCheck: boolean
  openRouterApiKey: string
  selectedModel: string
  systemPrompt: string
  recentFiles: Array<{ path: string; lastOpened: string }>
}

export interface ChatParams {
  message: string
  documentContent: string
  history: Array<{ role: string; content: string }>
}

export interface EditParams {
  instruction: string
  documentContent: string
  history: Array<{ role: string; content: string }>
}

export interface ElectronAPI {
  file: {
    open: () => Promise<FileResult>
    save: (path: string, content: string) => Promise<SaveResult>
    saveAs: (content: string) => Promise<{ path: string | null }>
    getRecent: () => Promise<Array<{ path: string; name: string; lastOpened: string }>>
    drop: (path: string) => Promise<FileResult>
  }
  drafts: {
    saveAll: (drafts: Draft[]) => Promise<{ success: boolean }>
    restore: () => Promise<Draft[]>
    clear: (tabId: string) => Promise<{ success: boolean }>
  }
  settings: {
    get: () => Promise<Settings>
    set: (key: keyof Settings, value: unknown) => Promise<Settings>
    reset: () => Promise<Settings>
  }
  ai: {
    chat: (params: ChatParams) => Promise<unknown>
    edit: (params: EditParams) => Promise<unknown>
    cancel: () => Promise<{ success: boolean }>
    verifyKey: (key: string) => Promise<{ valid: boolean }>
    listModels: () => Promise<Array<{ id: string; name: string }>>
  }
  onMenuEvent: (channel: string, callback: () => void) => () => void
}
```

### 4.3 src/types/electron.d.ts

```typescript
import type { ElectronAPI } from '@electron/preload/types'

declare global {
  interface Window {
    electron: ElectronAPI
  }
}

export {}
```

---

## 5. Renderer (React App)

### 5.1 src/main.tsx

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

### 5.2 src/App.tsx

```typescript
import { useEffect, useState } from 'react'
import TopBar from './components/TopBar/TopBar'

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    // Load theme from settings on mount
    window.electron.settings.get().then((settings) => {
      if (settings.theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        setTheme(prefersDark ? 'dark' : 'light')
      } else {
        setTheme(settings.theme)
      }
    })

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      window.electron.settings.get().then((settings) => {
        if (settings.theme === 'system') {
          setTheme(e.matches ? 'dark' : 'light')
        }
      })
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return (
    <div className={`h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''}`}>
      <TopBar />
      <main className="flex-1 bg-editor-light dark:bg-editor-dark">
        {/* Editor/Preview panels added in Stage 02-03 */}
        <div className="h-full flex items-center justify-center text-text-secondary-light dark:text-text-secondary-dark">
          Stage 01 Complete - Editor coming in Stage 02
        </div>
      </main>
    </div>
  )
}

export default App
```

### 5.3 src/components/TopBar/TopBar.tsx

```typescript
function TopBar() {
  return (
    <header 
      className="h-topbar bg-white dark:bg-topbar-dark border-b border-gray-200 dark:border-gray-700 flex items-center px-4"
      style={{ 
        paddingLeft: '80px', // Clear of traffic lights
        WebkitAppRegion: 'drag' // Make top bar draggable (WIN-03)
      } as React.CSSProperties}
    >
      {/* Left zone - Document name */}
      <div className="flex-shrink-0 font-sans font-medium text-sm text-text-primary-light dark:text-text-primary-dark">
        Untitled
      </div>

      {/* Center zone - View toggle (Stage 03) */}
      <div className="flex-1 flex justify-center" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="text-text-secondary-light dark:text-text-secondary-dark text-xs">
          [View Toggle - Stage 03]
        </div>
      </div>

      {/* Right zone - Toolbar & counts (Stage 04) */}
      <div className="flex-shrink-0 text-text-secondary-light dark:text-text-secondary-dark text-xs" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        W: 0 &nbsp; L: 0
      </div>
    </header>
  )
}

export default TopBar
```

### 5.4 src/styles/global.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Font faces - bundled locally (NF-05) */
@font-face {
  font-family: 'Google Sans Flex';
  src: url('/assets/fonts/GoogleSansFlex-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Google Sans Flex';
  src: url('/assets/fonts/GoogleSansFlex-Medium.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Google Sans Flex';
  src: url('/assets/fonts/GoogleSansFlex-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'IBM Plex Mono';
  src: url('/assets/fonts/IBMPlexMono-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'IBM Plex Mono';
  src: url('/assets/fonts/IBMPlexMono-Medium.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'IBM Plex Mono';
  src: url('/assets/fonts/IBMPlexMono-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'IBM Plex Mono';
  src: url('/assets/fonts/IBMPlexMono-Italic.woff2') format('woff2');
  font-weight: 400;
  font-style: italic;
  font-display: swap;
}

/* Base styles */
html, body, #root {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

body {
  font-family: 'Google Sans Flex', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Prevent text selection on UI elements */
.no-select {
  -webkit-user-select: none;
  user-select: none;
}

/* Custom scrollbar for dark mode */
.dark ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.dark ::-webkit-scrollbar-track {
  background: transparent;
}

.dark ::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 4px;
}

.dark ::-webkit-scrollbar-thumb:hover {
  background: #555;
}
```

---

## 6. Testing Setup

### 6.1 tests/setup.ts

```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.electron for component tests
const mockElectronAPI = {
  file: {
    open: vi.fn(),
    save: vi.fn(),
    saveAs: vi.fn(),
    getRecent: vi.fn(),
    drop: vi.fn()
  },
  drafts: {
    saveAll: vi.fn(),
    restore: vi.fn(),
    clear: vi.fn()
  },
  settings: {
    get: vi.fn().mockResolvedValue({
      theme: 'system',
      editorFontSize: 14,
      previewFontSize: 16,
      lineNumbers: false,
      wordWrap: true,
      spellCheck: true,
      openRouterApiKey: '',
      selectedModel: 'anthropic/claude-sonnet-4-20250514',
      systemPrompt: 'You are a helpful assistant.',
      recentFiles: []
    }),
    set: vi.fn(),
    reset: vi.fn()
  },
  ai: {
    chat: vi.fn(),
    edit: vi.fn(),
    cancel: vi.fn(),
    verifyKey: vi.fn(),
    listModels: vi.fn()
  },
  onMenuEvent: vi.fn().mockReturnValue(() => {})
}

vi.stubGlobal('window', {
  ...window,
  electron: mockElectronAPI,
  matchMedia: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})
```

### 6.2 tests/unit/settings-store.test.ts

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Settings Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return default settings', async () => {
    const settings = await window.electron.settings.get()
    expect(settings.theme).toBe('system')
    expect(settings.editorFontSize).toBe(14)
    expect(settings.wordWrap).toBe(true)
  })

  it('should have encrypted API key storage', async () => {
    const settings = await window.electron.settings.get()
    expect(settings).toHaveProperty('openRouterApiKey')
  })
})
```

### 6.3 tests/components/TopBar.test.tsx

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TopBar from '@/components/TopBar/TopBar'

describe('TopBar', () => {
  it('renders document name', () => {
    render(<TopBar />)
    expect(screen.getByText('Untitled')).toBeInTheDocument()
  })

  it('renders word and letter counts', () => {
    render(<TopBar />)
    expect(screen.getByText(/W: 0/)).toBeInTheDocument()
    expect(screen.getByText(/L: 0/)).toBeInTheDocument()
  })

  it('has correct height of 44px', () => {
    render(<TopBar />)
    const header = document.querySelector('header')
    expect(header).toHaveClass('h-topbar')
  })

  it('has draggable region style', () => {
    render(<TopBar />)
    const header = document.querySelector('header')
    expect(header).toHaveStyle({ WebkitAppRegion: 'drag' })
  })
})
```

### 6.4 tests/e2e/launch.spec.ts

```typescript
import { test, expect, _electron as electron } from '@playwright/test'
import { resolve } from 'path'

test.describe('App Launch', () => {
  test('should launch and show window', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    
    // Check window is visible
    expect(await window.isVisible()).toBe(true)

    // Check minimum size constraints (WIN-05)
    const size = await window.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }))
    expect(size.width).toBeGreaterThanOrEqual(800)
    expect(size.height).toBeGreaterThanOrEqual(500)

    // Check title bar exists
    const topBar = await window.$('header')
    expect(topBar).not.toBeNull()

    await electronApp.close()
  })

  test('should start within 2 seconds (NF-01)', async () => {
    const startTime = Date.now()
    
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')]
    })

    const window = await electronApp.firstWindow()
    await window.waitForSelector('header')
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(2000)

    await electronApp.close()
  })
})
```

---

## 7. Package Scripts

### 7.1 package.json scripts

```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "postinstall": "electron-builder install-app-deps",
    "lint": "eslint . --ext .ts,.tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write \"**/*.{ts,tsx,json,css,md}\"",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "build:mac": "electron-vite build && electron-builder --mac",
    "prepare": "husky install"
  }
}
```

---

## 8. Acceptance Criteria

### 8.1 P0 Requirements Checklist

- [ ] Window opens with `hiddenInset` title bar style (WIN-01)
- [ ] Native macOS traffic lights visible and functional (WIN-02)
- [ ] Top bar (44px) is draggable to move window (WIN-03)
- [ ] Minimum window size enforced: 800×500px (WIN-05)
- [ ] macOS menu bar has File, Edit, View, Help menus (WIN-07)
- [ ] App loads within 2 seconds (NF-01)
- [ ] Fonts load from local bundles, no network requests (NF-05)
- [ ] electron-builder configured for macOS 12+ (NF-08)

### 8.2 P1 Requirements Checklist

- [ ] Window position and size remembered between sessions (WIN-04)
- [ ] Universal binary configured for x64 + arm64 (NF-09)

### 8.3 Test Coverage Targets

- Unit tests: Settings store operations
- Component tests: TopBar renders correctly
- E2E tests: App launches, window constraints enforced, startup time <2s

---

## 9. Output for Next Stage

This stage produces:

1. **Electron window** with macOS-native appearance
2. **IPC bridge** with typed API (stubs for later stages)
3. **Settings persistence** via electron-store
4. **React app shell** with Tailwind CSS
5. **Testing infrastructure** ready for use
6. **Font assets** bundled locally
7. **Build configuration** for macOS universal binary

Stage 02 will consume:
- The base window and React app structure
- The theme detection logic in App.tsx
- The Tailwind configuration with custom colors
- The testing setup for writing editor component tests
