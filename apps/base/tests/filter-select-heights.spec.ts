import { expect, test, type Page } from '@playwright/test'

// ZFilterSelect's button on the theme-free base, in the product's own type scale (text-xs is 13px on a 20px line).
// The rest of the component is in filter-select.spec.ts.

async function open(page: Page, mode: 'light' | 'dark') {
  await page.addInitScript((m) => localStorage.setItem('product-color-mode', m), mode)
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
  else await expect(page.locator('html')).not.toHaveClass(/dark/)
  await expect(page.locator('[data-specimen="filter-owner"] [data-badge]')).toHaveText('Sam Lee')
}

// The button is Nuxt UI's button height for its size whatever it holds — nothing, a count, a value, with or without
// its icon — so a toolbar of filters lines up. Each row of the sizes specimen has a plain UButton of that size beside
// the five states. And the value reads in the button's own face, not a theme's badge face.
const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const
const STATES = ['empty', 'empty-no-icon', 'count', 'value', 'value-no-icon'] as const

const heights = (page: Page) => page.locator('[data-specimen="filter-sizes"]').evaluate((root) =>
  Object.fromEntries([...root.querySelectorAll<HTMLElement>('[data-size]')].map((row) => [row.dataset.size, {
    reference: row.querySelector('[data-reference]')!.getBoundingClientRect().height,
    ...Object.fromEntries([...row.querySelectorAll<HTMLElement>('[data-filter-select]')].map((f) =>
      [f.dataset.state, f.querySelector('[data-trigger]')!.getBoundingClientRect().height])),
  }])))

/** The badge's font-family beside the label's, in each trigger that has a badge. */
const faces = (page: Page) => page.evaluate(() => [...document.querySelectorAll('[data-trigger]')]
  .filter((t) => t.querySelector('[data-badge]'))
  .map((t) => ({
    badge: t.querySelector('[data-badge]')!.textContent,
    face: getComputedStyle(t.querySelector('[data-badge]')!).fontFamily,
    label: getComputedStyle(t.querySelector(':scope > span:not([data-badge])')!).fontFamily,
  })))

async function sameHeights(page: Page) {
  const row = (size: string) => page.locator(`[data-specimen="filter-sizes"] [data-size="${size}"]`)
  for (const size of SIZES) {
    // The badges are drawn: a height that matched without them would prove nothing.
    await expect(row(size).locator('[data-state="count"] [data-badge]')).toHaveText('2')
    await expect(row(size).locator('[data-state="value"] [data-badge]')).toHaveText('In progress')
    await expect(row(size).locator('[data-state="value-no-icon"] [data-badge]')).toHaveText('Q&A [review]')
    await expect(row(size).locator('[data-state="empty"] [data-badge]')).toHaveCount(0)
  }
  const got = await heights(page)
  for (const size of SIZES) {
    const { reference, ...states } = got[size]!
    expect(states, `${size}: every state at the plain button's ${reference}px`).toEqual(Object.fromEntries(STATES.map((s) => [s, reference])))
  }
  // The five sizes are five heights: the specimen really sets each size.
  expect(new Set(SIZES.map((s) => got[s]!.reference)).size).toBe(SIZES.length)
}

async function sameFaces(page: Page) {
  const got = await faces(page)
  expect(got.length).toBeGreaterThan(10)
  expect(got.filter((f) => f.face !== f.label)).toEqual([])
}

for (const mode of ['light', 'dark'] as const) {
  test(`one height per size whatever the button holds, and the value in the button's face (${mode})`, async ({ page }) => {
    await open(page, mode)
    await sameHeights(page)
    await sameFaces(page)
  })
}
