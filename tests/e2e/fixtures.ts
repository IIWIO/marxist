import { test as base, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

interface ElectronFixtures {
  electronApp: ElectronApplication
  appWindow: Page
}

export const test = base.extend<ElectronFixtures>({
  electronApp: async ({}, use) => {
    const userDataDir = await mkdtemp(join(tmpdir(), 'marxist-e2e-'))
    const electronApp = await electron.launch({
      args: [
        resolve(__dirname, '../../out/main/index.js'),
        `--user-data-dir=${userDataDir}`,
      ],
    })

    try {
      await use(electronApp)
    } finally {
      const process = electronApp.process()
      process.kill('SIGKILL')
      if (process.exitCode === null) {
        await new Promise<void>((resolveExit) => process.once('exit', () => resolveExit()))
      }
      await rm(userDataDir, { recursive: true, force: true })
    }
  },

  appWindow: async ({ electronApp }, use) => {
    const appWindow = await electronApp.firstWindow()
    await appWindow.waitForLoadState('domcontentloaded')
    await use(appWindow)
  },
})

export { expect }
