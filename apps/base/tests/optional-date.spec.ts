import { expect, test, type Locator, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// ZOptionalDate (pages/optional-date.vue) on the theme-free base: the box gates the date — off, the field is disabled
// and the day stays in the model (or, with clear-when-off, the model is null and the day comes back on a tick) — and
// nothing is written at mount in either mode; enabled-change fires on the user's tick or untick only; the size comes
// from the prop, then a UFieldGroup, then a UFormField; a tick by the user moves focus into the date, Space toggles it,
// and it works in a UFormField (the label names the date input, help and error describe it, ids stay unique) with
// either type of day and ZDateField's limits.

test.use({ timezoneId: 'America/Los_Angeles' })
const NOW = new Date('2026-11-13T05:30:00Z')

const hydrated = (page: Page) => page.waitForFunction(() => !!(document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__)

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: NOW })
  await page.goto('/optional-date')
  await page.waitForLoadState('networkidle')
  await hydrated(page)
})

const section = (page: Page, name: string) => page.locator(`[data-section="${name}"]`)
const box = (page: Page, name: string) => section(page, name).getByRole('checkbox')
const input = (page: Page, name: string) => section(page, name).getByRole('textbox')
const text = (page: Page, id: string) => page.getByTestId(id)
const isFocused = (l: Locator) => l.evaluate((el) => document.activeElement === el)

async function enter(field: Locator, value: string) {
  await field.press('ControlOrMeta+a')
  await field.press('Backspace')
  await field.pressSequentially(value)
  await field.press('Enter')
}

test('untick keeps the day: the field is disabled and still shows it, nothing announced; tick: enabled and focused', async ({ page }) => {
  const ends = input(page, 'ends')
  await expect(box(page, 'ends')).toBeChecked()
  await expect(ends).toBeEnabled()
  await expect(ends).toHaveValue('05/12/2026')

  await box(page, 'ends').click()
  await expect(box(page, 'ends')).not.toBeChecked()
  await expect(ends).toBeDisabled()
  await expect(text(page, 'ends-model')).toHaveText('PlainDate 2026-05-12')
  await expect(ends).toHaveValue('05/12/2026')
  await expect(text(page, 'ends-events')).toHaveText('')

  await box(page, 'ends').click()
  await expect(box(page, 'ends')).toBeChecked()
  await expect(text(page, 'ends-model')).toHaveText('PlainDate 2026-05-12')
  await expect(ends).toBeEnabled()
  await expect.poll(() => isFocused(ends)).toBe(true)
})

test('clear-when-off: untick makes the model null, the field empty, and announces null; tick brings the day back', async ({ page }) => {
  const ends = input(page, 'ends-clear')
  await box(page, 'ends-clear').click()
  await expect(box(page, 'ends-clear')).not.toBeChecked()
  await expect(text(page, 'ends-clear-model')).toHaveText('null')
  await expect(ends).toBeDisabled()
  await expect(ends).toHaveValue('')
  await expect(text(page, 'ends-clear-events')).toHaveText('null')

  await box(page, 'ends-clear').click()
  await expect(box(page, 'ends-clear')).toBeChecked()
  await expect(text(page, 'ends-clear-model')).toHaveText('PlainDate 2026-05-12')
  await expect(ends).toBeEnabled()
  await expect(ends).toHaveValue('05/12/2026')
  await expect.poll(() => isFocused(ends)).toBe(true)
})

test('clear-when-off remembers the day it was holding when unticked, not the one before: an edit, then off and on', async ({ page }) => {
  const ends = input(page, 'ends-clear')
  await ends.click()
  await enter(ends, '6/30')
  await expect(text(page, 'ends-clear-model')).toHaveText('PlainDate 2026-06-30')
  await box(page, 'ends-clear').click()
  await expect(text(page, 'ends-clear-model')).toHaveText('null')
  await box(page, 'ends-clear').click()
  await expect(text(page, 'ends-clear-model')).toHaveText('PlainDate 2026-06-30')
  // Cleared while on, then off and on: nothing to bring back, and the field is empty and ready to type in.
  await enter(ends, '')
  await expect(text(page, 'ends-clear-model')).toHaveText('null')
  await box(page, 'ends-clear').click()
  await box(page, 'ends-clear').click()
  await expect(text(page, 'ends-clear-model')).toHaveText('null')
  await expect(ends).toBeEnabled()
  await expect.poll(() => isFocused(ends)).toBe(true)
})

test('keyboard: Space on the checkbox toggles it and a tick moves focus into the date; Tab leads from box to date', async ({ page }) => {
  const cb = box(page, 'ends')
  await cb.focus()
  await page.keyboard.press('Space')
  await expect(cb).not.toBeChecked()
  await expect(input(page, 'ends')).toBeDisabled()
  // Unticked, the disabled date is out of the tab order: focus stays on the box.
  await expect.poll(() => isFocused(cb)).toBe(true)
  await page.keyboard.press('Space')
  await expect(cb).toBeChecked()
  await expect(text(page, 'ends-model')).toHaveText('PlainDate 2026-05-12')
  await expect.poll(() => isFocused(input(page, 'ends'))).toBe(true)
  // Typing goes into the date straight away.
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('7/4')
  await page.keyboard.press('Enter')
  await expect(text(page, 'ends-model')).toHaveText('PlainDate 2026-07-04')
  await page.keyboard.press('Shift+Tab')
  await expect.poll(() => isFocused(cb)).toBe(true)
})

test('in a UFormField: the label names the date input, the help describes it, the box has its own name and id', async ({ page }) => {
  await expect(page.getByRole('textbox', { name: 'Ends', exact: true })).toHaveValue('05/12/2026')
  await expect(page.getByRole('checkbox', { name: 'Has an end date', exact: true })).toBeChecked()
  const ends = input(page, 'ends')
  await expect(ends).toHaveAccessibleDescription('Leave it off for an open-ended project')
  const inputId = await ends.getAttribute('id')
  expect(inputId).toBeTruthy()
  await expect(box(page, 'ends')).toHaveAttribute('aria-controls', inputId!)
  // No id on the page is used twice (the box and the date would share the field's, were the box in it).
  const dupes = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map((el) => el.id)
    return ids.filter((id, i) => ids.indexOf(id) !== i)
  })
  expect(dupes).toEqual([])
  expect(await page.evaluate(findConflicts)).toEqual([])
})

test('in a UFormField with an error: the date input is invalid and described by it, the box is not', async ({ page }) => {
  const reviewed = input(page, 'errored')
  await expect(reviewed).toHaveAttribute('aria-invalid', 'true')
  await expect(reviewed).toHaveAccessibleDescription('Enter the review date')
  await expect(box(page, 'errored')).not.toHaveAttribute('aria-invalid', 'true')
  await expect(box(page, 'errored')).toBeChecked()
})

test('outside a UFormField: named by its own aria-label, and the box controls it', async ({ page }) => {
  const starts = page.getByRole('textbox', { name: 'Starts', exact: true })
  await expect(starts).toBeDisabled()
  await expect(box(page, 'cal')).toHaveAttribute('aria-controls', (await starts.getAttribute('id'))!)
})

test('a CalendarDate model, from null: unticked at first, typed, unticked and ticked again, still a CalendarDate', async ({ page }) => {
  const starts = input(page, 'cal')
  await expect(box(page, 'cal')).not.toBeChecked()
  // Bound to undefined, the box is off and nothing is written to it at mount.
  await expect(text(page, 'cal-on')).toHaveText('')
  await expect(starts).toBeDisabled()
  await box(page, 'cal').click()
  await expect(text(page, 'cal-on')).toHaveText('true')
  await expect.poll(() => isFocused(starts)).toBe(true)
  await enter(starts, '5/12')
  await expect(text(page, 'cal-model')).toHaveText('CalendarDate 2026-05-12')
  await box(page, 'cal').click()
  await expect(text(page, 'cal-model')).toHaveText('CalendarDate 2026-05-12')
  await expect(text(page, 'cal-on')).toHaveText('false')
  await expect(starts).toBeDisabled()
  await box(page, 'cal').click()
  await expect(text(page, 'cal-model')).toHaveText('CalendarDate 2026-05-12')
})

test('limits pass through: a typed day before min-value is refused and the field marked invalid', async ({ page }) => {
  const starts = input(page, 'cal')
  await box(page, 'cal').click()
  await enter(starts, '5/12')
  await enter(starts, '3/9')
  await expect(text(page, 'cal-model')).toHaveText('CalendarDate 2026-05-12')
  await expect(starts).toHaveAttribute('aria-invalid', 'true')
  await expect(starts).toHaveValue('05/12/2026')
})

test('v-model:enabled, off at mount with a day: nothing written, the day shown disabled; the parent gates it, a day leaves the box', async ({ page }) => {
  const ext = input(page, 'ext')
  await expect(box(page, 'ext')).not.toBeChecked()
  await expect(text(page, 'ext-model')).toHaveText('PlainDate 2026-10-15')
  await expect(text(page, 'ext-writes')).toHaveText('0')
  await expect(ext).toBeDisabled()
  await expect(ext).toHaveValue('10/15/2026')
  // The parent ticks it: enabled, and focus stays where it was.
  await section(page, 'ext').locator('[data-action="file"]').click()
  await expect(box(page, 'ext')).toBeChecked()
  await expect(ext).toBeEnabled()
  expect(await isFocused(ext)).toBe(false)
  await section(page, 'ext').locator('[data-action="withdraw"]').click()
  await expect(box(page, 'ext')).not.toBeChecked()
  await expect(text(page, 'ext-model')).toHaveText('PlainDate 2026-10-15')
  // The parent sets a day while it's off: the box stays off: the box and the day are independent.
  await section(page, 'ext').locator('[data-action="set-day"]').click()
  await expect(ext).toHaveValue('10/20/2026')
  await expect(box(page, 'ext')).not.toBeChecked()
  await expect(text(page, 'ext-on')).toHaveText('false')
  // None of that was the component writing.
  await expect(text(page, 'ext-writes')).toHaveText('0')
  // The user ticks: the parent's box follows, and the day is the one it held.
  await box(page, 'ext').click()
  await expect(text(page, 'ext-on')).toHaveText('true')
  await expect(text(page, 'ext-model')).toHaveText('PlainDate 2026-10-20')
})

test('clear-when-off, off at mount with a day: nothing written at mount; untick after a tick clears; a day ticks the box', async ({ page }) => {
  const ext = input(page, 'ext-clear')
  await expect(box(page, 'ext-clear')).not.toBeChecked()
  await expect(text(page, 'ext-clear-model')).toHaveText('PlainDate 2026-10-15')
  await expect(text(page, 'ext-clear-writes')).toHaveText('0')
  await expect(ext).toBeDisabled()
  // The parent ticks it: the day it had is there, still unwritten.
  await section(page, 'ext-clear').locator('[data-action="file"]').click()
  await expect(box(page, 'ext-clear')).toBeChecked()
  await expect(ext).toBeEnabled()
  await expect(text(page, 'ext-clear-model')).toHaveText('PlainDate 2026-10-15')
  await expect(text(page, 'ext-clear-writes')).toHaveText('0')
  await section(page, 'ext-clear').locator('[data-action="withdraw"]').click()
  await expect(box(page, 'ext-clear')).not.toBeChecked()
  await expect(text(page, 'ext-clear-model')).toHaveText('null')
  // The parent sets a day while it's off: the box ticks.
  await section(page, 'ext-clear').locator('[data-action="set-day"]').click()
  await expect(box(page, 'ext-clear')).toBeChecked()
  await expect(text(page, 'ext-clear-on')).toHaveText('true')
  await expect(ext).toHaveValue('10/20/2026')
  // The user unticks: the parent's box follows.
  await box(page, 'ext-clear').click()
  await expect(text(page, 'ext-clear-on')).toHaveText('false')
  await expect(text(page, 'ext-clear-model')).toHaveText('null')
})

test('nothing is written at mount, in either mode: an unbound box with a day, and one bound off with a day', async ({ page }) => {
  // Every section's parent state as the page set it: the component announced nothing on the way in.
  await expect(text(page, 'ends-model')).toHaveText('PlainDate 2026-05-12')
  await expect(text(page, 'ends-clear-model')).toHaveText('PlainDate 2026-05-12')
  await expect(text(page, 'ends-events')).toHaveText('')
  await expect(text(page, 'ends-clear-events')).toHaveText('')
  await expect(text(page, 'ext-writes')).toHaveText('0')
  await expect(text(page, 'ext-clear-writes')).toHaveText('0')
  await expect(text(page, 'toggle-events')).toHaveText('')
})

test('enabled-change fires on the user\'s tick and untick only, with the new state; a tick fetches the default day', async ({ page }) => {
  const events = text(page, 'toggle-events')
  // The parent setting the box or the day fires nothing.
  await section(page, 'toggle').locator('[data-action="on"]').click()
  await expect(box(page, 'toggle')).toBeChecked()
  await section(page, 'toggle').locator('[data-action="off"]').click()
  await expect(box(page, 'toggle')).not.toBeChecked()
  await section(page, 'toggle').locator('[data-action="set-day"]').click()
  await expect(text(page, 'toggle-model')).toHaveText('PlainDate 2026-11-01')
  await section(page, 'toggle').locator('[data-action="off"]').click()
  await expect(events).toHaveText('')

  // The user ticks with a day in hand: true, and the page keeps the day it had.
  await box(page, 'toggle').click()
  await expect(events).toHaveText('true')
  await expect(text(page, 'toggle-on')).toHaveText('true')
  await box(page, 'toggle').click()
  await expect(events).toHaveText('true false')
  await expect(text(page, 'toggle-on')).toHaveText('false')
  // From the keyboard too.
  await box(page, 'toggle').focus()
  await page.keyboard.press('Space')
  await expect(events).toHaveText('true false true')
})

test('enabled-change: a tick with no day lets the app fetch a default, which lands in the field', async ({ page }) => {
  await box(page, 'toggle').click()
  await expect(text(page, 'toggle-events')).toHaveText('true')
  await page.clock.runFor(100)
  await expect(text(page, 'toggle-model')).toHaveText('PlainDate 2026-12-31')
  await expect(input(page, 'toggle')).toHaveValue('12/31/2026')
})

test('size: with no prop a UFieldGroup\'s is used over the UFormField\'s; an explicit size prop wins over the group', async ({ page }) => {
  const width = (name: string) => page.locator(`[data-size="${name}"] [role="checkbox"]`).evaluate((el) => el.getBoundingClientRect().width)
  const md = await page.locator('[data-section="ends"] [role="checkbox"]').evaluate((el) => el.getBoundingClientRect().width)
  // Checkbox widths step with size: xs < sm < md < lg < xl.
  const group = await width('group') // the group's xl, not the form field's sm
  const groupProp = await width('group-prop') // the prop's xs, not the group's xl
  const formField = await width('form-field') // the form field's lg
  expect(formField).toBeGreaterThan(md)
  expect(group).toBeGreaterThan(formField)
  expect(groupProp).toBeLessThan(md)
})

test('in a UForm: a tick or untick revalidates the field, so an error for a date no longer asked for goes away', async ({ page }) => {
  const review = input(page, 'form')
  await section(page, 'form').getByRole('button', { name: 'Save' }).click()
  await expect(review).toHaveAccessibleDescription('Enter the review date')
  await expect(review).toHaveAttribute('aria-invalid', 'true')
  await box(page, 'form').click()
  await expect(section(page, 'form')).not.toContainText('Enter the review date')
  await expect(review).toHaveAttribute('aria-invalid', 'false')
  // Ticked again with nothing to restore, the rule asks for the date once more.
  await box(page, 'form').click()
  await expect(section(page, 'form')).toContainText('Enter the review date')
})

test('disabled: the box and the date are both disabled', async ({ page }) => {
  await expect(box(page, 'disabled')).toBeDisabled()
  await expect(box(page, 'disabled')).toBeChecked()
  await expect(input(page, 'disabled')).toBeDisabled()
  await expect(input(page, 'disabled')).toHaveValue('05/12/2026')
})
