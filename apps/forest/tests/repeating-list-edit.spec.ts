import { expect, test, type Locator, type Page } from '@playwright/test'

// ZRepeatingList's Done and Cancel on an open row of a list with #summary: Done folds it keeping the edits, Cancel puts
// back what it held when it opened (a nested field too) into the same objects and folds it, Escape cancels unless a
// field took it, Cancel removes a row added here (not at `min`), Done leaves a row with an error open, and focus goes
// to the row's Edit button. The steps specimen: three saved steps folded at mount, at least two, nested details.

const parts = (page: Page) => page.locator('[data-specimen="repeating-list-parts"]').getByTestId('repeating-list')
const steps = (page: Page) => page.locator('[data-specimen="repeating-list-steps"]').getByTestId('repeating-list')
const echo = (page: Page, name: string) => page.locator(`[data-specimen="repeating-list-steps"] [data-${name}]`)
const row = (list: Locator, i: number) => list.locator(`[data-row="${i}"]`)
const button = (list: Locator, name: string) => list.getByRole('button', { name, exact: true })

async function open(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(parts(page).getByLabel(/^Part \d amount$/)).toHaveCount(2)
}

test.beforeEach(async ({ page }) => open(page))

test('Done folds the row back to its summary, keeping the edits; focus goes to its Edit button', async ({ page }) => {
  const list = steps(page)
  await button(list, 'Edit Draft').click()
  await expect(row(list, 0).getByLabel('Step name')).toBeFocused()
  await row(list, 0).getByLabel('Step name').fill('Draft v2')
  await row(list, 0).getByLabel('Owner').fill('Ana B')
  await button(list, 'Done Draft v2').click()
  await expect(row(list, 0)).toHaveAttribute('data-folded', '')
  await expect(row(list, 0)).toContainText('Draft v2 · Ana B')
  await expect(button(list, 'Edit Draft v2')).toBeFocused()
  await expect(echo(page, 'step-identity')).toHaveText('0, 1, 2')
  await expect(echo(page, 'owners')).toHaveText('Ana B, Ben, Cy')
})

test('Cancel restores what the row held when Edit opened it, a nested field included, in the same objects', async ({ page }) => {
  const list = steps(page)
  for (let round = 1; round <= 2; round++) {
    await button(list, 'Edit Review').click()
    await row(list, 2).getByLabel('Owner').fill(`Someone ${round}`)
    await row(list, 2).getByLabel('Step name').fill('Rewrite')
    await expect(echo(page, 'owners')).toHaveText(`Ana, Ben, Someone ${round}`)
    await button(list, 'Cancel Rewrite').click()
    await expect(row(list, 2)).toHaveAttribute('data-folded', '')
    await expect(row(list, 2)).toContainText('Review · Cy')
    await expect(echo(page, 'owners')).toHaveText('Ana, Ben, Cy')
    await expect(button(list, 'Edit Review')).toBeFocused()
  }
  // The row and its nested details are the objects the list started with, not copies.
  await expect(echo(page, 'step-identity')).toHaveText('0, 1, 2')
  await expect(echo(page, 'details-identity')).toHaveText('0, 1, 2')
  await expect(echo(page, 'order')).toHaveText('step a, step b, step c')
  // Done after Edit then Cancel: the snapshot is from the latest Edit, not the first.
  await button(list, 'Edit Review').click()
  await row(list, 2).getByLabel('Owner').fill('Dee')
  await button(list, 'Done Review').click()
  await button(list, 'Edit Review').click()
  await row(list, 2).getByLabel('Owner').fill('Eve')
  await button(list, 'Cancel Review').click()
  await expect(echo(page, 'owners')).toHaveText('Ana, Ben, Dee')
})

test('Escape in an open row cancels it; a field that handles Escape itself keeps it', async ({ page }) => {
  const list = steps(page)
  await button(list, 'Edit Draft').click()
  const owner = row(list, 0).getByLabel('Owner')
  await owner.fill('Zed')
  await owner.press('Escape')
  await expect(row(list, 0)).toHaveAttribute('data-folded', '')
  await expect(echo(page, 'owners')).toHaveText('Ana, Ben, Cy')
  await expect(button(list, 'Edit Draft')).toBeFocused()

  // A field that takes Escape (an open menu or popover calls preventDefault): the row stays open, the edit kept.
  await button(list, 'Edit Draft').click()
  await owner.evaluate((el) => el.addEventListener('keydown', (e) => { if (e.key === 'Escape') e.preventDefault() }))
  await owner.fill('Zed')
  await owner.press('Escape')
  await expect(row(list, 0)).not.toHaveAttribute('data-folded')
  await expect(owner).toHaveValue('Zed')
  await expect(owner).toBeFocused()
})

test('Cancel on a row added here removes it, focus to Add; at `min` it has no Cancel and Escape keeps it', async ({ page }) => {
  const list = steps(page)
  const add = button(list, 'Add another step')
  await add.click()
  await expect(row(list, 3).getByLabel('Step name')).toBeFocused()
  await row(list, 3).getByLabel('Step name').fill('Ship')
  await button(list, 'Cancel Ship').click()
  await expect(list.locator('[data-row]')).toHaveCount(3)
  await expect(echo(page, 'order')).toHaveText('step a, step b, step c')
  await expect(add).toBeFocused()
  await expect(list.locator('[data-announce]')).toHaveText('Ship removed. 3 in the list.')

  // Escape does the same.
  await add.click()
  await row(list, 3).getByLabel('Step name').press('Escape')
  await expect(list.locator('[data-row]')).toHaveCount(3)

  // Down to the minimum of two with the new row one of them: Cancel could only remove it, so there is none.
  await add.click()
  await button(list, 'Remove Review').click()
  await button(list, 'Remove Draft').click()
  await expect(echo(page, 'order')).toHaveText('step b, new')
  const fresh = row(list, 1)
  await expect(fresh.locator('[data-cancel]')).toHaveCount(0)
  await expect(fresh.locator('[data-done]')).toBeVisible()
  await fresh.getByLabel('Step name').press('Escape')
  await expect(list.locator('[data-row]')).toHaveCount(2)
  await expect(fresh).not.toHaveAttribute('data-folded')
  // Done folds it: it is kept now, and Edit then Cancel has something to go back to.
  await fresh.getByLabel('Step name').fill('Plan')
  await button(list, 'Done Plan').click()
  await expect(row(list, 1)).toHaveAttribute('data-folded', '')
  await expect(button(list, 'Edit Plan')).toBeFocused()
})

test('Done on a row with an error keeps it open, the error showing and focus in its field', async ({ page }) => {
  const list = steps(page)
  await page.locator('[data-check-steps]').click()
  await expect(row(list, 1).getByRole('alert')).toHaveText('Name this step.')
  await button(list, 'Done Step 2').click()
  await expect(row(list, 1)).not.toHaveAttribute('data-folded')
  await expect(row(list, 1).getByRole('alert')).toHaveText('Name this step.')
  await expect(row(list, 1).getByLabel('Step name')).toBeFocused()
  // Fixed and checked again, Done folds it.
  await row(list, 1).getByLabel('Step name').fill('Plan')
  await page.locator('[data-check-steps]').click()
  await expect(row(list, 1).getByRole('alert')).toHaveCount(0)
  await button(list, 'Done Plan').click()
  await expect(row(list, 1)).toHaveAttribute('data-folded', '')
  await expect(button(list, 'Edit Plan')).toBeFocused()
})

test('a list without #summary has no Done or Cancel, and Escape does nothing', async ({ page }) => {
  const list = parts(page)
  await expect(list.locator('[data-done], [data-cancel]')).toHaveCount(0)
  await button(list, 'Add a part').click()
  await list.getByLabel('Part 3 amount').press('Escape')
  await expect(list.getByLabel(/^Part \d amount$/)).toHaveCount(3)
})
