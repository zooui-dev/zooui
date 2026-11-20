import { expect, test, type Locator, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// ZOrderList: selection by click and keyboard, the four moves by toolbar and by keyboard (and disabled where they have
// nowhere to go), v-model order and identity, v-model:selection, add and remove, announcements, scrolling the selected
// row into view, the move animation and reduced motion, the toolbar's two orientations, a master-detail editor, and
// its inks on every Forest scheme in light and dark.

const statuses = (page: Page) => page.locator('[data-specimen="order-list-statuses"]')
const steps = (page: Page) => page.locator('[data-specimen="order-list-steps"]')
const custom = (page: Page) => page.locator('[data-specimen="order-list-custom"]')
const listbox = (scope: Locator) => scope.getByRole('listbox')
const option = (scope: Locator, name: string) => listbox(scope).getByRole('option', { name, exact: true })
const order = (page: Page) => statuses(page).locator('[data-order]')
const selection = (page: Page) => statuses(page).locator('[data-selection]')
const announced = (scope: Locator) => scope.locator('[data-announce]')
const moveButton = (scope: Locator, move: 'top' | 'up' | 'down' | 'bottom') => scope.locator(`[data-move="${move}"]`)

/** Hydrated: the toolbar's names carry the row titles, which the client reads once it has taken over. */
async function open(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await steps(page).getByRole('option', { name: 'Step 1', exact: true }).click()
  await expect(steps(page).getByRole('button', { name: 'Remove Step 1' })).toBeVisible()
}

/** The selected rows, asserted with auto-retry: a removed row stays one frame while its leave transition runs. */
const selectedRows = (scope: Locator) => listbox(scope).locator('[aria-selected="true"]')

test.describe('selecting', () => {
  test.beforeEach(async ({ page }) => open(page))

  test('a click selects the row, sets v-model:selection and the active descendant, and opens its form', async ({ page }) => {
    const list = statuses(page)
    await expect(page.locator('[data-detail-empty]')).toBeVisible()
    await expect(listbox(list).locator('[aria-selected="true"]')).toHaveCount(0)
    await option(list, 'Review').click()
    await expect(option(list, 'Review')).toHaveAttribute('aria-selected', 'true')
    await expect(selection(page)).toHaveText('review')
    await expect(listbox(list)).toHaveAttribute('aria-activedescendant', (await option(list, 'Review').getAttribute('id'))!)
    await expect(list.locator('[data-detail-name]')).toHaveValue('Review')
    await expect(listbox(list)).toBeFocused()
    // A click is not keyboard focus: no ring.
    await expect(option(list, 'Review')).not.toHaveClass(/\bring-2\b/)
    await option(list, 'Open').click()
    await expect(selectedRows(list)).toHaveText(['Open'])
    await expect(selection(page)).toHaveText('open')
  })

  test('the keyboard: Down from nothing selects the first row, Up/Down/Home/End move the selection and stop at the ends', async ({ page }) => {
    const list = statuses(page)
    await listbox(list).focus()
    // Reached by the keyboard with nothing selected: the box shows the focus.
    await expect(list.locator('[data-scroller]')).toHaveClass(/\bring-primary\b/)
    await page.keyboard.press('ArrowDown')
    await expect(selection(page)).toHaveText('open')
    await expect(option(list, 'Open')).toHaveClass(/\bring-2\b/)
    await page.keyboard.press('ArrowUp')
    await expect(selection(page)).toHaveText('open')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await expect(selection(page)).toHaveText('review')
    await expect(list.locator('[data-detail-name]')).toHaveValue('Review')
    await page.keyboard.press('End')
    await expect(selection(page)).toHaveText('done')
    await page.keyboard.press('ArrowDown')
    await expect(selection(page)).toHaveText('done')
    await page.keyboard.press('Home')
    await expect(selection(page)).toHaveText('open')
    await page.keyboard.press('ArrowUp')
    await expect(selection(page)).toHaveText('open')
    await expect(selectedRows(list)).toHaveText(['Open'])
    await expect(listbox(list)).toBeFocused()
  })

  test('Up from nothing selects the last row; Enter and Space select the first', async ({ page }) => {
    const list = statuses(page)
    await listbox(list).focus()
    await page.keyboard.press('ArrowUp')
    await expect(selection(page)).toHaveText('done')

    const c = custom(page)
    // The custom list starts with Beta selected; Enter on a selected row keeps it.
    await listbox(c).focus()
    await page.keyboard.press('Enter')
    await expect(selectedRows(c)).toHaveText(['Beta'])
    await page.reload()
    await page.waitForLoadState('networkidle')
    await listbox(statuses(page)).focus()
    await page.keyboard.press('Enter')
    await expect(selection(page)).toHaveText('open')
    await page.reload()
    await page.waitForLoadState('networkidle')
    await listbox(statuses(page)).focus()
    await page.keyboard.press(' ')
    await expect(selection(page)).toHaveText('open')
  })

  test('typeahead by the row title: a letter selects the next row starting with it, a word the row it names', async ({ page }) => {
    const list = statuses(page)
    await listbox(list).focus()
    await page.keyboard.press('r')
    await expect(selection(page)).toHaveText('review')
    await page.keyboard.press('r')
    await expect(selection(page)).toHaveText('ready')
    await page.waitForTimeout(600)
    await page.keyboard.type('in p')
    await expect(selection(page)).toHaveText('in-progress')
  })
})

test.describe('moves', () => {
  test.beforeEach(async ({ page }) => open(page))

  test('with nothing selected every move and Remove are disabled; Add is not', async ({ page }) => {
    const list = statuses(page)
    for (const m of ['top', 'up', 'down', 'bottom'] as const) await expect(moveButton(list, m)).toBeDisabled()
    await expect(list.locator('[data-remove]')).toBeDisabled()
    await expect(list.getByRole('button', { name: 'Add status' })).toBeEnabled()
    // Alt+arrows with nothing selected change nothing.
    await listbox(list).focus()
    await page.keyboard.press('Alt+ArrowDown')
    await expect(order(page)).toHaveText('Open, In progress, Review, Ready, Done')
  })

  test('the toolbar: each move takes the selected row there, keeps it selected and named, and disables at the ends', async ({ page }) => {
    const list = statuses(page)
    await option(list, 'Review').click()
    await list.getByRole('button', { name: 'Move Review up' }).click()
    await expect(order(page)).toHaveText('Open, Review, In progress, Ready, Done')
    await expect(selection(page)).toHaveText('review')
    await expect(listbox(list).locator('[data-row="1"]')).toHaveAttribute('aria-selected', 'true')
    // Focus stays on the button while it still has somewhere to go.
    await expect(list.getByRole('button', { name: 'Move Review up' })).toBeFocused()

    await list.getByRole('button', { name: 'Move Review to top' }).click()
    await expect(order(page)).toHaveText('Review, Open, In progress, Ready, Done')
    await expect(moveButton(list, 'top')).toBeDisabled()
    await expect(moveButton(list, 'up')).toBeDisabled()
    await expect(moveButton(list, 'down')).toBeEnabled()
    // The button that was pressed is now disabled: focus goes to the list, not the page.
    await expect(listbox(list)).toBeFocused()

    await list.getByRole('button', { name: 'Move Review down' }).click()
    await expect(order(page)).toHaveText('Open, Review, In progress, Ready, Done')
    await list.getByRole('button', { name: 'Move Review to bottom' }).click()
    await expect(order(page)).toHaveText('Open, In progress, Ready, Done, Review')
    await expect(moveButton(list, 'down')).toBeDisabled()
    await expect(moveButton(list, 'bottom')).toBeDisabled()
    await expect(moveButton(list, 'up')).toBeEnabled()
    await expect(listbox(list)).toBeFocused()
    await expect(selectedRows(list)).toHaveText(['Review'])
    await expect(list.locator('[data-reorders]')).toHaveText('Review 2→1; Review 1→0; Review 0→1; Review 1→4')
  })

  test('the keyboard: Alt+Up/Down move one place, Alt+Home/End to the ends, and do nothing at an end', async ({ page }) => {
    const list = statuses(page)
    await option(list, 'In progress').click()
    await page.keyboard.press('Alt+ArrowDown')
    await expect(order(page)).toHaveText('Open, Review, In progress, Ready, Done')
    await page.keyboard.press('Alt+End')
    await expect(order(page)).toHaveText('Open, Review, Ready, Done, In progress')
    await page.keyboard.press('Alt+ArrowDown')
    await expect(order(page)).toHaveText('Open, Review, Ready, Done, In progress')
    await page.keyboard.press('Alt+ArrowUp')
    await expect(order(page)).toHaveText('Open, Review, Ready, In progress, Done')
    await page.keyboard.press('Alt+Home')
    await expect(order(page)).toHaveText('In progress, Open, Review, Ready, Done')
    await page.keyboard.press('Alt+ArrowUp')
    await page.keyboard.press('Alt+Home')
    await expect(order(page)).toHaveText('In progress, Open, Review, Ready, Done')
    await expect(selection(page)).toHaveText('in-progress')
    await expect(listbox(list).locator('[data-row="0"]')).toHaveAttribute('aria-selected', 'true')
    await expect(listbox(list)).toBeFocused()
    await expect(list.locator('[data-reorders]')).toHaveText('In progress 1→2; In progress 2→4; In progress 4→3; In progress 3→0')
  })

  test('v-model holds the same items in the new order: editing the moved item\'s form edits its row', async ({ page }) => {
    const list = statuses(page)
    await option(list, 'Ready').click()
    await page.keyboard.press('Alt+Home')
    await expect(order(page)).toHaveText('Ready, Open, In progress, Review, Done')
    await list.locator('[data-detail-name]').fill('Ready to ship')
    await expect(listbox(list).locator('[data-row="0"]')).toHaveText('Ready to ship')
    await expect(order(page)).toHaveText('Ready to ship, Open, In progress, Review, Done')
    await expect(list.getByRole('button', { name: 'Move Ready to ship down' })).toBeVisible()
    await expect(list.getByRole('button', { name: 'Remove Ready to ship' })).toBeVisible()
  })

  test('a custom toolbar from #controls gets the moves, their limits and the selected item', async ({ page }) => {
    const c = custom(page)
    await expect(c.locator('[data-custom-selected]')).toHaveText('Beta')
    await c.getByRole('button', { name: 'Later' }).click()
    await expect(listbox(c).getByRole('option')).toHaveText(['Alpha', 'Gamma', 'Beta'])
    await expect(c.getByRole('button', { name: 'Later' })).toBeDisabled()
    await c.getByRole('button', { name: 'Earlier' }).click()
    await c.getByRole('button', { name: 'Earlier' }).click()
    await expect(listbox(c).getByRole('option')).toHaveText(['Beta', 'Alpha', 'Gamma'])
    await expect(c.getByRole('button', { name: 'Earlier' })).toBeDisabled()
    await expect(c.locator('[data-custom-selected]')).toHaveText('Beta')
  })
})

test.describe('add and remove', () => {
  test.beforeEach(async ({ page }) => open(page))

  test('Add asks the caller, who adds and selects the new item', async ({ page }) => {
    const list = statuses(page)
    await list.getByRole('button', { name: 'Add status' }).click()
    await expect(listbox(list).getByRole('option')).toHaveCount(6)
    await expect(selection(page)).toHaveText('new 1')
    await expect(selectedRows(list)).toHaveText(['New status'])
    await expect(list.locator('[data-detail-name]')).toHaveValue('New status')
  })

  test('Remove asks first through ZConfirmButton; Cancel keeps the item, Remove takes it out, selects the next row and keeps focus in the list', async ({ page }) => {
    const list = statuses(page)
    await option(list, 'In progress').click()
    await list.getByRole('button', { name: 'Remove In progress' }).click()
    // The question, its line and the labels reach ZConfirmButton's popover, named by the Remove button.
    const confirm = page.getByRole('dialog', { name: 'Remove In progress' })
    await expect(confirm).toHaveAccessibleDescription('Delete this status? Tasks in this status keep it until they move.')
    await expect(confirm.getByRole('button')).toHaveText(['Cancel', 'Remove'])
    await expect(confirm.getByRole('button', { name: 'Cancel' })).toBeFocused()
    await confirm.getByRole('button', { name: 'Cancel' }).click()
    await expect(confirm).toHaveCount(0)
    await expect(order(page)).toHaveText('Open, In progress, Review, Ready, Done')
    await expect(list.getByRole('button', { name: 'Remove In progress' })).toBeFocused()

    await list.getByRole('button', { name: 'Remove In progress' }).click()
    await confirm.getByRole('button', { name: 'Remove' }).click()
    await expect(order(page)).toHaveText('Open, Review, Ready, Done')
    await expect(selection(page)).toHaveText('review')
    await expect(listbox(list)).toBeFocused()
    await expect(announced(list)).toHaveText('Removed In progress. 4 in the list.')
  })

  test('Remove is disabled for an item `removable` refuses', async ({ page }) => {
    const list = statuses(page)
    await option(list, 'Done').click()
    await expect(list.locator('[data-remove]')).toBeDisabled()
    await option(list, 'Ready').click()
    await expect(list.locator('[data-remove]')).toBeEnabled()
  })

  test('with confirm-remove off Remove acts at once; the last row removed selects the new last row', async ({ page }) => {
    const s = steps(page)
    await s.getByRole('button', { name: 'Remove Step 1' }).click()
    await expect(listbox(s).getByRole('option')).toHaveCount(29)
    await expect(selectedRows(s)).toHaveText(['Step 2'])
    // Named by its own text at once, not the removed row's: the leaving row stays one frame with its old place.
    await expect(s.locator('[data-remove]')).toHaveAccessibleName('Remove Step 2')
    await expect(s.locator('[data-move="up"]')).toHaveAccessibleName('Move Step 2 up')
    await listbox(s).focus()
    await page.keyboard.press('End')
    await s.getByRole('button', { name: 'Remove Step 30' }).click()
    await expect(selectedRows(s)).toHaveText(['Step 29'])
  })
})

test.describe('accessibility', () => {
  test.beforeEach(async ({ page }) => open(page))

  test('a listbox named by its title, its toolbar a named group, each move announced politely', async ({ page }) => {
    const list = statuses(page)
    await expect(list.getByRole('listbox', { name: 'Statuses' })).toBeVisible()
    await expect(steps(page).getByRole('listbox', { name: 'Steps' })).toBeVisible()
    await expect(list.getByRole('group', { name: 'List actions' })).toBeVisible()
    const status = announced(list)
    await expect(status).toHaveAttribute('role', 'status')
    await expect(status).toHaveAttribute('aria-live', 'polite')
    await expect(status).toHaveText('')
    await option(list, 'Review').click()
    await page.keyboard.press('Alt+ArrowUp')
    await expect(status).toHaveText('Moved Review to position 2 of 5.')
    await list.getByRole('button', { name: 'Move Review to bottom' }).click()
    await expect(status).toHaveText('Moved Review to position 5 of 5.')
  })

  test('without row-title a row is named by its text', async ({ page }) => {
    const s = steps(page)
    await listbox(s).focus()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Alt+ArrowDown')
    await expect(announced(s)).toHaveText('Moved Step 2 to position 3 of 30.')
    await expect(s.getByRole('button', { name: 'Move Step 2 to top' })).toBeVisible()
  })
})

/** Whether row `i` lies wholly inside the list's scroll box, by layout (not the transition's transform). */
const inView = (scope: Locator, i: number) => scope.locator('[data-scroller]').evaluate((box, i) => {
  const row = box.querySelector<HTMLElement>(`[data-row="${i}"]`)!
  return row.offsetTop >= box.scrollTop && row.offsetTop + row.offsetHeight <= box.scrollTop + box.clientHeight
}, i)

test('the selected row scrolls into view: End, a move to the top, and a move to the bottom', async ({ page }) => {
  await open(page)
  const s = steps(page)
  const box = s.locator('[data-scroller]')
  await listbox(s).focus()
  await page.keyboard.press('End')
  expect(await box.evaluate((b) => b.scrollTop)).toBeGreaterThan(0)
  expect(await inView(s, 29)).toBe(true)
  await page.keyboard.press('Alt+Home')
  await expect(listbox(s).locator('[data-row="0"]')).toHaveText('Step 30')
  expect(await inView(s, 0)).toBe(true)
  expect(await box.evaluate((b) => b.scrollTop)).toBe(0)
  await s.getByRole('button', { name: 'Move Step 30 to bottom' }).click()
  await expect(listbox(s).locator('[data-row="29"]')).toHaveText('Step 30')
  expect(await inView(s, 29)).toBe(true)
  await expect(listbox(s)).toBeFocused()
})

/** Clicks a move button and, before the next frame, reads the moved row's transition: Vue's move class is on it. */
const moveAndRead = (scope: Locator) => scope.evaluate(async (root) => {
  root.querySelector<HTMLButtonElement>('[data-move="up"]')!.click()
  for (let i = 0; i < 10; i++) await Promise.resolve()
  await new Promise(requestAnimationFrame)
  const row = root.querySelector<HTMLElement>('[aria-selected="true"]')!
  const css = getComputedStyle(row)
  return { property: css.transitionProperty, duration: css.transitionDuration, animations: row.getAnimations().length }
})

test('a moved row slides to its new place in about 180ms', async ({ page }) => {
  await open(page)
  const list = statuses(page)
  await option(list, 'Ready').click()
  const got = await moveAndRead(list)
  expect(got.property).toContain('transform')
  expect(got.duration).toBe('0.18s')
  expect(got.animations).toBeGreaterThan(0)
  await expect(order(page)).toHaveText('Open, In progress, Ready, Review, Done')
})

test('under prefers-reduced-motion a moved row jumps, with no transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page)
  const list = statuses(page)
  await option(list, 'Ready').click()
  const got = await moveAndRead(list)
  expect(got.animations).toBe(0)
  expect(got.property).not.toContain('transform')
  await expect(order(page)).toHaveText('Open, In progress, Ready, Review, Done')
})

test('the toolbar stands beside the list on a wide screen and runs across above it on a narrow one', async ({ page }) => {
  const layout = async () => statuses(page).locator('[data-controls] button').evaluateAll((buttons) => {
    const r = buttons.map((b) => b.getBoundingClientRect())
    return { sameX: r.every((b) => Math.abs(b.left - r[0]!.left) < 1), sameY: r.every((b) => Math.abs(b.top - r[0]!.top) < 1) }
  })
  await open(page)
  const listLeft = await listbox(statuses(page)).evaluate((el) => el.getBoundingClientRect().left)
  const toolbarRight = await statuses(page).locator('[data-controls]').evaluate((el) => el.getBoundingClientRect().right)
  expect(toolbarRight).toBeLessThanOrEqual(listLeft)
  expect(await layout()).toEqual({ sameX: true, sameY: false })
  await page.setViewportSize({ width: 400, height: 900 })
  await expect.poll(layout).toEqual({ sameX: false, sameY: true })
})

// Every scheme, both themes: the selected row's ink on its primary tint, a plain row's and the title's clear 4.5:1,
// and no element carries two same-property utilities.
const SCHEMES = ['teal', 'slate-cobalt', 'graphite-violet', 'paper-olive', 'ink-indigo', 'ember']

const contrasts = (page: Page, selectors: Record<string, string>) => page.evaluate((list) => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  const rgba = (c: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data] }
  const lum = (c: number[]) => c.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i]!, 0)
  /** The element's backdrop: its own and its ancestors' backgrounds, composited from the first opaque one up. */
  const backdrop = (el: Element) => {
    const layers: number[][] = []
    for (let e: Element | null = el; e; e = e.parentElement) {
      const c = rgba(getComputedStyle(e).backgroundColor)
      if (c[3]! > 0) layers.push(c)
      if (c[3] === 255) break
    }
    if (!layers.length || layers[layers.length - 1]![3] !== 255) layers.push([255, 255, 255, 255])
    return layers.reduceRight((under, over) => { const a = over[3]! / 255; return under.map((u, i) => (i < 3 ? over[i]! * a + u * (1 - a) : 255)) })
  }
  return Object.fromEntries(Object.entries(list).map(([label, sel]) => {
    const el = document.querySelector(sel)
    if (!el) throw new Error(`contrast: nothing matches ${sel} (${label})`)
    const [a, b] = [lum(rgba(getComputedStyle(el).color)), lum(backdrop(el))]
    return [label, (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)]
  }))
}, selectors)

for (const mode of ['light', 'dark'] as const) {
  test.describe(`inks and guards (${mode})`, () => {
    for (const scheme of SCHEMES) {
      test(scheme, async ({ page, baseURL }) => {
        await page.context().addCookies([{ name: 'zooui-scheme', value: scheme, url: baseURL as string }])
        await page.addInitScript((m) => localStorage.setItem('zooui-color-mode', m), mode)
        await page.goto('/')
        await page.waitForLoadState('networkidle')
        if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
        else await expect(page.locator('html')).not.toHaveClass(/dark/)
        await option(statuses(page), 'Review').click()
        await option(steps(page), 'Step 1').click()

        const ratios = await contrasts(page, {
          selected: '[data-specimen="order-list-statuses"] [aria-selected="true"]',
          row: '[data-specimen="order-list-statuses"] [data-row="0"]',
          striped: '[data-specimen="order-list-steps"] [data-row="3"]',
          title: '[data-specimen="order-list-statuses"] [data-header]',
        })
        expect(Object.entries(ratios).filter(([, r]) => r < 4.5)).toEqual([])
        expect(await page.evaluate(findConflicts)).toEqual([])
      })
    }
  })
}
