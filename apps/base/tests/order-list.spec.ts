import { expect, test, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// ZOrderList on the theme-free base, in a product: the selected row is tinted with the product's primary (sky) and
// inked in its neutral (slate) in light and dark, and the list works after hydration in a production build: click,
// keyboard moves, the master-detail form, the toolbar's icons from the bundle. The behavior is covered on Forest
// (apps/forest/tests/order-list.spec.ts).

/** Tailwind's palette values the product's colors resolve to. */
const TW = {
  'sky-400': 'oklch(74.6% 0.16 232.661)', 'sky-500': 'oklch(68.5% 0.169 237.323)',
  'slate-200': 'oklch(92.9% 0.013 255.508)', 'slate-700': 'oklch(37.2% 0.044 257.287)', 'slate-900': 'oklch(20.8% 0.042 265.755)',
  'white': '#fff',
} as const

/** A color as the browser computes it, for the property it is compared on. */
const resolve = (page: Page, value: string, prop: 'color' | 'backgroundColor' = 'color') => page.evaluate(([v, p]) => {
  const d = document.createElement('div'); d.style[p] = v; document.body.append(d)
  const c = getComputedStyle(d)[p]; d.remove(); return c
}, [value, prop] as const)

const statuses = (page: Page) => page.locator('[data-specimen="order-list-statuses"]')

async function open(page: Page, mode: 'light' | 'dark') {
  // Stored before the page's own scripts run: set after a load, the color-mode plugin could write its own value over it.
  await page.addInitScript((m) => localStorage.setItem('product-color-mode', m), mode)
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
  else await expect(page.locator('html')).not.toHaveClass(/dark/)
  // Hydrated: a click selects only once the client has taken over.
  await statuses(page).getByRole('option', { name: 'Review', exact: true }).click()
  await expect(statuses(page).locator('[data-selection]')).toHaveText('review')
}

const COLORS = {
  light: { primary: 'sky-500', selected: 'slate-900', row: 'slate-700' },
  dark: { primary: 'sky-400', selected: 'white', row: 'slate-200' },
} as const

for (const mode of ['light', 'dark'] as const) {
  test(`the product's colors (${mode}): the selected row on a sky tint in slate, plain rows in slate; no conflicting utilities`, async ({ page }) => {
    await open(page, mode)
    // Off the row the click selected: hovered, it shows its hover tint (primary/15).
    await page.mouse.move(0, 0)
    const got = await statuses(page).getByRole('listbox').evaluate((list) => {
      const selected = getComputedStyle(list.querySelector('[aria-selected="true"]')!)
      const row = getComputedStyle(list.querySelector('[aria-selected="false"]')!)
      return { tint: selected.backgroundColor, selected: selected.color, row: row.color, rowTint: row.backgroundColor }
    })
    const want = COLORS[mode]
    expect(got).toEqual({
      tint: await resolve(page, `color-mix(in oklab, ${TW[want.primary]} 10%, transparent)`, 'backgroundColor'),
      selected: await resolve(page, TW[want.selected]),
      row: await resolve(page, TW[want.row]),
      rowTint: 'rgba(0, 0, 0, 0)',
    })
    expect(await page.evaluate(findConflicts)).toEqual([])
  })
}

test('in a production build: keyboard moves, the master-detail form, and the toolbar\'s icons from the bundle', async ({ page }) => {
  const icons: string[] = []
  page.on('request', (r) => { if (/_nuxt_icon|iconify/.test(r.url())) icons.push(r.url()) })
  await open(page, 'light')
  const list = statuses(page)
  await page.keyboard.press('Alt+Home')
  await expect(list.locator('[data-order]')).toHaveText('Review, Open, In progress, Ready, Done')
  await expect(list.locator('[data-announce]')).toHaveText('Moved Review to position 1 of 5.')
  await list.locator('[data-detail-name]').fill('In review')
  await expect(list.getByRole('option', { name: 'In review', exact: true })).toHaveAttribute('aria-selected', 'true')
  // Every toolbar icon (plus, trash-2, the four moves) is drawn from the layer's bundle list, with no request.
  await expect(list.locator('[data-controls] button svg')).toHaveCount(6)
  expect(icons).toEqual([])
})
