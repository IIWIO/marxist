import { useEffect } from 'react'
import { buildRecoveryPayload } from '@/utils/recovery'

export function useQuitHandler(): void {
  useEffect(() =>
    window.electron.onAppEvent('app:quit-requested', async ({ reason }) => {
      for (;;) {
        const result = await window.electron.app.saveBeforeQuit(buildRecoveryPayload())
        if (result.ok) {
          window.electron.app.readyToQuit(reason)
          return
        }
        const action = await window.electron.app.confirmQuitFailure(result.error)
        if (action === 'discard') {
          window.electron.app.readyToQuit(reason)
          return
        }
        if (action === 'cancel') return
      }
    }), [])
}
