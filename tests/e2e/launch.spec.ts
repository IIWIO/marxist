import { test, expect, _electron as electron } from '@playwright/test'
import { resolve } from 'path'

test.describe('App Launch', () => {
  test('should launch and show window', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')],
    })

    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    const topBar = page.locator('header')
    await expect(topBar).toBeVisible()

    const viewportSize = page.viewportSize()
    expect(viewportSize?.width).toBeGreaterThanOrEqual(800)
    expect(viewportSize?.height).toBeGreaterThanOrEqual(500)

    await electronApp.close()
  })

  test('should start within 2 seconds (NF-01)', async () => {
    const startTime = Date.now()

    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')],
    })

    const page = await electronApp.firstWindow()
    await page.waitForSelector('header')

    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(2000)

    await electronApp.close()
  })

  test('should have correct app title', async () => {
    const electronApp = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')],
    })

    const page = await electronApp.firstWindow()
    const title = await page.title()

    expect(title).toBe('Marxist')

    await electronApp.close()
  })
})
