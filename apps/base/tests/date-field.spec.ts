import { expect, test, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// ZDateField on the theme-free base, in a product (specimens/DateFieldSpecimen.vue), against the
// production build: it paints in the product's palette and its input variant in both modes, keeps the product's
// placeholder ink, keeps its UFormField label through hydration, and its calendar icon — the first Z* icon that is
// not also one of Nuxt UI's defaults — comes from the client bundle the layer registers it in.

// "Today" is the browser's, so the test owns the browser's clock and zone (see apps/forest/tests/date-field.spec.ts).
test.use({ timezoneId: 'America/Los_Angeles' })
const NOW = new Date('2026-11-13T05:30:00Z')

/** Tailwind's palette values the product's app.config and main.css point at. */
const TW = {
  'sky-200': 'oklch(90.1% 0.058 230.902)', 'sky-400': 'oklch(74.6% 0.16 232.661)', 'sky-500': 'oklch(68.5% 0.169 237.323)',
  'sky-900': 'oklch(39.1% 0.09 240.876)',
} as const

const toggle = (page: Page) => page.getByRole('group', { name: 'Theme' })
/** Hydrated: ZThemeToggle renders on the client only, and its enabled buttons replace the server's disabled ones. */
const hydrated = (page: Page) => expect(toggle(page).getByRole('button', { name: 'dark', exact: true })).toBeEnabled()

const field = (page: Page, name: string) => page.locator(`[data-date-field="${name}"]`)
const panel = (page: Page) => page.locator('[data-date-field-panel]')

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: NOW })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await hydrated(page)
})

const setDark = async (page: Page) => {
  await page.evaluate(() => localStorage.setItem('product-color-mode', 'dark'))
  await page.reload()
  await page.waitForLoadState('networkidle')
  await hydrated(page)
  await expect(page.locator('html')).toHaveClass(/dark/)
}

/** Opens "Starts" (focused, with a date) and reads its colors beside the palette values they should be, all as canvas
 *  pixels, since computed colors can be oklch, color-mix or light-dark(). */
async function paint(page: Page, expected: Record<string, string>) {
  const input = page.getByRole('textbox', { name: 'Starts', exact: true })
  await input.click()
  await field(page, 'starts').getByRole('button', { name: 'Choose a date' }).click()
  await expect(panel(page).locator('[data-selected]')).toBeVisible()
  return page.evaluate((want) => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
    const probe = document.createElement('div'); document.body.append(probe)
    const rgb = (c: string) => {
      probe.style.color = c; ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = getComputedStyle(probe).color; ctx.fillRect(0, 0, 1, 1)
      return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).join()
    }
    const starts = document.querySelector<HTMLInputElement>('[data-date-field="starts"] input')!
    const ends = document.querySelector<HTMLInputElement>('[data-date-field="ends"] input')!
    const cs = getComputedStyle(starts)
    const got = {
      text: rgb(cs.color),
      ring: rgb(cs.getPropertyValue('--tw-ring-color')),
      icon: rgb(getComputedStyle(starts.parentElement!.querySelector('button[aria-label="Choose a date"] > *')!).color),
      selected: rgb(getComputedStyle(document.querySelector('[data-date-field-panel] [data-selected]')!).backgroundColor),
      placeholder: rgb(getComputedStyle(ends, '::placeholder').color),
    }
    const wanted = Object.fromEntries(Object.entries(want).map(([k, v]) => [k, rgb(v)]))
    probe.remove()
    return { got, wanted }
  }, expected)
}

for (const mode of ['light', 'dark'] as const) {
  test(`ZDateField (${mode}): the product's input variant and primary, and its own placeholder ink`, async ({ page }) => {
    if (mode === 'dark') await setDark(page)
    // The value ink is the product's input variant (app.config: text-val-input); the ring, the focused icon and the
    // picked day are its primary (sky: 500 light, 400 dark, by Nuxt UI's rule); the placeholder is Nuxt UI's dimmed
    // ink in the product's neutral (slate), not one the component chose.
    const primary = mode === 'light' ? TW['sky-500'] : TW['sky-400']
    const { got, wanted } = await paint(page, {
      text: mode === 'light' ? TW['sky-900'] : TW['sky-200'],
      ring: primary, icon: primary, selected: primary,
      placeholder: 'var(--ui-text-dimmed)',
    })
    expect(got).toEqual(wanted)
  })

  test(`guards (${mode}): open and focused, no element carries two same-property utilities`, async ({ page }) => {
    if (mode === 'dark') await setDark(page)
    await page.getByRole('textbox', { name: 'Starts', exact: true }).click()
    await expect(field(page, 'starts').getByRole('button', { name: 'Clear date' })).toBeVisible()
    await field(page, 'starts').getByRole('button', { name: 'Choose a date' }).click()
    await expect(panel(page)).toBeVisible()
    expect(await page.evaluate(findConflicts)).toEqual([])
  })
}

// A focused input already has Nuxt UI's primary focus ring, so the open field's highlight shows once focus moves into
// the calendar (paging a month): the field stays ringed in the primary, not the product's input line (sky-600).
test('ZDateField: with focus in its open calendar, the field keeps the primary ring', async ({ page }) => {
  const { got, wanted } = await paint(page, { ring: TW['sky-500'] })
  expect(got.ring).toBe(wanted.ring)
  await panel(page).getByRole('button', { name: /next month/i }).click()
  await expect(panel(page)).toContainText('June 2026')
  expect(await page.evaluate(() => document.activeElement?.closest('[data-date-field-panel]') != null)).toBe(true)
  const ring = await page.locator('[data-date-field="starts"] input').evaluate((el) => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
    ctx.fillStyle = getComputedStyle(el).getPropertyValue('--tw-ring-color'); ctx.fillRect(0, 0, 1, 1)
    return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).join()
  })
  expect(ring).toBe(wanted.ring)
})

// Round-trip: every server-rendered DateField is named by its label after a fresh load. These fields sit in a
// data-loading component behind svg icons, and each field's own calendar icon is one more boundary before the
// next: with Nuxt's client tree-shake of onServerPrefetch, the browser's useId() ids drift from the server's and
// hydration leaves each label pointing at an id that is gone. The base keeps the call.
test('UFormField labels still name ZDateField after hydration (production build)', async ({ page }) => {
  for (const [name, label, value] of [['starts', 'Starts', '05/12/2026'], ['ends', 'Ends', '']] as const) {
    const r = await field(page, name).evaluate((el) => ({ for: el.querySelector('label')!.htmlFor, id: el.querySelector('input')!.id }))
    expect(r.for, name).not.toBe('')
    expect(r.for, name).toBe(r.id)
    const input = page.getByRole('textbox', { name: label, exact: true })
    await expect(input).toHaveValue(value)
    await field(page, name).locator('label').click()
    await expect(input, `clicking "${label}" focuses its textbox`).toBeFocused()
  }
})

// The base app lists only its own icons and does not `scan`, and lucide:calendar is not one of Nuxt UI's defaults: a
// field that mounts in the browser can only draw it from the client bundle if the layer put it there (Z_ICONS). On a
// page of its own: on the index page the server-rendered fields bring the same icon, and the browser reuses it.
// Checked to fail with lucide:calendar taken out of Z_ICONS.
test('ZDateField\'s icons come from the client bundle: a field mounted in the browser requests no icon data', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (r) => { if (/_nuxt_icon|iconify/.test(r.url())) requests.push(r.url()) })
  await page.goto('/date-field-later')
  await hydrated(page)
  await page.locator('[data-open="reminder"]').click()
  const remind = field(page, 'remind')
  await expect(remind.getByRole('button', { name: 'Choose a date' }).locator('svg')).toHaveCount(1)
  await remind.getByRole('textbox').click()
  await remind.getByRole('textbox').press('t')
  await expect(remind.getByRole('textbox')).toHaveValue('11/12/2026')
  await page.waitForLoadState('networkidle')
  expect(requests).toEqual([])
})
