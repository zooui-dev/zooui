import { expect, test, type Locator, type Page } from '@playwright/test'

// ZStatus with a product's own statuses (pages/status.vue, the map in app/app.config.ts), against the production build:
// app.config statuses with their icons and colors, the `states` prop over app.config and the built-ins, the fallback
// for an unknown key, and useStatusStates().options() as a select's items. The merge itself is
// scripts/status-states.test.mjs.

test.beforeEach(async ({ page }) => {
  await page.goto('/status')
  await page.waitForLoadState('networkidle')
})

/** The mark a ZStatus draws (its aria-hidden first child): the shape, icon or dot. */
const mark = (status: Locator) => status.locator('> [aria-hidden="true"]')

/** A color as the page computes it for `value` (a CSS color or var()). */
const colorOf = (page: Page, value: string) => page.evaluate((v) => {
  const d = document.createElement('div'); d.style.color = v; document.body.append(d)
  const c = getComputedStyle(d).color; d.remove(); return c
}, value)

test('the product\'s statuses from app.config: label, icon in its color, and a dot without one', async ({ page }) => {
  const labels = await page.locator('[data-product-status]').allTextContents()
  expect(labels.map((l) => l.trim())).toEqual(['Draft', 'In review', 'Scheduled', 'Shipped', 'Archived'])

  const shipped = mark(page.locator('[data-product-status="shipped"]'))
  await expect(shipped).toHaveCount(1)
  await expect(shipped).toHaveClass(/i-lucide:rocket|iconify/)
  expect(await shipped.evaluate((el) => getComputedStyle(el).color)).toBe(await colorOf(page, 'var(--ui-success)'))
  expect(await mark(page.locator('[data-product-status="review"]')).evaluate((el) => getComputedStyle(el).color)).toBe(await colorOf(page, 'var(--ui-info)'))

  // no icon: a filled round dot
  const dot = await mark(page.locator('[data-product-status="archived"]')).evaluate((el) => {
    const s = getComputedStyle(el); return { w: s.width, round: parseFloat(s.borderTopLeftRadius) >= 5, bg: s.backgroundColor }
  })
  expect(dot).toMatchObject({ w: '10px', round: true })
  expect(dot.bg).not.toBe('rgba(0, 0, 0, 0)')

  // the label is the name; the mark is decoration
  await expect(page.locator('[data-product-pill="scheduled"]')).toHaveText('Scheduled')
})

test('the map keeps the built-ins first, then the product\'s in the order it wrote them', async ({ page }) => {
  await expect(page.locator('[data-keys]')).toHaveText('healthy, warn, suspended, unreachable, quiet, draft, review, scheduled, shipped, archived')
  const builtIns = await page.locator('[data-status]').allTextContents()
  expect(builtIns.map((l) => l.trim())).toEqual(['Healthy', 'Near limit', 'Suspended', 'Unreachable', 'Quiet'])
})

test('`states` overrides a built-in in place and an app.config status for one use', async ({ page }) => {
  // a label only: the built-in keeps its triangle
  const warn = page.locator('[data-override="warn"]')
  await expect(warn).toHaveText('Almost full')
  expect(await mark(warn).evaluate((el) => getComputedStyle(el).borderBottomWidth)).toBe('10px')

  // the prop over app.config, keeping app.config's icon
  const shipped = page.locator('[data-override="shipped"]')
  await expect(shipped).toHaveText('Live')
  await expect(mark(shipped)).toHaveClass(/iconify/)

  // an icon: the built-in is drawn as the product's own, not as its ring
  const quiet = page.locator('[data-override="quiet"]')
  await expect(quiet).toHaveText('Paused')
  await expect(mark(quiet)).toHaveClass(/iconify/)
  expect(await mark(quiet).evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('0px')   // the ring is 1.5px
})

test('an unknown key falls back to "Unknown" with a help icon, and the default slot can name it', async ({ page }) => {
  const plain = page.locator('[data-unknown="plain"]')
  await expect(plain).toHaveText('Unknown')
  await expect(plain).toHaveAttribute('data-state-known', 'false')
  await expect(mark(plain)).toHaveClass(/iconify/)
  await expect(page.locator('[data-unknown="slot"]')).toHaveText('Retired')
  await expect(page.locator('[data-product-status="draft"]')).not.toHaveAttribute('data-state-known', /.*/)
})

test('useStatusStates().options() fills a select in the map\'s order, and the pick shows as a ZStatus', async ({ page }) => {
  const trigger = page.locator('[data-select]')
  await expect(trigger).toContainText('In review')
  await trigger.click()
  const options = page.getByRole('option')
  await expect(options).toHaveText(['Draft', 'In review', 'Scheduled', 'Shipped', 'Archived'])
  // each icon in its status's color, as the ZStatus draws it
  const icon = options.filter({ hasText: 'Shipped' }).locator('.iconify').first()
  expect(await icon.evaluate((el) => getComputedStyle(el).color)).toBe(await colorOf(page, 'var(--ui-success)'))

  await options.filter({ hasText: 'Shipped' }).click()
  await expect(page.locator('[data-picked]')).toHaveText('Shipped')
  await expect(page.locator('[data-picked-known]')).toHaveText('true')
})
