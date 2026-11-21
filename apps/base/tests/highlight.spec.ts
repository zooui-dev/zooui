import { expect, test, type Page } from '@playwright/test'

// ZHighlight (pages/highlight.vue) on the theme-free base: every match marked, ignoring case; regular-expression
// characters taken literally and never throwing; markup in the text read as text, never run; `ui.mark` replacing the
// mark's classes; the two-line menu option recipe (a UInputMenu marking its label and description); and the mark's ink
// clearing 4.5:1 in light and dark. The matching itself is unit-tested in scripts/filter-match.test.mjs.

const hydrated = (page: Page) => page.waitForFunction(() => !!(document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__)

async function open(page: Page, mode: 'light' | 'dark' = 'light') {
  await page.addInitScript((m) => localStorage.setItem('product-color-mode', m), mode)
  await page.goto('/highlight')
  await page.waitForLoadState('networkidle')
  await hydrated(page)
}

const section = (page: Page, name: string) => page.locator(`[data-specimen="${name}"]`)
const query = (page: Page, name: string) => section(page, name).locator('[data-query]')
const rows = (page: Page) => section(page, 'plain').locator('[data-row]')
const marks = (page: Page, name: string) => section(page, name).locator('[data-row] mark').allTextContents()
const listbox = (page: Page) => page.locator('[role="listbox"][data-state="open"]')
const option = (page: Page, name: RegExp) => listbox(page).getByRole('option', { name })

test('marks every match, in any case, and nothing for an empty search', async ({ page }) => {
  await open(page)
  expect(await marks(page, 'plain')).toEqual([])
  await query(page, 'plain').fill('DE')
  expect(await marks(page, 'plain')).toEqual(['de', 'De'])
  await expect(rows(page).nth(5)).toHaveText('Design system review')
  await expect(section(page, 'plain').locator('[data-marked]')).toHaveText('de, De')
  await query(page, 'plain').fill('')
  expect(await marks(page, 'plain')).toEqual([])
})

test('regular-expression characters match themselves and never throw', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await open(page)
  for (const [typed, expected] of [['(', ['(']], ['[draft]', ['[draft]']], ['.', ['.']], ['.*', []], ['\\', []], ['(monthly', ['(monthly']]] as const) {
    await query(page, 'plain').fill(typed)
    expect(await marks(page, 'plain'), typed).toEqual(expected)
  }
  await expect(rows(page).nth(1)).toHaveText('Fees (monthly)')
  expect(errors).toEqual([])
})

test('markup in the text is text: a <b> or an <img onerror> is never parsed or run', async ({ page }) => {
  await open(page)
  const plain = section(page, 'plain')
  await expect(rows(page).nth(3)).toHaveText('<b>Bold</b> launch plan')
  await expect(rows(page).nth(4)).toHaveText('<img src=x onerror="window.__highlightXss = true"> Image audit')
  // Marked or not, the text stays text: no element but the marks, with or without a search.
  for (const typed of ['', 'b', '<b>', 'onerror', 'img src', 'audit']) {
    await query(page, 'plain').fill(typed)
    await expect(plain.locator('[data-row] b, [data-row] img')).toHaveCount(0)
    expect(await plain.locator('[data-row] *').evaluateAll((els) => els.map((el) => el.tagName)), typed).toEqual(
      Array(await plain.locator('[data-row] mark').count()).fill('MARK'),
    )
  }
  await query(page, 'plain').fill('<b>')
  expect(await marks(page, 'plain')).toEqual(['<b>'])
  await expect(rows(page).nth(3)).toHaveText('<b>Bold</b> launch plan')
  expect(await rows(page).nth(3).evaluate((el) => el.innerHTML.replace(/<!--.*?-->/g, '')))
    .toBe('<mark class="rounded-xs bg-primary/15 font-semibold text-highlighted">&lt;b&gt;</mark>Bold&lt;/b&gt; launch plan')
  await query(page, 'plain').fill('onerror')
  expect(await rows(page).nth(4).evaluate((el) => el.innerHTML.replace(/<!--.*?-->/g, '')))
    .toBe('&lt;img src=x <mark class="rounded-xs bg-primary/15 font-semibold text-highlighted">onerror</mark>="window.__highlightXss = true"&gt; Image audit')
  expect(await page.evaluate(() => (window as { __highlightXss?: boolean }).__highlightXss)).toBeUndefined()
})

test('`ui.mark` replaces the classes it conflicts with', async ({ page }) => {
  await open(page)
  expect(await marks(page, 'styled')).toEqual(['An', 'an', 'an', 'an', 'an'])
  const cls = await section(page, 'styled').locator('mark').first().getAttribute('class')
  expect(cls?.split(' ').sort()).toEqual(['bg-transparent', 'font-normal', 'rounded-xs', 'text-primary', 'underline'])
  await query(page, 'styled').fill('JORDAN')
  expect(await marks(page, 'styled')).toEqual(['Jordan'])
})

test('the two-line menu option: the search marked in the label and the description, Enter picks', async ({ page }) => {
  await open(page)
  const input = section(page, 'menu').locator('input')
  await input.click()
  await input.fill('lee')
  await expect(listbox(page).getByRole('option')).toHaveCount(1)
  const sam = option(page, /Sam Lee/)
  await expect(sam).toContainText('sam@example.com')
  await expect(sam.locator('[data-slot="itemLabel"] mark')).toHaveText(['Lee'])
  await expect(sam.locator('[data-slot="itemDescription"] mark')).toHaveCount(0)

  await input.fill('example')
  await expect(listbox(page).getByRole('option')).toHaveCount(4)
  await expect(listbox(page).locator('[data-slot="itemDescription"] mark')).toHaveText(['example', 'example', 'example', 'example'])
  await expect(listbox(page).locator('[data-slot="itemLabel"] mark')).toHaveCount(0)

  // A name holding a tag reads as the tag, marked like any other text.
  await input.fill('chen')
  const riley = option(page, /Riley/)
  await expect(riley.locator('[data-slot="itemLabel"]')).toHaveText('Riley <b>Chen</b>')
  await expect(riley.locator('[data-slot="itemLabel"] mark')).toHaveText(['Chen'])
  await expect(riley.locator('[data-slot="itemDescription"] mark')).toHaveText(['chen'])
  await expect(riley.locator('b')).toHaveCount(0)
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(section(page, 'menu').locator('[data-selected]')).toHaveText('Riley <b>Chen</b>')
})

// The mark's ink on its tint over the page, and in a menu item's muted description.
const contrast = (page: Page, sel: string) => page.locator(sel).first().evaluate((el) => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  const rgb = (c: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data] }
  const lum = (c: number[]) => c.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i]!, 0)
  const over = (top: number[], under: number[]) => { const a = top[3]! / 255; return top.slice(0, 3).map((v, i) => v * a + under[i]! * (1 - a)) }
  const ground = (node: Element | null): number[] => {
    if (!node) return [255, 255, 255]
    const c = rgb(getComputedStyle(node).backgroundColor)
    if (c[3] === 255) return c.slice(0, 3)
    const under = ground(node.parentElement)
    return c[3] === 0 ? under : over(c, under)
  }
  const [a, b] = [lum(rgb(getComputedStyle(el).color)), lum(ground(el))]
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
})

for (const mode of ['light', 'dark'] as const) {
  test(`the mark's ink clears 4.5:1 (${mode})`, async ({ page }) => {
    await open(page, mode)
    if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
    await query(page, 'plain').fill('de')
    expect(await contrast(page, '[data-specimen="plain"] mark')).toBeGreaterThanOrEqual(4.5)
    const input = section(page, 'menu').locator('input')
    await input.click()
    await input.fill('example')
    expect(await contrast(page, '[role="listbox"][data-state="open"] [data-slot="itemDescription"] mark')).toBeGreaterThanOrEqual(4.5)
  })
}
