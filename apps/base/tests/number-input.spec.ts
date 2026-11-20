import { expect, test, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// ZNumberInput on the base, in a product (app/components/specimens/NumberInputSpecimen.vue): it paints in
// the product's own colors and face in both modes, with nothing of Forest's, and takes its own steps from the
// product's app.config (`zooui.numberInput`) — the way a product keeps its $5,000 while Zoo UI's default is 1.

/** Tailwind's palette values the product's app.config (neutral: slate) and main.css (val-input: sky) point at. */
const TW = {
  'slate-200': 'oklch(92.9% 0.013 255.508)', 'slate-400': 'oklch(70.4% 0.04 256.788)', 'slate-500': 'oklch(55.4% 0.046 257.417)',
  'slate-700': 'oklch(37.2% 0.044 257.287)', 'sky-200': 'oklch(90.1% 0.058 230.902)', 'sky-900': 'oklch(39.1% 0.09 240.876)',
} as const

const resolve = (page: Page, value: string) => page.evaluate((v) => {
  const d = document.createElement('div'); d.style.color = v; document.body.append(d)
  const c = getComputedStyle(d).color; d.remove(); return c
}, value)
const tw = (page: Page, name: keyof typeof TW) => resolve(page, TW[name])
const css = (page: Page, selector: string, prop: string) => page.locator(selector).first()
  .evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)

const field = (page: Page, name: string) => page.locator(`[data-specimen="ni-${name}"]`)
const root = (page: Page, name: string) => field(page, name).locator('xpath=..')

/** Hydrated: ZThemeToggle renders on the client only, and its enabled buttons replace the server's disabled ones. */
const hydrated = (page: Page) => expect(page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'dark', exact: true })).toBeEnabled()

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await hydrated(page)
})

for (const mode of ['light', 'dark'] as const) {
  test(`takes the product's colors and face, nothing of Forest's (${mode})`, async ({ page }) => {
    if (mode === 'dark') {
      await page.evaluate(() => localStorage.setItem('product-color-mode', 'dark'))
      await page.reload()
      await page.waitForLoadState('networkidle')
      await expect(page.locator('html')).toHaveClass(/dark/)
      await hydrated(page)
    }
    const light = mode === 'light'
    // the product's app.config paints UInput's outline variant with its own value token, and ZNumberInput is a UInput
    expect(await css(page, '[data-specimen="ni-sale"]', 'color')).toBe(await tw(page, light ? 'sky-900' : 'sky-200'))
    // marks and chevrons: Nuxt UI's dimmed text, here the product's slate; hover goes to its default text
    const dimmed = await tw(page, light ? 'slate-400' : 'slate-500')
    expect(await css(page, '[data-specimen="ni-sale"] ~ * [data-number-mark="lead"]', 'color')).toBe(dimmed)
    expect(await css(page, '[data-specimen="ni-rate"] ~ * [data-number-mark="unit"]', 'color')).toBe(dimmed)
    const up = root(page, 'sale').getByRole('button', { name: 'Add $5,000' })
    expect(await up.evaluate((el) => getComputedStyle(el).color)).toBe(dimmed)
    await up.hover()
    await expect.poll(() => up.evaluate((el) => getComputedStyle(el).color)).toBe(await tw(page, light ? 'slate-700' : 'slate-200'))
    // the page's own face: none of Forest's Inter or JetBrains Mono
    const body = await page.evaluate(() => getComputedStyle(document.body).fontFamily)
    expect(await css(page, '[data-specimen="ni-sale"]', 'font-family')).toBe(body)
    expect(body).not.toMatch(/Inter|JetBrains/)
    expect(await page.evaluate(findConflicts)).toEqual([])
  })
}

test('the product\'s own steps, from its app.config: dollars by $5,000; a prop still wins (a rate by 0.1%)', async ({ page }) => {
  // (live formatting: shown grouped, money in cents)
  const sale = page.getByLabel('Average sale', { exact: true })
  await sale.press('ArrowUp')
  await expect(sale).toHaveValue('130,000.00')
  await root(page, 'sale').getByRole('button', { name: 'Subtract $5,000' }).click()
  await expect(sale).toHaveValue('125,000.00')
  const rate = page.getByLabel('Closing rate', { exact: true })
  await rate.press('ArrowUp')
  await expect(rate).toHaveValue('25.1')
  await expect(root(page, 'jobs').getByRole('button', { name: 'Add 1', exact: true })).toBeVisible()
  const week = page.getByLabel('Hours a week', { exact: true })
  await root(page, 'week').getByRole('button', { name: 'Subtract 0.5 hours' }).click()
  await expect(week).toHaveValue('39.5')
})

// A database row: Postgres `numeric` arrives as a decimal.js Decimal, and must come back one, of the row's own class
// (`Money`, a class the layer has never seen, standing in for a second copy of decimal.js), never through a float.
const model = (page: Page, key: string) => page.locator(`[data-model="${key}"]`)

test('a Decimal v-model comes back a Decimal of its own class: typed, nudged, clamped and rounded', async ({ page }) => {
  const balance = field(page, 'balance')
  await expect(balance).toHaveValue('1,234.50')
  await expect(model(page, 'balance')).toHaveText('Money 1234.5')
  await balance.press('ArrowUp')
  await expect(model(page, 'balance')).toHaveText('Money 6234.5')
  await balance.fill('12345678901234567.89')
  await expect(model(page, 'balance')).toHaveText('Money 12345678901234567.89')
  await expect(balance).toHaveValue('12,345,678,901,234,567.89')
  await balance.fill('7')
  await balance.press('Enter')
  await expect(balance).toHaveValue('7.00')
  await expect(model(page, 'balance')).toHaveText('Money 7')
  // min 0: a nudge below stops there, as a Money
  await root(page, 'balance').getByRole('button', { name: 'Subtract $5,000' }).click()
  await expect(model(page, 'balance')).toHaveText('Money 0')
  // cleared, it is null
  await balance.fill('')
  await expect(model(page, 'balance')).toHaveText('null')
})

test('a Decimal v-model that starts null takes its kind from model-type', async ({ page }) => {
  const shipping = field(page, 'shipping')
  await expect(model(page, 'shipping')).toHaveText('null')
  await shipping.fill('12.5')
  await expect(model(page, 'shipping')).toHaveText('Decimal 12.5')
  await shipping.blur()
  await expect(shipping).toHaveValue('12.50')
})

test('calc hands a Decimal model back a Decimal of its own class', async ({ page }) => {
  const adjustment = field(page, 'adjustment')
  await adjustment.fill('100+50*2.005')
  await adjustment.press('Enter')
  await expect(adjustment).toHaveValue('200.25')
  await expect(model(page, 'adjustment')).toHaveText('Money 200.25')
})

// The product lists only its own icons and does not scan; the chevrons come from the layer's registration (docs/mechanisms.md,
// "Z* icons in the client bundle": they are also Nuxt UI defaults, so this holds the outcome, not which list did it).
test('its chevrons come from the client bundle: no request for icon data', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (r) => { if (/_nuxt_icon|iconify/.test(r.url())) requests.push(r.url()) })
  await page.reload()
  await hydrated(page)
  await expect(root(page, 'sale').getByRole('button').locator('svg')).toHaveCount(2)
  await page.waitForLoadState('networkidle')
  expect(requests).toEqual([])
})
