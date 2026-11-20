import { expect, test, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// ZOptionalDate (specimens/OptionalDateSpecimen.vue) on Forest, in both modes: the checkbox's segment is one piece
// with the field (the input's own ground and ring), a ticked box is the scheme's primary, and a tick moves focus into
// the date. Its behavior is driven in apps/base/tests/optional-date.spec.ts.

const hydrated = (page: Page) => page.waitForFunction(() => !!(document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__)

async function open(page: Page, mode: 'light' | 'dark', scheme: string) {
  await page.context().addCookies([{ name: 'zooui-scheme', value: scheme, url: 'http://localhost' }])
  await page.addInitScript((m) => localStorage.setItem('zooui-color-mode', m), mode)
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await hydrated(page)
  if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
  else await expect(page.locator('html')).not.toHaveClass(/dark/)
}

const field = (page: Page, name: string) => page.locator(`[data-optional-date-specimen="${name}"]`)

/** The segment's ground and ring beside the input's, and the ticked box beside the primary, as canvas pixels. */
const paint = (page: Page) => page.evaluate(() => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  const rgb = (c: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).join() }
  const probe = document.createElement('div'); probe.style.color = 'var(--ui-primary)'; document.body.append(probe)
  const primary = rgb(getComputedStyle(probe).color); probe.remove()
  const root = document.querySelector('[data-optional-date-specimen="ends"] [data-optional-date]')!
  const segment = getComputedStyle(root.firstElementChild!)
  const input = getComputedStyle(root.querySelector('input')!)
  return {
    primary,
    box: rgb(getComputedStyle(root.querySelector('[role="checkbox"] [data-slot="indicator"]')!).backgroundColor),
    segment: { ground: rgb(segment.backgroundColor), ring: rgb(segment.getPropertyValue('--tw-ring-color')) },
    input: { ground: rgb(input.backgroundColor), ring: rgb(input.getPropertyValue('--tw-ring-color')) },
  }
})

for (const mode of ['light', 'dark'] as const) {
  for (const scheme of ['teal', 'ink-indigo']) {
    test(`ZOptionalDate (${mode}, ${scheme}): the segment is the input's ground and ring, a ticked box the primary`, async ({ page }) => {
      await open(page, mode, scheme)
      const p = await paint(page)
      expect(p.box).toBe(p.primary)
      expect(p.segment).toEqual(p.input)
      expect(await page.evaluate(findConflicts)).toEqual([])
    })
  }
}

test('ZOptionalDate on Forest: a tick enables the date and focuses it, ready to type', async ({ page }) => {
  await open(page, 'light', 'teal')
  const ext = page.getByRole('textbox', { name: 'Follow-up date', exact: true })
  await expect(ext).toBeDisabled()
  await field(page, 'ext').getByRole('checkbox', { name: 'Follow-up booked' }).click()
  await expect(ext).toBeEnabled()
  await expect.poll(() => ext.evaluate((el) => document.activeElement === el)).toBe(true)
  await page.keyboard.type('10/15/2026')
  await page.keyboard.press('Enter')
  await expect(ext).toHaveValue('10/15/2026')
})
