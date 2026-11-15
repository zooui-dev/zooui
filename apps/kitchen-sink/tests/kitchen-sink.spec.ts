import { expect, test } from '@playwright/test'

// The kitchen sink's job is to be an HONEST baseline: Nuxt UI's own theme, every section rendering, and the
// behavior a hand-built system keeps getting wrong (focus trap, escape, focus return) still working.

test('every section renders, with no page or console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  for (const id of ['buttons', 'form', 'data', 'navigation', 'overlays', 'feedback']) {
    await expect(page.locator(`section#${id}`)).toBeVisible()
  }
  expect(errors).toEqual([])
})

// The bug this page had on its first run: specimens sized with w-full collapsed to 0px wide inside a
// shrink-to-fit row, so the progress bars and skeletons were invisible while "rendering".
test('specimens have width: nothing collapses to zero', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const widths = await page.evaluate(() =>
    [...document.querySelectorAll('[role="progressbar"], .animate-pulse, table')].map((el) => el.getBoundingClientRect().width))
  expect(widths.length).toBeGreaterThan(5)
  expect(widths.filter((w) => w < 4)).toEqual([])
})

// This is the DEFAULT theme: Nuxt UI's primary is green-500, not a Forest accent. If this fails, something
// has themed the baseline and it is no longer the thing v2 is measured against.
test('the theme is Nuxt UI\'s own: primary is its default green', async ({ page }) => {
  await page.goto('/')
  // --ui-primary resolves to a color. Nuxt UI's default primary is Tailwind's green-500; --color-green-500
  // itself is not emitted (Tailwind v4 only outputs theme variables something uses), so compare the value.
  const GREEN_500 = 'oklch(72.3% 0.219 149.579)'
  const primary = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-primary').trim())
  expect(primary).toBe(GREEN_500)
  const solid = await page.getByRole('button', { name: 'primary', exact: true }).first().evaluate((el) => getComputedStyle(el).backgroundColor)
  const asRgb = await page.evaluate((c) => { const d = document.createElement('div'); d.style.color = c; document.body.append(d); const v = getComputedStyle(d).color; d.remove(); return v }, GREEN_500)
  expect(solid).toBe(asRgb)
})

test('modal: opens, traps focus, Escape closes and focus returns', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const opener = page.getByRole('button', { name: 'Modal', exact: true })
  await opener.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Delete workspace?')).toBeVisible()
  // focus is inside the dialog, not left on the page behind it
  expect(await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null)).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(opener).toBeFocused()
})

test('dropdown menu: opens, arrow keys move through it, Escape closes', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Dropdown' }).click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await page.keyboard.press('ArrowDown')
  await expect(menu.getByRole('menuitem').first()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
})

test('toast: a toast appears with its description', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.locator('section#feedback').getByRole('button', { name: 'success' }).click()
  await expect(page.getByText('Success toast', { exact: true })).toBeVisible()
})

test('form: validates on submit and shows the shipped error styling', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText('An email address is required')).toBeVisible()
  await expect(page.getByText('At least 8 characters', { exact: true })).toBeVisible()
})

test('dark mode: the switch repaints the page', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  const light = await bg()
  await page.getByLabel('Dark mode').click()
  await expect.poll(bg).not.toBe(light)
  expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true)
})

// Reset must clear the form's STATE, not just the DOM: with a native type="reset", the inputs emptied but
// `state` kept the old values, so the next Submit validated what was no longer on screen and passed.
test('form: Reset clears the values and errors, so the next Submit validates what is on screen', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const form = page.locator('section#form form')
  await form.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText('An email address is required')).toBeVisible()

  await form.getByPlaceholder('you@example.com').fill('ada@example.com')
  await form.locator('input[type="password"]').fill('correct-horse')
  await form.getByRole('button', { name: 'Reset' }).click()
  await expect(form.getByPlaceholder('you@example.com')).toHaveValue('')
  await expect(page.getByText('An email address is required')).toHaveCount(0)   // errors cleared too

  await form.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText('An email address is required')).toBeVisible()   // validated the empty form
  await expect(page.getByText('Submitted', { exact: true })).toHaveCount(0)
})
