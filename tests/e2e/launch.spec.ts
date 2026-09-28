import { test, expect } from './fixtures'

test.describe('App Launch', () => {
  test('should launch and show window', async ({ appWindow }) => {
    const topBar = appWindow.locator('header')
    await expect(topBar).toBeVisible()

    const viewportSize = await appWindow.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }))
    expect(viewportSize.width).toBeGreaterThanOrEqual(800)
    expect(viewportSize.height).toBeGreaterThanOrEqual(500)
  })

  test('becomes interactive promptly (NF-01)', async ({ appWindow }) => {
    const startTime = Date.now()
    await appWindow.waitForSelector('header')
    expect(Date.now() - startTime).toBeLessThan(2000)
  })

  test('should have correct app title', async ({ appWindow }) => {
    const title = await appWindow.title()

    expect(title).toBe('Marxist')
  })
})
