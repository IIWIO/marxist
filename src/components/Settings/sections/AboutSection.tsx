import { useState, useEffect } from 'react'

export default function AboutSection() {
  const [appVersion, setAppVersion] = useState('1.0.0')

  useEffect(() => {
    if (window.electron?.app?.getVersion) {
      window.electron.app.getVersion().then(setAppVersion).catch(() => {})
    }
  }, [])

  return (
    <div className="flex flex-col items-center text-center py-8">
      <div className="w-24 h-24 mb-4 flex items-center justify-center bg-gradient-to-br from-accent to-accent-dark rounded-2xl shadow-lg">
        <span className="text-4xl text-white font-bold">M</span>
      </div>

      <h3 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-1">
        Marxist
      </h3>

      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
        Version {appVersion}
      </p>

      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark max-w-sm">
        A beautiful Markdown editor for macOS with AI-powered assistance.
      </p>

      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 w-full">
        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
          Built with Electron, React, and CodeMirror
        </p>
      </div>
    </div>
  )
}
