import { expect, test, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// ZFilterSelect on the theme-free base, in a product: it paints in the product's palette (sky / slate; app.config.ts)
// in light and dark, and works after hydration in a production build with its icons bundled. The behavior is covered
// on Forest (apps/forest/tests/filter-select.spec.ts).

/** Tailwind's palette values the product's colors resolve to. */
const TW = {
  'sky-400': 'oklch(74.6% 0.16 232.661)', 'sky-500': 'oklch(68.5% 0.169 237.323)',
  'slate-100': 'oklch(96.8% 0.007 247.896)', 'slate-800': 'oklch(27.9% 0.041 260.031)',
  'slate-900': 'oklch(20.8% 0.042 265.755)', 'white': '#fff',
} as const

const resolve = (page: Page, value: string) => page.evaluate((v) => {
  const d = document.createElement('div'); d.style.color = v; document.body.append(d)
  const c = getComputedStyle(d).color; d.remove(); return c
}, value)

const filter = (page: Page, name: string) => page.locator(`[data-specimen="filter-${name}"]`)
const panel = (page: Page) => page.locator('[data-filter-panel]')

async function open(page: Page, mode: 'light' | 'dark') {
  // Stored before the page's own scripts run: set after a load, the color-mode plugin could write its own value over it.
  await page.addInitScript((m) => localStorage.setItem('product-color-mode', m), mode)
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
  else await expect(page.locator('html')).not.toHaveClass(/dark/)
  await expect(filter(page, 'owner').locator('[data-badge]')).toHaveText('Sam Lee')
}

const COLORS = {
  light: { check: 'sky-500', badge: 'slate-100', match: 'slate-900' },
  dark: { check: 'sky-400', badge: 'slate-800', match: 'white' },
} as const

for (const mode of ['light', 'dark'] as const) {
  test(`the product's colors (${mode}): a sky check, a slate badge, a highlighted match; no conflicting utilities`, async ({ page }) => {
    await open(page, mode)
    await filter(page, 'owner').locator('[data-trigger]').click()
    await panel(page).locator('[data-search]').fill('sam')
    await expect(panel(page).locator('mark')).toHaveText('Sam')

    const got = await page.evaluate(() => {
      const css = (sel: string, prop: 'color' | 'backgroundColor') => getComputedStyle(document.querySelector(sel)!)[prop]
      return {
        check: css('[data-filter-panel] [aria-selected="true"] [data-check]', 'backgroundColor'),
        badge: css('[data-specimen="filter-owner"] [data-badge]', 'backgroundColor'),
        match: css('[data-filter-panel] mark', 'color'),
      }
    })
    const want = COLORS[mode]
    expect(got).toEqual({
      check: await resolve(page, TW[want.check]),
      badge: await resolve(page, TW[want.badge]),
      match: await resolve(page, TW[want.match]),
    })
    expect(await page.evaluate(findConflicts)).toEqual([])
  })
}

test('the product\'s selectors and behavior hold in a production build: pick, announce, Escape back to the button, icons bundled', async ({ page }) => {
  const icons: string[] = []
  page.on('request', (r) => { if (/_nuxt_icon|iconify/.test(r.url())) icons.push(r.url()) })
  await open(page, 'light')
  const button = filter(page, 'status').locator('[data-trigger]')
  await button.click()
  await expect(panel(page).locator('[data-search]')).toBeFocused()
  await panel(page).getByRole('option', { name: /^Open/ }).click()
  await panel(page).getByRole('option', { name: /^Done/ }).click()
  await expect(page.locator('[data-model="status"]')).toHaveText('["open","done"]')
  await expect(button).toHaveAccessibleName('Status, 2 selected')
  await expect(filter(page, 'status').locator('[data-announce]')).toHaveText('Status: 2 selected.')
  await page.keyboard.press('Escape')
  await expect(button).toBeFocused()
  // The check, search, All and button icons are drawn from the layer's bundle list (the options' own icons are the
  // product's, and may be fetched).
  await expect(button.locator('svg').first()).toBeVisible()
  expect(icons.filter((u) => /list-filter|search|check-check|[=,]check(,|&|$)|[=,]x(,|&|$)/.test(u))).toEqual([])
})
