import type { ElectronAPI } from './ipc'

declare global {
  interface Window {
    electron: ElectronAPI
  }
}

export {}
