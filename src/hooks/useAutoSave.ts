import { useEffect } from 'react'
import { buildRecoveryPayload } from '@/utils/recovery'

const AUTO_SAVE_INTERVAL = 30_000

export function useAutoSave(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    let saving = false
    const save = async () => {
      if (saving) return
      saving = true
      try {
        const result = await window.electron.drafts.saveSnapshot(buildRecoveryPayload())
        if (!result.ok) throw new Error(result.error)
      } catch (error) {
        await window.electron.file.showError(
          'Auto-save Failed',
          'Marxist could not update its recovery snapshot.',
          error instanceof Error ? error.message : String(error)
        )
      } finally {
        saving = false
      }
    }
    const initial = window.setTimeout(() => void save(), 5_000)
    const interval = window.setInterval(() => void save(), AUTO_SAVE_INTERVAL)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
    }
  }, [enabled])
}
