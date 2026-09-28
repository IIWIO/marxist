import { Component, type ErrorInfo, type ReactNode } from 'react'
import { buildRecoveryPayload } from '@/utils/recovery'

interface State {
  error: Error | null
  saving: boolean
}

export default class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, saving: false }

  static getDerivedStateFromError(error: Error): State {
    return { error, saving: false }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Application render failure', error, info.componentStack)
  }

  private reload = async (): Promise<void> => {
    this.setState({ saving: true })
    const result = await window.electron.drafts.saveSnapshot(buildRecoveryPayload())
    if (!result.ok) {
      this.setState({ saving: false })
      await window.electron.file.showError('Recovery Save Failed', 'The app was not reloaded.', result.error)
      return
    }
    window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <main className="h-screen grid place-items-center bg-white dark:bg-[#1e1e1e] p-8">
        <div className="max-w-lg space-y-4 text-center">
          <h1 className="text-xl font-semibold">Marxist encountered an unexpected error</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Your open documents remain in memory. Reloading first writes a recovery snapshot.
          </p>
          <div className="flex justify-center gap-3">
            <button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={() => void this.reload()}>
              {this.state.saving ? 'Saving…' : 'Save and Reload'}
            </button>
            <button className="rounded border px-4 py-2" onClick={() => void window.electron.app.copyDiagnostics()}>
              Copy diagnostics
            </button>
          </div>
        </div>
      </main>
    )
  }
}
