import { expect, test, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// ZStatus with a product's own statuses on the Forest theme (pages/status.vue, the map in app/app.config.ts): they
// render from app.config, labels clear 4.5:1 and marks 3:1 in light and dark, and no element carries two utilities
// for one property. Each behavior in full is apps/base/tests/status.spec.ts.

async function open(page: Page, mode: 'light' | 'dark') {
  await page.addInitScript((m) => localStorage.setItem('zooui-color-mode', m), mode)
  await page.goto('/status')
  await page.waitForLoadState('networkidle')
  if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
  else await expect(page.locator('html')).not.toHaveClass(/dark/)
}

/** Contrast of each status's label and mark against the ground, in one evaluate; colors through a canvas pixel. */
const ratios = (page: Page) => page.evaluate(() => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  const rgb = (c: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3) }
  const lum = (c: number[]) => c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i]!, 0)
  const ground = (el: Element | null) => {
    let bg = 'rgba(0, 0, 0, 0)'
    while (el) { bg = getComputedStyle(el).backgroundColor; if (!/rgba\(.*, 0\)$|transparent/.test(bg)) break; el = el.parentElement }
    return bg
  }
  const ratio = (a: string, b: string) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
  const els = [...document.querySelectorAll('[data-product-status], [data-unknown="plain"]')]
  if (els.length !== 6) throw new Error(`expected 6 statuses, found ${els.length}`)
  return els.map((el) => {
    const key = (el as HTMLElement).dataset.productStatus ?? 'unknown'
    const m = el.querySelector(':scope > [aria-hidden="true"]')!
    const ms = getComputedStyle(m)
    // an icon is drawn in its `color`; a dot is its background
    const markColor = ms.backgroundColor !== 'rgba(0, 0, 0, 0)' && !m.classList.contains('iconify') ? ms.backgroundColor : ms.color
    return { key, label: ratio(getComputedStyle(el).color, ground(el)), mark: ratio(markColor, ground(el)) }
  })
})

for (const mode of ['light', 'dark'] as const) {
  test(`the product's statuses on Forest (${mode}): labels 4.5:1, marks 3:1, no class conflicts`, async ({ page }) => {
    await open(page, mode)
    await expect(page.locator('[data-product-status="review"]')).toHaveText('In review')
    await expect(page.locator('[data-unknown="plain"]')).toHaveText('Unknown')

    const low = (await ratios(page)).flatMap((r) => [
      ...(r.label < 4.5 ? [`${r.key} label ${r.label.toFixed(2)}`] : []),
      ...(r.mark < 3 ? [`${r.key} mark ${r.mark.toFixed(2)}`] : []),
    ])
    expect(low).toEqual([])
    expect(await page.evaluate(findConflicts)).toEqual([])
  })
}
