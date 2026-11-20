import { expect, test, type Locator, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// ZMonthField and ZYearField on the Forest theme (pages/month-year-field.vue): a month and a year entered from the
// keyboard and picked from their calendars, the limits' error mark, and in light and dark the theme's primary marking the
// open field, with no element carrying two same-property utilities. Each behavior in full is in
// apps/base/tests/month-year-field.spec.ts; the arithmetic is in scripts/month-entry.test.mjs and year-entry.test.mjs.
test.use({ timezoneId: 'America/Los_Angeles' })
const NOW = new Date('2026-11-13T05:30:00Z')

const hydrated = (page: Page) => page.waitForFunction(() => !!(document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__)

async function openPage(page: Page, mode: 'light' | 'dark' = 'light') {
  await page.clock.install({ time: NOW })
  await page.addInitScript((m) => localStorage.setItem('zooui-color-mode', m), mode)
  await page.goto('/month-year-field')
  await page.waitForLoadState('networkidle')
  await hydrated(page)
  if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
  else await expect(page.locator('html')).not.toHaveClass(/dark/)
}

const panel = (page: Page) => page.locator('[data-date-field-panel]')
const box = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true })

async function enter(input: Locator, text: string) {
  await input.click()
  await input.press('ControlOrMeta+a')
  await input.pressSequentially(text)
  await input.press('Enter')
}

test('a month, typed, stepped and picked', async ({ page }) => {
  await openPage(page)
  const input = box(page, 'Period')
  await enter(input, '7/26')
  await expect(input).toHaveValue('07/2026')
  await input.press('h')
  await expect(input).toHaveValue('08/2026')
  await input.press('y')
  await expect(input).toHaveValue('08/2025')
  await input.press('Alt+ArrowDown')
  await panel(page).locator('[data-value="2025-03-01"]').click()
  await expect(input).toHaveValue('03/2025')
  await expect(page.getByTestId('period-model')).toHaveText('PlainYearMonth 2025-03')
})

test('a year, typed, stepped and picked; bad text clears', async ({ page }) => {
  await openPage(page)
  const input = box(page, 'Fiscal year')
  await enter(input, '26')
  await expect(input).toHaveValue('2026')
  await input.press('-')
  await expect(input).toHaveValue('2025')
  await input.press('Alt+ArrowDown')
  await panel(page).getByRole('button', { name: '2029', exact: true }).click()
  await expect(input).toHaveValue('2029')
  await enter(input, 'abc')
  await expect(input).toHaveValue('')
  await expect(page.getByTestId('year-model')).toHaveText('null')
})

test('a refused month shows the form field\'s error', async ({ page }) => {
  await openPage(page)
  const input = box(page, 'Sprint month')
  await enter(input, '12/26')
  await expect(input).toHaveValue('05/2026')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Choose a month on or before 08/2026.')).toBeVisible()
})

for (const mode of ['light', 'dark'] as const) {
  test(`${mode}: the primary marks the open month and year fields; no element carries two same-property utilities`, async ({ page }) => {
    await openPage(page, mode)
    for (const [name, button] of [['Period', 'Choose a month'], ['Fiscal year', 'Choose a year']] as const) {
      const input = box(page, name)
      await input.click()
      await input.locator('..').getByRole('button', { name: button }).click()
      await expect(panel(page).locator('[data-selected]')).toBeVisible()
      const p = await page.evaluate(() => {
        const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
        const rgb = (c: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).join() }
        const probe = document.createElement('div'); probe.style.color = 'var(--ui-primary)'; document.body.append(probe)
        const primary = rgb(getComputedStyle(probe).color); probe.remove()
        const el = document.activeElement as HTMLInputElement
        return {
          primary,
          ring: rgb(getComputedStyle(el).getPropertyValue('--tw-ring-color')),
          icon: rgb(getComputedStyle(el.parentElement!.querySelector('button[aria-label^="Choose a"] > *')!).color),
          selected: rgb(getComputedStyle(document.querySelector('[data-date-field-panel] [data-selected]')!).backgroundColor),
        }
      })
      expect({ ring: p.ring, icon: p.icon, selected: p.selected }, name).toEqual({ ring: p.primary, icon: p.primary, selected: p.primary })
      expect(await page.evaluate(findConflicts), name).toEqual([])
      await input.press('Escape')
      await expect(panel(page)).toBeHidden()
    }
  })
}
