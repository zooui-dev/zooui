import { expect, test, type Locator, type Page } from '@playwright/test'

// ZSearchInput (pages/search-input.vue) on the theme-free base: what is typed is handed back once typing pauses, as
// update:modelValue and filter together, and each key restarts the pause; a pause that ends where it started hands
// nothing back; the clear button and Escape empty the field at once, keep focus in it and drop a pause still pending;
// Escape with nothing to clear reaches the modal around it; the parent's value is shown and nothing is emitted for it;
// disabled and read-only fields have no clear button; and the field is a named searchbox with autocomplete off.
//
// The pause is timed on Playwright's clock. It is installed before the page loads and paused once the page is
// hydrated, so every listener the page mounts is older than the paused time; the tests then move it with runFor, and
// a check that nothing has been handed back yet can't be raced by the real clock.

const NOW = new Date('2026-11-13T17:00:00Z')
const hydrated = (page: Page) => page.waitForFunction(() => !!(document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__)

async function open(page: Page, { pause = true } = {}) {
  await page.clock.install({ time: NOW })
  await page.goto('/search-input')
  await page.waitForLoadState('networkidle')
  await hydrated(page)
  if (pause) await page.clock.pauseAt(new Date(NOW.getTime() + 60_000))
}

const section = (page: Page, name: string) => page.locator(`[data-section="${name}"]`)
const box = (page: Page, name: string) => section(page, name).getByRole('searchbox')
const clearButton = (page: Page, name: string) => section(page, name).getByRole('button', { name: 'Clear' })
const text = (page: Page, id: string) => page.getByTestId(id)
const isFocused = (l: Locator) => l.evaluate((el) => document.activeElement === el)

test.describe('the pause', () => {
  test.beforeEach(({ page }) => open(page))

  test('hands back what is typed 300 ms after the last key, once, as update:modelValue and filter', async ({ page }) => {
    await box(page, 'basic').pressSequentially('des')
    await expect(box(page, 'basic')).toHaveValue('des')
    await page.clock.runFor(299)
    await expect(text(page, 'basic-model')).toHaveText('null')
    await expect(text(page, 'basic-updates')).toHaveText('')
    await expect(text(page, 'basic-filters')).toHaveText('')

    await page.clock.runFor(1)
    await expect(text(page, 'basic-model')).toHaveText('"des"')
    await expect(text(page, 'basic-updates')).toHaveText('"des"')
    await expect(text(page, 'basic-filters')).toHaveText('"des"')
    await expect(text(page, 'basic-list').getByRole('listitem')).toHaveText(['Website redesign', 'Design system'])
  })

  test('each key starts the pause again', async ({ page }) => {
    await box(page, 'basic').press('d')
    await page.clock.runFor(200)
    await box(page, 'basic').press('e')
    await page.clock.runFor(200)
    await expect(text(page, 'basic-updates')).toHaveText('')
    await page.clock.runFor(100)
    await expect(text(page, 'basic-updates')).toHaveText('"de"')
    await expect(text(page, 'basic-filters')).toHaveText('"de"')
  })

  test('a pause that ends on the value it started from hands nothing back', async ({ page }) => {
    await box(page, 'basic').press('a')
    await box(page, 'basic').press('Backspace')
    await page.clock.runFor(1000)
    await expect(text(page, 'basic-updates')).toHaveText('')
    await expect(text(page, 'basic-filters')).toHaveText('')
  })

  test('`debounce` sets the pause', async ({ page }) => {
    await box(page, 'slow').press('x')
    await page.clock.runFor(999)
    await expect(text(page, 'slow-model')).toHaveText('""')
    await page.clock.runFor(1)
    await expect(text(page, 'slow-model')).toHaveText('"x"')
    await expect(text(page, 'slow-updates')).toHaveText('"x"')
  })

  test('with no v-model, @filter alone hears the typing and the clear', async ({ page }) => {
    await box(page, 'filter-only').pressSequentially('web')
    await page.clock.runFor(300)
    await expect(text(page, 'filter-only-events')).toHaveText('"web"')
    await expect(text(page, 'filter-only-count')).toHaveText('1')
    await clearButton(page, 'filter-only').click()
    await expect(text(page, 'filter-only-events')).toHaveText('"web" ""')
    await expect(text(page, 'filter-only-count')).toHaveText('6')
  })
})

test.describe('clearing', () => {
  test.beforeEach(({ page }) => open(page))

  test('the clear button empties the field and hands back "" at once, focus staying in the field', async ({ page }) => {
    const field = box(page, 'basic')
    await expect(clearButton(page, 'basic')).toHaveCount(0)
    await field.pressSequentially('mobile')
    await page.clock.runFor(300)
    await expect(text(page, 'basic-model')).toHaveText('"mobile"')

    await clearButton(page, 'basic').click()
    await expect(field).toHaveValue('')
    await expect(text(page, 'basic-model')).toHaveText('""')
    await expect(text(page, 'basic-updates')).toHaveText('"mobile" ""')
    await expect(text(page, 'basic-filters')).toHaveText('"mobile" ""')
    expect(await isFocused(field)).toBe(true)
    await expect(clearButton(page, 'basic')).toHaveCount(0)
    await expect(text(page, 'basic-list').getByRole('listitem')).toHaveCount(6)
  })

  test('the clear button focuses the field when focus was elsewhere', async ({ page }) => {
    await box(page, 'basic').pressSequentially('web')
    await page.getByPlaceholder('Somewhere else').click()
    await clearButton(page, 'basic').click()
    await expect(box(page, 'basic')).toHaveValue('')
    expect(await isFocused(box(page, 'basic'))).toBe(true)
  })

  test('clearing while a pause is pending drops it: nothing was handed back, so nothing is', async ({ page }) => {
    await box(page, 'basic').pressSequentially('web')
    await clearButton(page, 'basic').click()
    await expect(box(page, 'basic')).toHaveValue('')
    await page.clock.runFor(1000)
    await expect(text(page, 'basic-model')).toHaveText('null')
    await expect(text(page, 'basic-updates')).toHaveText('')
  })

  test('Escape clears at once and keeps focus', async ({ page }) => {
    const field = box(page, 'basic')
    await field.pressSequentially('spring')
    await page.clock.runFor(300)
    await field.press('Escape')
    await expect(field).toHaveValue('')
    await expect(text(page, 'basic-model')).toHaveText('""')
    await expect(text(page, 'basic-updates')).toHaveText('"spring" ""')
    expect(await isFocused(field)).toBe(true)
  })
})

test('in a modal, the first Escape clears the field and the second closes the modal', async ({ page }) => {
  // the modal mounts its listeners while the test runs, so the clock runs here (see the note at the top)
  await open(page, { pause: false })
  await page.locator('[data-action="open-modal"]').click()
  const dialog = page.getByRole('dialog')
  const field = dialog.getByRole('searchbox', { name: 'Search in the modal' })
  await field.click()
  await field.pressSequentially('web')
  await field.press('Escape')
  await expect(field).toHaveValue('')
  await expect(dialog).toBeVisible()
  await expect(text(page, 'modal-open')).toHaveText('true')
  await field.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(text(page, 'modal-open')).toHaveText('false')
})

test.describe('the rest', () => {
  test.beforeEach(({ page }) => open(page))

  test('the parent\'s value is shown, and nothing is emitted for it, at mount or after', async ({ page }) => {
    const field = box(page, 'parent')
    await expect(field).toHaveValue('mobile')
    await expect(clearButton(page, 'parent')).toBeVisible()
    await page.locator('[data-action="set-design"]').click()
    await expect(field).toHaveValue('design')
    await page.locator('[data-action="set-empty"]').click()
    await expect(field).toHaveValue('')
    await expect(clearButton(page, 'parent')).toHaveCount(0)
    await page.clock.runFor(1000)
    await expect(text(page, 'parent-updates')).toHaveText('')
  })

  test('the parent setting the model drops a pause still pending', async ({ page }) => {
    await box(page, 'parent').fill('typed')
    await page.locator('[data-action="set-design"]').click()
    await expect(box(page, 'parent')).toHaveValue('design')
    await page.clock.runFor(1000)
    await expect(text(page, 'parent-updates')).toHaveText('')
    await expect(text(page, 'parent-model')).toHaveText('"design"')
  })

  test('a searchbox named by its label, with the search icon, the placeholder and autocomplete off', async ({ page }) => {
    const field = page.getByRole('searchbox', { name: 'Projects', exact: true })
    await expect(field).toHaveAttribute('autocomplete', 'off')
    await expect(field).toHaveAttribute('type', 'text')
    await expect(field).toHaveAttribute('placeholder', 'Filter projects…')
    await expect(box(page, 'parent')).toHaveAttribute('placeholder', 'Filter…')
    await expect(section(page, 'basic').locator('[data-slot="leadingIcon"]')).toBeVisible()
    await field.press('w')
    // the clear button is out of the tab order: Escape is the keyboard's way to clear
    await expect(clearButton(page, 'basic')).toHaveAttribute('tabindex', '-1')
  })

  test('disabled and read-only fields hold their text and show no clear button', async ({ page }) => {
    const disabled = section(page, 'disabled').getByRole('searchbox', { name: 'Disabled search' })
    const readonly = section(page, 'disabled').getByRole('searchbox', { name: 'Read-only search' })
    await expect(disabled).toBeDisabled()
    await expect(disabled).toHaveValue('archived')
    await expect(readonly).not.toBeEditable()
    await expect(readonly).toHaveValue('archived')
    await expect(section(page, 'disabled').locator('[data-search-clear]')).toHaveCount(2)
    for (const b of await section(page, 'disabled').locator('[data-search-clear]').all()) await expect(b).toBeHidden()
  })

  test('the icons follow the size, from the prop or a UFormField', async ({ page }) => {
    // data-size falls through to the <input>; the icons are its siblings
    await page.locator('input[data-size="xs"]').press('a')
    await page.locator('input[data-size="xl"]').press('a')
    const size = (s: string, part: string) => page.locator(`input[data-size="${s}"]`).locator('..').locator(part).evaluate((el) => el.getBoundingClientRect().height)
    const xs = { icon: await size('xs', '[data-slot="leadingIcon"]'), clear: await size('xs', '[data-search-clear] svg') }
    const xl = { icon: await size('xl', '[data-slot="leadingIcon"]'), clear: await size('xl', '[data-search-clear] svg') }
    expect(xl.icon).toBeGreaterThan(xs.icon)
    expect(xl.clear).toBeGreaterThan(xs.clear)
    expect(xs.clear).toBe(xs.icon)
    expect(xl.clear).toBe(xl.icon)
  })

  test('`ui` is merged over the field\'s own classes', async ({ page }) => {
    const field = box(page, 'ui')
    await expect(field).toHaveClass(/(^|\s)rounded-full(\s|$)/)
    await expect(clearButton(page, 'ui')).toHaveCount(0)
    await field.press('a')
    await expect(clearButton(page, 'ui')).toBeVisible()
  })

  test('focus() focuses the field, from a button and from the / shortcut', async ({ page }) => {
    const field = box(page, 'focus')
    await page.locator('[data-action="focus"]').click()
    expect(await isFocused(field)).toBe(true)
    await page.getByRole('heading', { name: 'ZSearchInput' }).click()
    expect(await isFocused(field)).toBe(false)
    await page.keyboard.press('/')
    await expect.poll(() => isFocused(field)).toBe(true)
  })
})
