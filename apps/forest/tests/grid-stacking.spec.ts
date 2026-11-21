import { expect, test, type Page } from '@playwright/test'

// nu-grid inside a page with a sticky header (apps/forest's, z-10), and nu-grid's own stickiness inside a grid that
// scrolls. The layer's `nuGrid` root slot carries `isolate` (packages/theme-forest/app.config.ts).

const GRIDS = ['default', 'default-grouped', 'compact-grouped', 'default-scrolling']

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
})

// The page's header is sticky (z-10). nu-grid's root is `relative` with no z-index, so without the layer's `isolate`
// its z-10 header cells and z-50 group labels share the page's stacking context and paint over the header as the page
// scrolls the grid under it. Samples a lattice of points where the header and the grid overlap: each must hit the header.
/** Scroll the page so `grid`'s top runs `under` px beneath the header, scroll the grid itself by `inner`, and return the overlap points that do not hit the header. */
const overHeader = (page: Page, grid: string, under: number, inner = 0) => page.evaluate(async ({ grid, under, inner }) => {
  const header = document.querySelector('header')!
  const box = document.querySelector(`[data-grid="${grid}"]`)!
  box.querySelector<HTMLElement>('.overflow-auto')!.scrollTop = inner
  window.scrollTo(0, window.scrollY + box.getBoundingClientRect().top - header.getBoundingClientRect().bottom + under)
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  const h = header.getBoundingClientRect(), g = box.getBoundingClientRect()
  const misses: string[] = []
  let sampled = 0
  for (let x = g.left + 4; x < g.right; x += 24) {
    for (let y = Math.max(g.top, h.top) + 2; y < h.bottom; y += 6) {
      sampled++
      const el = document.elementFromPoint(x, y)
      if (el && !header.contains(el)) misses.push(`(${Math.round(x)},${Math.round(y)}) ${el.className}`.slice(0, 120))
    }
  }
  return { sampled, misses }
}, { grid, under, inner })

for (const g of GRIDS) {
  test(`grid ${g}: scrolled under the page's sticky header, no row paints over it`, async ({ page }) => {
    await expect(page.locator(`[data-grid="${g}"] [data-row-id]`).first()).toBeVisible()
    for (const under of [20, 60, 120]) {
      const r = await overHeader(page, g, under, g === 'default-scrolling' ? 200 : 0)
      expect(r.sampled, `${g} under ${under}px: points sampled`).toBeGreaterThan(20)
      expect(r.misses, `${g} under ${under}px`).toEqual([])
    }
  })
}

test('grid: one taller than its box scrolls inside, with its column header and group row stuck at its own top', async ({ page }) => {
  const box = page.locator('[data-grid="default-scrolling"]')
  await expect(box.locator('[data-row-id]').first()).toBeVisible()
  const r = await box.evaluate(async (box) => {
    box.scrollIntoView({ block: 'center' }) // clear of the page header, which would otherwise answer elementFromPoint
    const root = box.querySelector<HTMLElement>('.overflow-auto')!
    root.scrollTop = 300
    await new Promise((r) => setTimeout(r, 200))
    // walk down the grid's top 100px: the distinct labels met, in order, skipping borders and gaps
    const { top, left } = root.getBoundingClientRect()
    const seen: string[] = []
    for (let dy = 1; dy < 100; dy += 2) {
      const t = document.elementFromPoint(left + 30, top + dy)?.textContent?.trim()
      if (t && t !== seen.at(-1)) seen.push(t)
    }
    return { scrolls: root.scrollHeight > root.clientHeight, scrollTop: root.scrollTop, seen }
  })
  expect(r.scrolls).toBe(true)
  expect(r.scrollTop).toBe(300)
  // scrolled 300px, yet the first labels at the top are the column header and then a group row, not data rows
  expect(r.seen[0], r.seen.join(' | ')).toBe('Package')
  expect(r.seen[1], r.seen.join(' | ')).toMatch(/^Owner: \w+ \(\d+ items\)/i)
})
