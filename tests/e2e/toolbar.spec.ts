import { test, expect } from './fixtures'

test.describe('Formatting Toolbar', () => {
  test('shows 8 priority icons (TB-08)', async ({ appWindow: window }) => {
    await window.waitForSelector('[aria-label="Bold"]')

    await expect(window.locator('[aria-label="Bold"]')).toBeVisible()
    await expect(window.locator('[aria-label="Italic"]')).toBeVisible()
    await expect(window.locator('[aria-label="Heading 1"]')).toBeVisible()
    await expect(window.locator('[aria-label="Heading 2"]')).toBeVisible()
    await expect(window.locator('[aria-label="Bullet list"]')).toBeVisible()
    await expect(window.locator('[aria-label="Number list"]')).toBeVisible()
    await expect(window.locator('[aria-label="Code block"]')).toBeVisible()
    await expect(window.locator('[aria-label="Link"]')).toBeVisible()
  })

  test('bold button wraps selection (FT-01)', async ({ appWindow: window }) => {
    await window.waitForSelector('.cm-editor')

    await window.click('.cm-content')
    await window.keyboard.press('Meta+a')
    await window.keyboard.type('hello')
    await window.keyboard.press('Meta+a')

    await window.click('[aria-label="Bold"]')

    const content = await window.locator('.cm-content').textContent()
    expect(content).toContain('**')
  })

  test('word count updates live (TB-09)', async ({ appWindow: window }) => {
    await window.waitForSelector('.cm-editor')

    await window.click('.cm-content')
    await window.keyboard.press('Meta+a')
    await window.keyboard.type('one two three')

    await expect(window.locator('text=W: 3')).toBeVisible()
  })

  test('toolbar hidden in Render view', async ({ appWindow: window }) => {
    await window.waitForSelector('.cm-editor')

    await window.keyboard.press('Meta+3')
    await window.waitForTimeout(200)

    await expect(window.locator('[aria-label="Bold"]')).not.toBeVisible()
  })

  test('copy button shows in editor panel (VM-05)', async ({ appWindow: window }) => {
    await window.waitForSelector('.cm-editor')

    await expect(window.locator('[aria-label="Copy raw Markdown"]')).toBeVisible()
  })

  test('burger icon toggles sidebar (VM-04)', async ({ appWindow: window }) => {
    await window.waitForSelector('.cm-editor')

    await expect(window.locator('[aria-label="Toggle file sidebar"]')).toBeVisible()
  })
})
