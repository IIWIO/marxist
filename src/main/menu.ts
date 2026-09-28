import { app, BrowserWindow, Menu } from 'electron'

type CheckForUpdates = (showNoUpdateDialog?: boolean) => Promise<void>

export function createApplicationMenu(window: BrowserWindow, checkForUpdates: CheckForUpdates): void {
  const isMac = process.platform === 'darwin'
  const send = (channel: string) => () => window.webContents.send(channel)
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' as const },
            { label: 'Check for Updates...', click: () => void checkForUpdates(true) },
            { type: 'separator' as const },
            { label: 'Settings...', accelerator: 'Cmd+,', click: send('menu:settings') },
            { type: 'separator' as const },
            { role: 'services' as const },
            { type: 'separator' as const },
            { role: 'hide' as const },
            { role: 'hideOthers' as const },
            { role: 'unhide' as const },
            { type: 'separator' as const },
            { role: 'quit' as const },
          ],
        }]
      : []),
    {
      label: 'File',
      submenu: [
        { label: 'New', accelerator: 'CmdOrCtrl+N', click: send('menu:new-file') },
        { label: 'Open...', accelerator: 'CmdOrCtrl+O', click: send('menu:open-file') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: send('menu:save') },
        { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: send('menu:save-as') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
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
        { label: 'Find...', accelerator: 'CmdOrCtrl+F', click: send('menu:find') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Markdown', accelerator: 'CmdOrCtrl+1', click: send('menu:view-markdown') },
        { label: 'Split', accelerator: 'CmdOrCtrl+2', click: send('menu:view-split') },
        { label: 'Render', accelerator: 'CmdOrCtrl+3', click: send('menu:view-render') },
        { type: 'separator' },
        { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+\\', click: send('menu:toggle-sidebar') },
        { label: 'Toggle AI Panel', accelerator: 'CmdOrCtrl+Shift+A', click: send('menu:toggle-ai') },
        { type: 'separator' },
        { label: 'Toggle Theme', accelerator: 'CmdOrCtrl+Shift+D', click: send('menu:toggle-theme') },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'togglefullscreen' },
        ...(!app.isPackaged
          ? ([{ type: 'separator' }, { role: 'reload' }, { role: 'toggleDevTools' }] as Electron.MenuItemConstructorOptions[])
          : []),
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Check for Updates...', click: () => void checkForUpdates(true) },
        { type: 'separator' },
        { label: 'About Marxist', click: () => app.showAboutPanel() },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
