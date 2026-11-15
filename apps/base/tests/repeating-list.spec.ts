import { expect, test, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// ZRepeatingList on the theme-free base, in a product: it paints in the product's palette (sky / slate,
// red errors, emerald success; app.config.ts) in light and dark, keeps the product's selectors, and works after hydration
// in a production build. The behavior is covered on Forest (apps/forest/tests/repeating-list.spec.ts).

/** Tailwind's palette values the product's colors resolve to. */
const TW = {
  'slate-50': 'oklch(98.4% 0.003 247.858)', 'slate-800': 'oklch(27.9% 0.041 260.031)', 'slate-900': 'oklch(20.8% 0.042 265.755)',
  'red-300': 'oklch(80.8% 0.114 19.571)', 'red-700': 'oklch(50.5% 0.213 27.518)',
  'emerald-400': 'oklch(76.5% 0.177 163.223)', 'emerald-500': 'oklch(69.6% 0.17 162.48)', 'white': '#fff',
} as const

const resolve = (page: Page, value: string) => page.evaluate((v) => {
  const d = document.createElement('div'); d.style.color = v; document.body.append(d)
  const c = getComputedStyle(d).color; d.remove(); return c
}, value)

const sources = (page: Page) => page.locator('[data-specimen="repeating-list-sources"]').getByTestId('repeating-list')

async function open(page: Page, mode: 'light' | 'dark') {
  // Stored before the page's own scripts run: set after a load, the color-mode plugin could write its own value over it.
  await page.addInitScript((m) => localStorage.setItem('product-color-mode', m), mode)
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
  else await expect(page.locator('html')).not.toHaveClass(/dark/)
  // hydrated: the parts list fills to its minimum on mount
  await expect(page.locator('[data-specimen="repeating-list-parts"] [data-row]')).toHaveCount(2)
}

const COLORS = {
  light: { title: 'slate-900', fold: 'slate-50', error: 'red-700', check: 'emerald-500' },
  dark: { title: 'white', fold: 'slate-800', error: 'red-300', check: 'emerald-400' },
} as const

for (const mode of ['light', 'dark'] as const) {
  test(`the product's colors (${mode}): slate titles and folds, red errors, an emerald check; no conflicting utilities`, async ({ page }) => {
    await open(page, mode)
    await page.locator('[data-clear-name]').click()
    await page.locator('[data-check]').click()
    const list = sources(page)
    await expect(list.getByRole('alert')).toBeVisible()

    const got = await list.evaluate((root) => {
      const css = (sel: string, prop: 'color' | 'backgroundColor') => getComputedStyle(root.querySelector(sel)!)[prop]
      return {
        title: css('[data-row="2"] legend', 'color'),
        fold: css('[data-folded]', 'backgroundColor'),
        error: css('[role="alert"]', 'color'),
        check: css('[data-folded] svg', 'color'),
      }
    })
    const want = COLORS[mode]
    expect(got).toEqual({
      title: await resolve(page, TW[want.title]),
      fold: await resolve(page, TW[want.fold]),
      error: await resolve(page, TW[want.error]),
      check: await resolve(page, TW[want.check]),
    })
    expect(await page.evaluate(findConflicts)).toEqual([])
  })
}

test('the product\'s selectors and behavior hold in a production build: add focuses the new row, the icons are bundled', async ({ page }) => {
  const icons: string[] = []
  page.on('request', (r) => { if (/_nuxt_icon|iconify/.test(r.url())) icons.push(r.url()) })
  await open(page, 'light')
  const list = sources(page)
  await list.getByRole('button', { name: 'Add another referral source' }).click()
  await expect(list.locator('[data-row="3"]').getByLabel('Name', { exact: true })).toBeFocused()
  await expect(list.locator('[data-announce]')).toHaveText('Referral source 4 added. 4 in the list.')
  // The new row's Remove icon (lucide:trash-2) is drawn on the client, from the layer's bundle list.
  await expect(list.locator('[data-row="3"]').getByRole('button', { name: 'Remove Referral source 4' }).locator('svg')).toBeVisible()
  expect(icons).toEqual([])
})
