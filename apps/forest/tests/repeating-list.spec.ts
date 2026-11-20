import { expect, test, type Locator, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// ZRepeatingList: the cases a product's e2e runs against its own list — a budget split, contacts and
// categories, with the product's selectors (data-testid="repeating-list", data-row) — then focus,
// announcements, and its inks on every Forest scheme in light and dark.

const parts = (page: Page) => page.locator('[data-specimen="repeating-list-parts"]').getByTestId('repeating-list')
const sources = (page: Page) => page.locator('[data-specimen="repeating-list-sources"]').getByTestId('repeating-list')
const categories = (page: Page) => page.locator('[data-specimen="repeating-list-categories"]').getByTestId('repeating-list')
const row = (list: Locator, i: number) => list.locator(`[data-row="${i}"]`)
const announced = (list: Locator) => list.locator('[data-announce]')

/** Hydrated: the min-fill runs on mount, so the parts list has its two rows only once the client has taken over. */
async function open(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(parts(page).getByLabel(/^Part \d amount$/)).toHaveCount(2)
}

test.describe('a product\'s cases', () => {
  test.beforeEach(async ({ page }) => open(page))

  test('budget split: at least two parts, add and remove, at most 12', async ({ page }) => {
    const list = parts(page)
    // Two parts is the least: neither can be removed.
    await expect(list.getByRole('button', { name: /^Remove part/ })).toHaveCount(0)
    await list.getByRole('button', { name: 'Add a part' }).click()
    await expect(list.getByLabel(/^Part \d amount$/)).toHaveCount(3)
    await list.getByRole('button', { name: 'Remove part 3' }).click()
    await expect(list.getByLabel(/^Part \d amount$/)).toHaveCount(2)

    const add = list.getByRole('button', { name: 'Add a part' })
    for (let n = 3; n <= 12; n++) {
      await add.click()
      await expect(list.getByLabel(/^Part \d+ amount$/)).toHaveCount(n)
    }
    await expect(add).toBeDisabled()
    await expect(list.locator('[data-max]')).toHaveText("That's the most you can add here (12).")
    for (let n = 12; n > 2; n--) await list.getByRole('button', { name: `Remove part ${n}`, exact: true }).click()
    await expect(list.getByLabel(/^Part \d+ amount$/)).toHaveCount(2)
    await expect(list.getByRole('button', { name: /^Remove part/ })).toHaveCount(0)
    await expect(add).toBeEnabled()
    await list.getByLabel('Part 1 amount').fill('4000')
    await list.getByLabel('Part 2 amount').fill('6000')
    await expect(list.getByLabel('Part 2 amount')).toHaveValue('6000')
  })

  test('contacts: saved rows fold to their summary, Add opens a new one with focus in it, Edit opens one', async ({ page }) => {
    const list = sources(page)
    await expect(row(list, 0)).toContainText('Pat Brown · Brown Architects')
    await expect(row(list, 2)).toContainText('Dana Cruz')
    await expect(row(list, 2).getByLabel('Name', { exact: true })).toHaveCount(0)

    await list.getByRole('button', { name: 'Add another contact' }).click()
    await expect(row(list, 3).getByLabel('Name', { exact: true })).toBeFocused()
    await expect(row(list, 3).locator('legend')).toHaveText('Contact 4')
    await row(list, 3).getByLabel('Company', { exact: true }).fill('Lee Plumbing')

    await row(list, 2).getByRole('button', { name: 'Edit' }).click()
    await expect(row(list, 2).getByLabel('Name', { exact: true })).toBeFocused()
    await row(list, 2).getByLabel('Company', { exact: true }).fill('Cruz Design')
    await expect(row(list, 2).getByLabel('Company', { exact: true })).toHaveValue('Cruz Design')
  })

  test('a folded row with a problem opens to show it', async ({ page }) => {
    const list = sources(page)
    await page.locator('[data-clear-name]').click()
    // Still folded: the summary has lost the name, and there is no Name field to see.
    await expect(row(list, 2)).toHaveAttribute('data-folded', '')
    await expect(row(list, 2).getByLabel('Name', { exact: true })).toHaveCount(0)
    await page.locator('[data-check]').click()
    await expect(row(list, 2)).not.toHaveAttribute('data-folded')
    const error = row(list, 2).getByRole('alert')
    await expect(error).toHaveText('Enter name.')
    // The slot is given the message's id, so the field it is about can point at it.
    await expect(row(list, 2).getByLabel('Name', { exact: true })).toHaveAttribute('aria-describedby', (await error.getAttribute('id'))!)
    // The row's key ('source 3') has a space; the message's id must not, or the field would lose its description.
    await expect(row(list, 2).getByLabel('Name', { exact: true })).toHaveAccessibleDescription('Enter name.')
    // The rows without a problem stay folded.
    await expect(row(list, 0)).toHaveAttribute('data-folded', '')

    // Live validation clears the error as the name is typed: the row stays open, with focus still in its field.
    const name = row(list, 2).getByLabel('Name', { exact: true })
    await name.fill('Dana Cruz')
    await expect(row(list, 2).getByRole('alert')).toHaveCount(0)
    await expect(row(list, 2)).not.toHaveAttribute('data-folded')
    await expect(name).toBeFocused()
  })

  test('time categories (compact): remove from the bottom up, Remove hides at the minimum, Add is capped', async ({ page }) => {
    const list = categories(page)
    const category = (n: number) => list.getByLabel(`Category ${n}`, { exact: true })
    await expect(category(1)).toHaveValue('Strategy & Planning')
    // Compact: the title is for assistive tech only, and Remove is an icon named for its row.
    await expect(row(list, 0).locator('legend')).toHaveClass(/\bsr-only\b/)
    await expect(list.getByRole('button', { name: 'Remove Category 3', exact: true })).toHaveText('')
    for (const n of [3, 2]) await list.getByRole('button', { name: `Remove Category ${n}`, exact: true }).click()
    await expect(list.getByRole('button', { name: /^Remove Category/ })).toHaveCount(0)
    await list.getByRole('button', { name: 'Add another category' }).click()
    await category(2).fill('Estimating')
    await list.getByRole('button', { name: 'Remove Category 1', exact: true }).click()
    await expect(category(1)).toHaveValue('Estimating')
    for (let n = 2; n <= 4; n++) await list.getByRole('button', { name: 'Add another category' }).click()
    await expect(list.getByRole('button', { name: 'Add another category' })).toBeDisabled()
  })
})

test.describe('accessibility', () => {
  test.beforeEach(async ({ page }) => open(page))

  test('Add and Remove are named, and a change in the count is announced politely', async ({ page }) => {
    const list = parts(page)
    const status = announced(list)
    await expect(status).toHaveAttribute('role', 'status')
    await expect(status).toHaveAttribute('aria-live', 'polite')
    await expect(status).toHaveText('')
    await list.getByRole('button', { name: 'Add a part' }).click()
    await expect(status).toHaveText('part 3 added. 3 in the list.')
    await list.getByRole('button', { name: 'Remove part 3', exact: true }).click()
    await expect(status).toHaveText('part 3 removed. 2 in the list.')
  })

  test('the announcement is cleared at once and set again only in a later task, so repeated words are heard', async ({ page }) => {
    const seen = await parts(page).evaluate(async (root) => {
      const status = root.querySelector('[data-announce]')!
      const add = root.querySelector<HTMLButtonElement>('[data-add]')!
      add.click()
      // Vue's own render runs in microtasks: after them the region must be empty, not already holding the words.
      for (let i = 0; i < 10; i++) await Promise.resolve()
      const afterMicrotasks = status.textContent
      await new Promise((r) => setTimeout(r, 300))
      return { afterMicrotasks, later: status.textContent }
    })
    expect(seen).toEqual({ afterMicrotasks: '', later: 'part 3 added. 3 in the list.' })
  })

  test('focus: into the new row on Add, and back to Add when a row is removed', async ({ page }) => {
    const list = parts(page)
    await list.getByRole('button', { name: 'Add a part' }).click()
    await expect(list.getByLabel('Part 3 amount')).toBeFocused()
    await list.getByRole('button', { name: 'Remove part 3', exact: true }).click()
    await expect(list.getByRole('button', { name: 'Add a part' })).toBeFocused()
  })
})

// Every scheme, both themes: the inks that carry text — the row's title, a folded row's summary, the per-row error
// and the note at `max` — clear 4.5:1 on their own surface, and no element carries two same-property utilities.
const SCHEMES = ['teal', 'slate-cobalt', 'graphite-violet', 'paper-olive', 'ink-indigo', 'ember']

const contrasts = (page: Page, selectors: Record<string, string>) => page.evaluate((list) => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  const rgb = (c: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3) }
  const lum = (c: number[]) => c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i]!, 0)
  return Object.fromEntries(Object.entries(list).map(([label, sel]) => {
    const el = document.querySelector(sel)
    if (!el) throw new Error(`contrast: nothing matches ${sel} (${label})`)
    let bgEl: Element | null = el
    let bg = 'rgba(0, 0, 0, 0)'
    while (bgEl) { bg = getComputedStyle(bgEl).backgroundColor; if (!/rgba\(.*, 0\)$|transparent/.test(bg)) break; bgEl = bgEl.parentElement }
    const [a, b] = [lum(rgb(getComputedStyle(el).color)), lum(rgb(bg))]
    return [label, (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)]
  }))
}, selectors)

for (const mode of ['light', 'dark'] as const) {
  test.describe(`inks and guards (${mode})`, () => {
    for (const scheme of SCHEMES) {
      test(scheme, async ({ page, baseURL }) => {
        // Scheme and theme are in place before the page's own scripts run: set after a load, the color-mode plugin
        // could still write its own value over the stored one.
        await page.context().addCookies([{ name: 'zooui-scheme', value: scheme, url: baseURL as string }])
        await page.addInitScript((m) => localStorage.setItem('zooui-color-mode', m), mode)
        await page.goto('/')
        await page.waitForLoadState('networkidle')
        if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
        else await expect(page.locator('html')).not.toHaveClass(/dark/)
        // Every state on screen: an error opened, a folded row, and a list at its max.
        await page.locator('[data-clear-name]').click()
        await page.locator('[data-check]').click()
        await categories(page).getByRole('button', { name: 'Add another category' }).click()
        await expect(sources(page).getByRole('alert')).toBeVisible()
        await expect(categories(page).locator('[data-max]')).toBeVisible()

        const ratios = await contrasts(page, {
          title: '[data-specimen="repeating-list-sources"] [data-row="2"] legend',
          summary: '[data-specimen="repeating-list-sources"] [data-folded] span.truncate',
          error: '[data-specimen="repeating-list-sources"] [role="alert"]',
          max: '[data-specimen="repeating-list-categories"] [data-max]',
        })
        expect(Object.entries(ratios).filter(([, r]) => r < 4.5)).toEqual([])
        expect(await page.evaluate(findConflicts)).toEqual([])
      })
    }
  })
}
