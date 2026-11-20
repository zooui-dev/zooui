import { expect, test, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// ZFilterSelect's options, on the theme-free base: how many values the button names before a
// count (max-shown), the All button (show-select-all), per-option icon classes (iconClass) and the parts' classes (ui).
// The specimens are components/specimens/FilterSelectSpecimen.vue.

async function open(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[data-specimen="filter-owner"] [data-badge]')).toHaveText('Sam Lee')
}

const filter = (page: Page, name: string) => page.locator(`[data-specimen="filter-${name}"]`)
const trigger = (page: Page, name: string) => filter(page, name).locator('[data-trigger]')
const chips = (page: Page, name: string) => trigger(page, name).locator('[data-badge]')
const panel = (page: Page) => page.locator('[data-filter-panel]')
const option = (page: Page, name: string | RegExp) => panel(page).getByRole('option', { name })

async function openPanel(page: Page, name: string) {
  await trigger(page, name).click()
  await expect(panel(page)).toBeVisible()
}
async function closePanel(page: Page) {
  await page.keyboard.press('Escape')
  await expect(panel(page)).toHaveCount(0)
}

test.describe('how much the button names (max-shown)', () => {
  test.beforeEach(async ({ page }) => open(page))

  test('by default, a chip per value up to two, then one chip with the count; the name follows', async ({ page }) => {
    await openPanel(page, 'status')
    await option(page, /^Done/).click()
    await expect(chips(page, 'status')).toHaveText(['Done'])
    await expect(trigger(page, 'status')).toHaveAccessibleName('Status, Done')
    // Chosen after Done, listed before it: chips go in the options' order.
    await option(page, /^Open/).click()
    await expect(chips(page, 'status')).toHaveText(['Open', 'Done'])
    await expect(trigger(page, 'status')).toHaveAccessibleName('Status, Open, Done')
    await option(page, /^In progress/).click()
    await expect(chips(page, 'status')).toHaveText(['3 selected'])
    await expect(trigger(page, 'status')).toHaveAccessibleName('Status, 3 selected')
  })

  test('max-shown="3": three names, then a count at four', async ({ page }) => {
    await openPanel(page, 'priority')
    await option(page, 'High').click()
    await option(page, 'Low').click()
    await expect(chips(page, 'priority')).toHaveText(['Low', 'High'])
    await expect(trigger(page, 'priority')).toHaveAccessibleName('Priority, Low, High')
    await option(page, 'Normal').click()
    await expect(chips(page, 'priority')).toHaveText(['Low', 'Normal', 'High'])
    await expect(trigger(page, 'priority')).toHaveAccessibleName('Priority, Low, Normal, High')
    await option(page, /^Urgent/).click()
    await expect(chips(page, 'priority')).toHaveText(['4 selected'])
    await expect(trigger(page, 'priority')).toHaveAccessibleName('Priority, 4 selected')
    await option(page, 'Normal').click()
    await expect(chips(page, 'priority')).toHaveText(['Low', 'High', 'Urgent: same day, before close of business'])
  })

  test('max-shown="0": always a count, from the first value, in selected-label\'s words for the chip and the name', async ({ page }) => {
    await openPanel(page, 'count-only')
    await option(page, /^Open/).click()
    await expect(chips(page, 'count-only')).toHaveText(['1 stage'])
    await expect(trigger(page, 'count-only')).toHaveAccessibleName('Stage, 1 stage')
    await option(page, /^Done/).click()
    await expect(chips(page, 'count-only')).toHaveText(['2 stages'])
    await expect(trigger(page, 'count-only')).toHaveAccessibleName('Stage, 2 stages')
  })

  test('chips are capped and truncate; a chip cut short carries its whole text as a title', async ({ page }) => {
    await openPanel(page, 'priority')
    await option(page, 'Low').click()
    await option(page, /^Urgent/).click()
    await closePanel(page)
    await trigger(page, 'priority').hover()
    const urgent = chips(page, 'priority').nth(1)
    expect(await urgent.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
    await expect(urgent).toHaveAttribute('title', 'Urgent: same day, before close of business')
    await expect(chips(page, 'priority').nth(0)).not.toHaveAttribute('title')
    // The row of chips stays within its cap.
    expect(await trigger(page, 'priority').locator('[data-badges]').evaluate((el) => el.getBoundingClientRect().width)).toBeLessThanOrEqual(160)
  })
})

test.describe('the All button (show-select-all)', () => {
  test.beforeEach(async ({ page }) => open(page))

  test('shown by default', async ({ page }) => {
    await openPanel(page, 'status')
    await expect(panel(page).getByRole('button', { name: 'All' })).toBeVisible()
    await expect(panel(page).locator('[data-footer]')).toBeVisible()
  })

  test(':show-select-all="false": no All, and no footer until there is something to clear', async ({ page }) => {
    await openPanel(page, 'no-all')
    await expect(panel(page).getByRole('button', { name: 'All' })).toHaveCount(0)
    await expect(panel(page).locator('[data-footer]')).toHaveCount(0)
    await option(page, 'Invoice').click()
    await expect(panel(page).locator('[data-footer]').getByRole('button')).toHaveText(['Clear'])
    await panel(page).getByRole('button', { name: 'Clear' }).click()
    await expect(page.locator('[data-model="tag"]')).toHaveText('[]')
    await expect(panel(page).locator('[data-footer]')).toHaveCount(0)
    // Clear went with the footer: focus is back in the search, not lost to the page.
    await expect(panel(page).locator('[data-search]')).toBeFocused()
  })
})

test.describe('icon colors and classes', () => {
  test.beforeEach(async ({ page }) => open(page))

  const iconOf = (page: Page, name: RegExp) => option(page, name).locator('[data-icon]')
  const colorOf = (page: Page, name: RegExp) => iconOf(page, name).evaluate((el) => getComputedStyle(el).color)

  test('an option\'s iconClass colors its icon; without one it is dimmed', async ({ page }) => {
    await openPanel(page, 'status')
    await expect(iconOf(page, /^Done/)).toHaveClass(/\btext-success\b/)
    await expect(iconOf(page, /^Done/)).not.toHaveClass(/\btext-dimmed\b/)
    await expect(iconOf(page, /^Waiting/)).toHaveClass(/\btext-warning\b/)
    await expect(iconOf(page, /^Open/)).toHaveClass(/\btext-dimmed\b/)
    expect(await colorOf(page, /^Done/)).not.toBe(await colorOf(page, /^Open/))
    expect(await colorOf(page, /^Done/)).not.toBe(await colorOf(page, /^Waiting/))
  })

  test('ui merges over the defaults, part by part; an option\'s own icon class still wins; a root class lands on the wrapper', async ({ page }) => {
    const root = filter(page, 'styled')
    await expect(root).toHaveClass(/\bfilter-styled-root\b/)
    await expect(root).toHaveAttribute('data-filter-select', '')
    await expect(trigger(page, 'styled')).toHaveClass(/\brounded-full\b/)
    await expect(trigger(page, 'styled')).not.toHaveClass(/\brounded-md\b/)
    await expect(chips(page, 'styled').first()).toHaveClass(/\brounded-full\b/)
    await expect(chips(page, 'styled').first()).not.toHaveClass(/\brounded-sm\b/)

    await openPanel(page, 'styled')
    const content = panel(page).locator('xpath=ancestor::*[@role="dialog"][1]')
    await expect(content).toHaveClass(/\bw-80\b/)
    await expect(content).not.toHaveClass(/\bw-64\b/)
    await expect(panel(page).locator('[data-footer]')).toHaveClass(/\bjustify-end\b/)
    await expect(option(page, /^Open/).locator('[data-label]')).toHaveClass(/\bfont-medium\b/)
    await expect(option(page, /^Open/).locator('[data-count]')).toHaveClass(/\btext-default\b/)
    await expect(option(page, /^Open/).locator('[data-count]')).not.toHaveClass(/\btext-muted\b/)
    await expect(iconOf(page, /^Open/)).toHaveClass(/\btext-primary\b/)
    await expect(iconOf(page, /^Open/)).not.toHaveClass(/\btext-dimmed\b/)
    await expect(iconOf(page, /^Done/)).toHaveClass(/\btext-success\b/)
    await expect(iconOf(page, /^Done/)).not.toHaveClass(/\btext-primary\b/)
    expect(await page.evaluate(findConflicts)).toEqual([])
  })
})

test.describe('the search after a check', () => {
  test.beforeEach(async ({ page }) => open(page))

  const search = (page: Page) => panel(page).locator('[data-search]')

  test('checking or unchecking an option clears the search and brings the whole list back; focus stays in the search', async ({ page }) => {
    await openPanel(page, 'status')
    // By click.
    await search(page).fill('prog')
    await expect(panel(page).getByRole('option')).toHaveCount(1)
    await option(page, /^In progress/).click()
    await expect(page.locator('[data-model="status"]')).toHaveText('["progress"]')
    await expect(search(page)).toHaveValue('')
    await expect(panel(page).getByRole('option')).toHaveCount(6)
    // By Enter, from the search box: typed, picked, cleared, still typing.
    await search(page).focus()
    await page.keyboard.type('done')
    await expect(panel(page).getByRole('option')).toHaveCount(1)
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-model="status"]')).toHaveText('["progress","done"]')
    await expect(search(page)).toHaveValue('')
    await expect(search(page)).toBeFocused()
    await expect(panel(page).getByRole('option')).toHaveCount(6)
    // Unchecking clears it too.
    await page.keyboard.type('done')
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-model="status"]')).toHaveText('["progress"]')
    await expect(search(page)).toHaveValue('')
  })

  test('All leaves the search as it is', async ({ page }) => {
    await openPanel(page, 'status')
    await search(page).fill('in')
    await panel(page).getByRole('button', { name: 'All' }).click()
    await expect(page.locator('[data-model="status"]')).toHaveText('["progress","waiting"]')
    await expect(search(page)).toHaveValue('in')
  })
})
