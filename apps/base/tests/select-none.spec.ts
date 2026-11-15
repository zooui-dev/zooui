import { expect, test } from '@playwright/test'

// The select-none sentinel in a product (specimens/SelectNoneSpecimen.vue), against the production
// build: a USelect whose "None" option holds SELECT_NONE can be chosen without reka-ui throwing, and its model maps
// through selectNoneToUndefined / selectNoneToNull. The helpers' own cases are scripts/select-none.test.mjs.

test('choosing None does not throw, and the model maps to undefined (create) and null (update)', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const specimen = page.locator('[data-specimen="select-none"]')
  const trigger = specimen.getByRole('combobox')
  await expect(trigger).toBeEnabled()
  await expect(trigger).toContainText('Kitchen remodel')
  await expect(specimen.locator('[data-select-none="create"]')).toHaveText('{"project":"p-1"}')

  await trigger.click()
  await page.getByRole('option', { name: 'None' }).click()

  await expect(trigger).toContainText('None')
  await expect(specimen.locator('[data-select-none="create"]')).toHaveText('{}')
  await expect(specimen.locator('[data-select-none="update"]')).toHaveText('{"project":null}')
  expect(errors).toEqual([])

  // and back to a real value
  await trigger.click()
  await page.getByRole('option', { name: 'Roof repair' }).click()
  await expect(specimen.locator('[data-select-none="update"]')).toHaveText('{"project":"p-2"}')
  expect(errors).toEqual([])
})
