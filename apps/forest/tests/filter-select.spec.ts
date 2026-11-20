import { expect, test, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// ZFilterSelect: select, deselect, All and Clear, the badge, search (regular-expression characters taken literally,
// matches highlighted as <mark> segments), the keyboard, focus back to the button, the announcement, then its inks on
// every Forest scheme in light and dark. The specimens are components/specimens/FilterSelectSpecimen.vue.

const filter = (page: Page, name: string) => page.locator(`[data-specimen="filter-${name}"]`)
const trigger = (page: Page, name: string) => filter(page, name).locator('[data-trigger]')
const model = (page: Page, name: string) => page.locator(`[data-model="${name}"]`)
// The panel is portaled to <body>, and only one is open at a time.
const panel = (page: Page) => page.locator('[data-filter-panel]')
const list = (page: Page) => panel(page).getByRole('listbox')
const option = (page: Page, name: string | RegExp) => list(page).getByRole('option', { name })
const search = (page: Page) => panel(page).locator('[data-search]')

/** Hydrated: the Owner filter's badge is drawn from its model, and the button opens its panel only once the client runs. */
async function open(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(trigger(page, 'owner').locator('[data-badge]')).toHaveText('Sam Lee')
}

async function openPanel(page: Page, name: string) {
  await trigger(page, name).click()
  await expect(panel(page)).toBeVisible()
}

test.describe('selection', () => {
  test.beforeEach(async ({ page }) => open(page))

  test('select and deselect: the option is marked, the model follows, the badge shows the one value or the count', async ({ page }) => {
    const button = trigger(page, 'status')
    await expect(button).toHaveAccessibleName('Status')
    await expect(button.locator('[data-badge]')).toHaveCount(0)

    await openPanel(page, 'status')
    await option(page, /^Open/).click()
    await expect(option(page, /^Open/)).toHaveAttribute('aria-selected', 'true')
    await expect(model(page, 'status')).toHaveText('["open"]')
    await expect(button.locator('[data-badge]')).toHaveText('Open')
    await expect(button).toHaveAccessibleName('Status, Open')

    // Two names by default (max-shown 2): a chip each, in the options' order.
    await option(page, /^In progress/).click()
    await expect(model(page, 'status')).toHaveText('["open","progress"]')
    await expect(button.locator('[data-badge]')).toHaveText(['Open', 'In progress'])
    await expect(button).toHaveAccessibleName('Status, Open, In progress')

    // A third: one chip with the count.
    await option(page, /^Done/).click()
    await expect(button.locator('[data-badge]')).toHaveText(['3 selected'])
    await expect(button).toHaveAccessibleName('Status, 3 selected')
    await option(page, /^Done/).click()

    await option(page, /^Open/).click()
    await expect(option(page, /^Open/)).toHaveAttribute('aria-selected', 'false')
    await expect(model(page, 'status')).toHaveText('["progress"]')
    await expect(button.locator('[data-badge]')).toHaveText('In progress')
  })

  test('All checks every option that can be checked, Clear empties the filter', async ({ page }) => {
    await openPanel(page, 'status')
    const clear = panel(page).getByRole('button', { name: 'Clear' })
    const all = panel(page).getByRole('button', { name: 'All' })
    await expect(clear).toBeDisabled()
    await all.click()
    // Archived is disabled: All leaves it alone.
    await expect(model(page, 'status')).toHaveText('["open","progress","waiting","review","done"]')
    await expect(option(page, /^Archived/)).toHaveAttribute('aria-selected', 'false')
    await expect(all).toBeDisabled()
    await expect(trigger(page, 'status').locator('[data-badge]')).toHaveText(['5 selected'])
    // Focus goes back to the search, not to the button that just went disabled.
    await expect(search(page)).toBeFocused()

    await clear.click()
    await expect(model(page, 'status')).toHaveText('[]')
    await expect(list(page).locator('[aria-selected="true"]')).toHaveCount(0)
    await expect(trigger(page, 'status').locator('[data-badge]')).toHaveCount(0)
    await expect(search(page)).toBeFocused()
  })

  test('All while searching checks the matches, added to what was chosen', async ({ page }) => {
    await page.locator('[data-reset-status]').click()
    await openPanel(page, 'status')
    await search(page).fill('in')
    await expect(list(page).getByRole('option')).toHaveCount(2)
    await panel(page).getByRole('button', { name: 'All' }).click()
    await expect(model(page, 'status')).toHaveText('["done","progress","waiting"]')
  })

  test('options by id, with their own label and count fields; counts in the locale\'s grouping', async ({ page }) => {
    await openPanel(page, 'owner')
    await expect(option(page, /^Sam Lee/)).toHaveAttribute('aria-selected', 'true')
    await expect(option(page, /^Pat Brown/).locator('[data-count]')).toHaveText('4')
    await option(page, /^Dana Cruz/).click()
    await expect(model(page, 'owner')).toHaveText('[2,3]')
    await page.keyboard.press('Escape')
    // Gone, not just closing: a panel still animating out would be a second [data-filter-panel].
    await expect(panel(page)).toHaveCount(0)
    await openPanel(page, 'status')
    await expect(option(page, /^Done/).locator('[data-count]')).toHaveText('1,240')
  })

  test('options as their own values (no value-key) stay selected through a reactive model', async ({ page }) => {
    await openPanel(page, 'kind')
    await option(page, 'Bug').click()
    await expect(model(page, 'kind')).toHaveText('["Bug"]')
    await expect(option(page, 'Bug')).toHaveAttribute('aria-selected', 'true')
    await option(page, 'Task').click()
    await expect(model(page, 'kind')).toHaveText('["Bug","Task"]')
    await option(page, 'Bug').click()
    await expect(model(page, 'kind')).toHaveText('["Task"]')
  })

  test('a value set from outside is shown', async ({ page }) => {
    await page.locator('[data-reset-status]').click()
    await expect(trigger(page, 'status').locator('[data-badge]')).toHaveText('Done')
    await openPanel(page, 'status')
    await expect(option(page, /^Done/)).toHaveAttribute('aria-selected', 'true')
  })
})

test.describe('search', () => {
  test.beforeEach(async ({ page }) => open(page))

  const labels = (page: Page) => list(page).getByRole('option').locator('[data-label]').allTextContents()
  const marks = (page: Page) => list(page).locator('mark').allTextContents()

  test('literal and case-insensitive, in the options\' own order, with the matches marked', async ({ page }) => {
    await openPanel(page, 'status')
    await search(page).fill('PROG')
    expect(await labels(page)).toEqual(['In progress'])
    expect(await marks(page)).toEqual(['prog'])
    await search(page).fill('o')
    expect(await labels(page)).toEqual(['Open', 'In progress', 'Waiting (on supplier)', 'Done'])
    // The label's own case kept.
    await expect(option(page, /^Open/).locator('mark')).toHaveText(['O'])
    // Every match in a label.
    await search(page).fill('I')
    await expect(option(page, /^Waiting/).locator('mark')).toHaveText(['i', 'i', 'i'])
    // The label reads whole, marks and all.
    await expect(option(page, /^Waiting/).locator('[data-label]')).toHaveText('Waiting (on supplier)')
  })

  test('regular-expression characters match themselves, and nothing throws', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await openPanel(page, 'status')
    for (const [typed, expected] of [
      ['(', ['Waiting (on supplier)']],
      ['(on', ['Waiting (on supplier)']],
      [')', ['Waiting (on supplier)']],
      ['[review]', ['Q&A [review]']],
      ['[', ['Q&A [review]']],
      ['&', ['Q&A [review]']],
      ['.', []],
      ['.*', []],
      ['o|d', []],
      ['\\', []],
      ['^O', []],
    ] as const) {
      await search(page).fill(typed)
      expect(await labels(page), typed).toEqual(expected)
      if (expected.length) expect(await marks(page), typed).toEqual([typed])
    }
    await search(page).fill('.')
    await expect(list(page)).toContainText('No matches')
    expect(errors).toEqual([])
  })

  test('the highlight is elements, never markup: a typed tag is text', async ({ page }) => {
    await openPanel(page, 'status')
    await search(page).fill('<mark>')
    await expect(list(page).getByRole('option')).toHaveCount(0)
    await search(page).fill('[rev')
    await expect(option(page, /^Q&A/).locator('[data-label]')).toHaveText('Q&A [review]')
    expect(await option(page, /^Q&A/).locator('[data-label]').evaluate((el) => el.innerHTML.replace(/<!--.*?-->/g, '')))
      .toBe('Q&amp;A <mark class="rounded-xs bg-primary/15 font-semibold text-highlighted">[rev</mark>iew]')
  })

  test('a closed panel forgets its search', async ({ page }) => {
    await openPanel(page, 'status')
    await search(page).fill('done')
    await page.keyboard.press('Escape')
    await expect(panel(page)).toHaveCount(0)
    await openPanel(page, 'status')
    await expect(search(page)).toHaveValue('')
    await expect(list(page).getByRole('option')).toHaveCount(6)
  })
})

test.describe('keyboard and focus', () => {
  test.beforeEach(async ({ page }) => open(page))

  const highlighted = (page: Page) => list(page).locator('[role="option"][data-highlighted]')

  test('Enter opens it with focus in the search; arrows move; Space and Enter check; Escape closes and focus returns', async ({ page }) => {
    const button = trigger(page, 'status')
    await button.focus()
    await page.keyboard.press('Enter')
    await expect(search(page)).toBeFocused()
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    // The first option is highlighted, and the search box points at it.
    await expect(highlighted(page)).toContainText('Open')
    await expect(search(page)).toHaveAttribute('aria-activedescendant', (await highlighted(page).getAttribute('id'))!)

    // Space from an empty search checks the highlighted option, and is not typed.
    await page.keyboard.press(' ')
    await expect(model(page, 'status')).toHaveText('["open"]')
    await expect(search(page)).toHaveValue('')

    await page.keyboard.press('ArrowDown')
    await expect(highlighted(page)).toContainText('In progress')
    await page.keyboard.press('Enter')
    await expect(model(page, 'status')).toHaveText('["open","progress"]')
    await page.keyboard.press(' ')
    await expect(model(page, 'status')).toHaveText('["open"]')
    await page.keyboard.press('End')
    // End skips the disabled Archived.
    await expect(highlighted(page)).toContainText('Done')

    await page.keyboard.press('Escape')
    await expect(panel(page)).toHaveCount(0)
    await expect(button).toBeFocused()
    await expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  test('Space typed after a character is part of the search; after an arrow key it checks', async ({ page }) => {
    await openPanel(page, 'status')
    await page.keyboard.type('in ')
    await expect(search(page)).toHaveValue('in ')
    expect(await list(page).getByRole('option').locator('[data-label]').allTextContents()).toEqual(['In progress'])
    await expect(model(page, 'status')).toHaveText('[]')
    await page.keyboard.press('Backspace')
    await page.keyboard.press('ArrowDown')
    await expect(highlighted(page)).toContainText('Waiting')
    await page.keyboard.press(' ')
    await expect(model(page, 'status')).toHaveText('["waiting"]')
    // The check cleared the search (filter-select-options.spec.ts), so the whole list is back.
    await expect(search(page)).toHaveValue('')
    await expect(list(page).getByRole('option')).toHaveCount(6)
    // Typing again puts Space back in the search.
    await page.keyboard.type('g ')
    await expect(search(page)).toHaveValue('g ')
  })

  test('focus returns to the button after a mouse pick and Escape, and Tab reaches All and Clear', async ({ page }) => {
    await openPanel(page, 'owner')
    await option(page, /^Pat Brown/).click()
    await search(page).focus()
    await page.keyboard.press('Tab')
    await expect(panel(page).getByRole('button', { name: 'All' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(panel(page).getByRole('button', { name: 'Clear' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(trigger(page, 'owner')).toBeFocused()
  })

  test('without search, focus opens in the list and Space is the listbox\'s own', async ({ page }) => {
    await trigger(page, 'kind').focus()
    await page.keyboard.press('Enter')
    await expect(panel(page).locator('input')).toHaveCount(0)
    await expect(option(page, 'Task')).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(option(page, 'Bug')).toBeFocused()
    await page.keyboard.press(' ')
    await expect(model(page, 'kind')).toHaveText('["Bug"]')
    await page.keyboard.press('Escape')
    await expect(trigger(page, 'kind')).toBeFocused()
  })
})

test.describe('accessibility', () => {
  test.beforeEach(async ({ page }) => open(page))

  test('a multi-select listbox named for the filter, a named search box that controls it, a button that says it opens one', async ({ page }) => {
    const button = trigger(page, 'status')
    await expect(button).toHaveAttribute('aria-haspopup', 'dialog')
    await openPanel(page, 'status')
    const box = list(page)
    await expect(box).toHaveAccessibleName('Status')
    await expect(box).toHaveAttribute('aria-multiselectable', 'true')
    await expect(search(page)).toHaveAccessibleName('Search Status')
    await expect(search(page)).toHaveAttribute('aria-controls', (await box.getAttribute('id'))!)
    await expect(box.getByRole('option')).toHaveCount(6)
    await expect(option(page, /^Archived/)).toHaveAttribute('data-disabled', '')
    // The checkbox is drawn for the eye; the option's aria-selected is what is read.
    await expect(option(page, /^Open/).locator('[data-check]')).toHaveAttribute('aria-hidden', 'true')
  })

  test('the selected count is announced politely, and again for the same words', async ({ page }) => {
    const status = filter(page, 'status').locator('[data-announce]')
    await expect(status).toHaveAttribute('role', 'status')
    await expect(status).toHaveAttribute('aria-live', 'polite')
    await expect(status).toHaveText('')
    await openPanel(page, 'status')
    await option(page, /^Open/).click()
    await expect(status).toHaveText('Status: 1 selected.')
    await option(page, /^Done/).click()
    await expect(status).toHaveText('Status: 2 selected.')
    await panel(page).getByRole('button', { name: 'Clear' }).click()
    await expect(status).toHaveText('Status: none selected.')
    // The region sits beside the button, outside the portaled panel, so it is heard with the panel closed too.
    await page.keyboard.press('Escape')
    await page.locator('[data-reset-status]').click()
    await expect(status).toHaveText('Status: 1 selected.')
  })
})

// Every scheme, both themes: the inks that carry text — the button, its badge, an option's label, its count and a
// search match — clear 4.5:1 on their own surface, and no element carries two same-property utilities.
const SCHEMES = ['teal', 'slate-cobalt', 'graphite-violet', 'paper-olive', 'ink-indigo', 'ember']

const contrasts = (page: Page, selectors: Record<string, string>) => page.evaluate((list) => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  const rgb = (c: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data] }
  const lum = (c: number[]) => c.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i]!, 0)
  // A translucent fill (the match's primary tint) is laid over whatever is under it.
  const over = (top: number[], under: number[]) => { const a = top[3]! / 255; return top.slice(0, 3).map((v, i) => v * a + under[i]! * (1 - a)) }
  const ground = (el: Element | null): number[] => {
    if (!el) return [255, 255, 255]
    const c = rgb(getComputedStyle(el).backgroundColor)
    if (c[3] === 255) return c.slice(0, 3)
    const under = ground(el.parentElement)
    return c[3] === 0 ? under : over(c, under)
  }
  return Object.fromEntries(Object.entries(list).map(([label, sel]) => {
    const el = document.querySelector(sel)
    if (!el) throw new Error(`contrast: nothing matches ${sel} (${label})`)
    const [a, b] = [lum(rgb(getComputedStyle(el).color)), lum(ground(el))]
    return [label, (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)]
  }))
}, selectors)

for (const mode of ['light', 'dark'] as const) {
  test.describe(`inks and guards (${mode})`, () => {
    for (const scheme of SCHEMES) {
      test(scheme, async ({ page, baseURL }) => {
        await page.context().addCookies([{ name: 'zooui-scheme', value: scheme, url: baseURL as string }])
        await page.addInitScript((m) => localStorage.setItem('zooui-color-mode', m), mode)
        await open(page)
        if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
        else await expect(page.locator('html')).not.toHaveClass(/dark/)
        await openPanel(page, 'status')
        await search(page).fill('o')
        await expect(list(page).locator('mark').first()).toBeVisible()

        const ratios = await contrasts(page, {
          button: '[data-specimen="filter-owner"] [data-trigger] > span:not(.sr-only)',
          badge: '[data-specimen="filter-owner"] [data-badge]',
          label: '[data-filter-panel] [role="option"] [data-label]',
          count: '[data-filter-panel] [role="option"] [data-count]',
          match: '[data-filter-panel] mark',
        })
        expect(Object.entries(ratios).filter(([, r]) => r < 4.5)).toEqual([])
        expect(await page.evaluate(findConflicts)).toEqual([])
      })
    }
  })
}
