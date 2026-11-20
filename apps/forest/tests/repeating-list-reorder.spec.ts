import { expect, test, type Locator, type Page } from '@playwright/test'

// ZRepeatingList's reordering (`reorderable`): each move by button and by key, disabled at the edges, focus staying
// with the moved row, the announcement, v-model order and row identity, errors and folding going with their row, and
// min, max and compact. The lists without `reorderable` are checked unchanged. The rest of the list's behavior is in
// repeating-list.spec.ts.

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

const steps = (page: Page) => page.locator('[data-specimen="repeating-list-steps"]').getByTestId('repeating-list')
const choices = (page: Page) => page.locator('[data-specimen="repeating-list-choices"]').getByTestId('repeating-list')
const order = (page: Page) => page.locator('[data-specimen="repeating-list-steps"] [data-order]')
const identity = (page: Page) => page.locator('[data-specimen="repeating-list-choices"] [data-identity]')

test.describe('reordering', () => {
  test.beforeEach(async ({ page }) => open(page))

  test('off by default: the other lists have no move buttons, and Alt+ArrowUp moves nothing', async ({ page }) => {
    for (const list of [parts(page), sources(page), categories(page)]) {
      await expect(list.locator('[data-move]')).toHaveCount(0)
      await expect(list.getByRole('button', { name: /^Move / })).toHaveCount(0)
    }
    const list = categories(page)
    await list.getByLabel('Category 2', { exact: true }).press('Alt+ArrowUp')
    await expect(list.getByLabel('Category 1', { exact: true })).toHaveValue('Strategy & Planning')
    await expect(list.getByLabel('Category 2', { exact: true })).toHaveValue('Sales')
    await expect(announced(list)).toHaveText('')
  })

  test('buttons: each move, disabled at the edge it goes toward; folded rows stay folded; focus stays on the row', async ({ page }) => {
    const list = steps(page)
    const status = announced(list)
    const btn = (name: string) => list.getByRole('button', { name, exact: true })
    await expect(order(page)).toHaveText('step a, step b, step c')
    // Draft is first: up and to the top are disabled; Review is last: down and to the bottom are.
    await expect(btn('Move Draft to the top')).toBeDisabled()
    await expect(btn('Move Draft up')).toBeDisabled()
    await expect(btn('Move Draft down')).toBeEnabled()
    await expect(btn('Move Draft to the bottom')).toBeEnabled()
    await expect(btn('Move Review down')).toBeDisabled()
    await expect(btn('Move Review to the bottom')).toBeDisabled()
    await expect(btn('Move Review up')).toBeEnabled()
    await expect(btn('Move Review to the top')).toBeEnabled()

    await btn('Move Draft down').click()
    await expect(order(page)).toHaveText('step b, step a, step c')
    await expect(status).toHaveText('Moved Draft to position 2 of 3.')
    await expect(btn('Move Draft down')).toBeFocused()

    await btn('Move Draft to the bottom').click()
    await expect(order(page)).toHaveText('step b, step c, step a')
    await expect(status).toHaveText('Moved Draft to position 3 of 3.')
    // Its own button is disabled at the bottom: focus goes to the row's first move still enabled.
    await expect(btn('Move Draft to the bottom')).toBeDisabled()
    await expect(btn('Move Draft to the top')).toBeFocused()

    await btn('Move Draft to the top').click()
    await expect(order(page)).toHaveText('step a, step b, step c')
    await expect(status).toHaveText('Moved Draft to position 1 of 3.')
    await expect(btn('Move Draft down')).toBeFocused()

    await btn('Move Review up').click()
    await expect(order(page)).toHaveText('step a, step c, step b')
    await expect(btn('Move Review up')).toBeFocused()

    // Every row is still folded, its summary in its new place.
    await expect(list.locator('[data-folded]')).toHaveCount(3)
    await expect(row(list, 0)).toContainText('Draft')
    await expect(row(list, 1)).toContainText('Review')
  })

  test('keyboard: Alt+ArrowUp / Alt+ArrowDown one place, Alt+Home / Alt+End to the ends, focus stays in the field', async ({ page }) => {
    const list = choices(page)
    const status = announced(list)
    const phone = list.getByRole('textbox').nth(1)
    await expect(phone).toHaveValue('Phone')
    await phone.focus()

    await page.keyboard.press('Alt+ArrowUp')
    await expect(identity(page)).toHaveText('1, 0, 2')
    await expect(status).toHaveText('Phone is now choice 1.')
    const focused = list.locator('[data-row="0"] input')
    await expect(focused).toHaveValue('Phone')
    await expect(focused).toBeFocused()
    await expect(focused).toHaveAccessibleName('Choice 1')

    // At the top, up again moves nothing.
    await page.keyboard.press('Alt+ArrowUp')
    await page.keyboard.press('Alt+Home')
    await expect(identity(page)).toHaveText('1, 0, 2')

    await page.keyboard.press('Alt+End')
    await expect(identity(page)).toHaveText('0, 2, 1')
    await expect(status).toHaveText('Phone is now choice 3.')
    await expect(list.locator('[data-row="2"] input')).toBeFocused()
    await page.keyboard.press('Alt+ArrowDown')
    await expect(identity(page)).toHaveText('0, 2, 1')

    await page.keyboard.press('Alt+ArrowUp')
    await expect(identity(page)).toHaveText('0, 1, 2')
    await expect(list.locator('[data-row="1"] input')).toBeFocused()
    await page.keyboard.press('Alt+Shift+ArrowUp')
    await expect(identity(page)).toHaveText('1, 0, 2')
    await page.keyboard.press('Alt+Shift+ArrowDown')
    await expect(identity(page)).toHaveText('0, 2, 1')
    await expect(list.locator('[data-row="2"] input')).toHaveValue('Phone')
    await expect(list.locator('[data-row="2"] input')).toBeFocused()
    // Typed into after the moves, the field still edits its own row.
    await page.keyboard.press('End')
    await page.keyboard.type(' call')
    await expect(list.locator('[data-row="2"] input')).toHaveValue('Phone call')
  })

  test('keyboard on a folded row: the keys work from its Edit button, which keeps focus', async ({ page }) => {
    const list = steps(page)
    const edit = list.getByRole('button', { name: 'Edit Draft', exact: true })
    await edit.focus()
    await page.keyboard.press('Alt+ArrowDown')
    await expect(order(page)).toHaveText('step b, step a, step c')
    await expect(edit).toBeFocused()
    await page.keyboard.press('Alt+End')
    await expect(order(page)).toHaveText('step b, step c, step a')
    await expect(edit).toBeFocused()
    await expect(announced(list)).toHaveText('Moved Draft to position 3 of 3.')
  })

  test('the announcement is in the polite live region, cleared first so the same words twice are heard twice', async ({ page }) => {
    const seen = await steps(page).evaluate(async (root) => {
      const status = root.querySelector('[data-announce]')!
      const down = () => root.querySelector<HTMLButtonElement>('[data-row="0"] [data-move="down"]')!
      down().click()
      for (let i = 0; i < 10; i++) await Promise.resolve()
      const afterMicrotasks = status.textContent
      await new Promise((r) => setTimeout(r, 300))
      return { afterMicrotasks, later: status.textContent, role: status.getAttribute('role'), live: status.getAttribute('aria-live') }
    })
    expect(seen).toEqual({ afterMicrotasks: '', later: 'Moved Draft to position 2 of 3.', role: 'status', live: 'polite' })
  })

  test('an error stays with its row: the open row with the message moves, its field still described by it', async ({ page }) => {
    const list = steps(page)
    await page.locator('[data-check-steps]').click()
    await expect(row(list, 1).getByRole('alert')).toHaveText('Name this step.')
    await list.getByRole('button', { name: 'Move Step 2 up', exact: true }).click()
    await expect(order(page)).toHaveText('step b, step a, step c')
    await expect(list.getByRole('alert')).toHaveCount(1)
    const error = row(list, 0).getByRole('alert')
    await expect(error).toHaveText('Name this step.')
    await expect(row(list, 0).getByLabel('Step name')).toHaveAccessibleDescription('Name this step.')
    await expect(row(list, 0)).not.toHaveAttribute('data-folded')
    // The rows without a problem stay folded, in their new places.
    await expect(row(list, 1)).toHaveAttribute('data-folded', '')
    await expect(row(list, 1)).toContainText('Draft')
    await expect(row(list, 2)).toHaveAttribute('data-folded', '')
    // Moved again, to the bottom: still the one row with the error.
    await list.getByRole('button', { name: 'Move Step 1 to the bottom', exact: true }).click()
    await expect(order(page)).toHaveText('step a, step c, step b')
    await expect(row(list, 2).getByRole('alert')).toHaveText('Name this step.')
    await expect(row(list, 0)).toHaveAttribute('data-folded', '')
  })

  test('compact, with min and max: icon-only moves beside Remove, the same objects back, new rows move too', async ({ page }) => {
    const list = choices(page)
    await expect(identity(page)).toHaveText('0, 1, 2')
    // Compact: up and down only (no move-to-ends), icon-only and named for the row.
    await expect(row(list, 1).locator('[data-move]')).toHaveCount(2)
    await expect(list.getByRole('button', { name: 'Move Phone up', exact: true })).toHaveText('')
    await expect(list.getByRole('button', { name: 'Remove Phone', exact: true })).toBeVisible()

    // Up to max: Add disabled, and the new row (no key: its identity is the object) can be moved.
    await list.getByRole('button', { name: 'Add another choice' }).click()
    await expect(list.getByRole('button', { name: 'Add another choice' })).toBeDisabled()
    await list.locator('[data-row="3"] input').fill('Post')
    await list.getByRole('button', { name: 'Move Post up', exact: true }).click()
    await list.getByRole('button', { name: 'Move Post up', exact: true }).click()
    await expect(identity(page)).toHaveText('0, -1, 1, 2')
    await expect(list.locator('[data-row="1"] input')).toHaveValue('Post')

    // Down to min: Remove hides, the moves stay.
    await list.getByRole('button', { name: 'Remove Text', exact: true }).click()
    await list.getByRole('button', { name: 'Remove Email', exact: true }).click()
    await expect(list.getByRole('button', { name: /^Remove / })).toHaveCount(0)
    await expect(identity(page)).toHaveText('-1, 1')
    await list.getByRole('button', { name: 'Move Phone up', exact: true }).click()
    await expect(identity(page)).toHaveText('1, -1')
    await expect(list.locator('[data-row="0"] input')).toHaveValue('Phone')
    await expect(list.locator('[data-row="1"] input')).toHaveValue('Post')
  })
})
