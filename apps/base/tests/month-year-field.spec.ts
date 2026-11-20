import { expect, test, type Locator, type Page } from '@playwright/test'

// ZMonthField and ZYearField (pages/month-year-field.vue), driven the way a person drives them: typed forms committed
// with Enter, Tab and a click away; the shortcut keys; the calendar of months and of years; the limits refusing a typed
// value; the caller's model type; clearing; disabled; the leading icon; and the month-of-year USelect recipe. The parsing
// and shortcut arithmetic are unit-tested in scripts/month-entry.test.mjs and scripts/year-entry.test.mjs; this is the
// wiring. ZDateField's own specs cover the field they share.
//
// "Today" is the browser's, so the test owns the clock and zone: 21:30 on November 12, 2026 in Los Angeles (already the
// 13th in UTC). It runs from there (clock.install), never frozen: see apps/forest/tests/date-field.spec.ts.
test.use({ timezoneId: 'America/Los_Angeles' })
const NOW = new Date('2026-11-13T05:30:00Z')

const hydrated = (page: Page) => page.waitForFunction(() => !!(document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__)

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: NOW })
  await page.goto('/month-year-field')
  await page.waitForLoadState('networkidle')
  await hydrated(page)
})

const panel = (page: Page) => page.locator('[data-date-field-panel]')
const box = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true })
const out = (page: Page, id: string) => page.getByTestId(id)
const elsewhere = (page: Page) => page.getByRole('textbox', { name: 'Somewhere else' })

async function enter(input: Locator, text: string) {
  await input.click()
  await input.press('ControlOrMeta+a')
  await input.press('Backspace')
  if (text) await input.pressSequentially(text)
  await input.press('Enter')
}

// ── ZMonthField ───────────────────────────────────────────────────────────────────────────────────────────────

test('month: the typed forms commit on Enter, in the locale order; junk clears', async ({ page }) => {
  const input = box(page, 'Period')
  await expect(input).toHaveValue('05/2026')
  await expect(input).toHaveAttribute('placeholder', 'MM/YYYY')
  for (const [typed, shown] of [
    ['5/26', '05/2026'],
    ['7/2026', '07/2026'],
    ['05/1999', '05/1999'],
    ['2026-09', '09/2026'],
    ['2026/3', '03/2026'],
    ['112026', '11/2026'],
    ['4', '04/2026'],
    ['2027', '12/2027'],
    ['13/2026', ''],
    ['0/2026', ''],
  ]) {
    await enter(input, typed!)
    await expect(input, typed).toHaveValue(shown!)
  }
  await expect(out(page, 'period-model')).toHaveText('null')
  await enter(input, '6/26')
  await expect(out(page, 'period-model')).toHaveText('PlainYearMonth 2026-06')
})

test('month: Tab and a click away commit too, and announce once', async ({ page }) => {
  const input = box(page, 'Period')
  await input.click()
  await input.press('ControlOrMeta+a')
  await input.pressSequentially('8/26')
  await input.press('Tab')
  await expect(input).toHaveValue('08/2026')
  await expect(out(page, 'period-model')).toHaveText('PlainYearMonth 2026-08')
  await expect(out(page, 'period-events').locator('li')).toHaveText(['PlainYearMonth 2026-08'])

  await input.click()
  await input.press('ControlOrMeta+a')
  await input.pressSequentially('abc')
  await elsewhere(page).click()
  await expect(input).toHaveValue('')
  await expect(out(page, 'period-model')).toHaveText('null')
  await expect(out(page, 'period-events').locator('li')).toHaveText(['PlainYearMonth 2026-08', 'null'])

  // Enter, then leaving: the month is announced once.
  await enter(input, '9/26')
  await elsewhere(page).click()
  await expect(out(page, 'period-events').locator('li')).toHaveText(['PlainYearMonth 2026-08', 'null', 'PlainYearMonth 2026-09'])
})

test('month: every shortcut key, stepping from the committed month', async ({ page }) => {
  const input = box(page, 'Period')
  await input.click()
  for (const [k, shown] of [
    ['t', '11/2026'],
    ['m', '10/2026'],
    ['-', '09/2026'],
    ['h', '10/2026'],
    ['+', '11/2026'],
    ['=', '12/2026'],
    ['+', '01/2027'],
    ['y', '01/2026'],
    ['r', '01/2027'],
    ['Y', '01/2026'],
    ['T', '11/2026'],
  ]) {
    await input.press(k!)
    await expect(input, k).toHaveValue(shown!)
  }
  await expect(out(page, 'period-model')).toHaveText('PlainYearMonth 2026-11')
  // The shortcut's month is selected, so typing replaces it.
  await input.pressSequentially('3/26')
  await expect(input).toHaveValue('3/26')
  // A shortcut steps from the committed month, not the text typed since: 11/2026 then h is 12/2026.
  await input.press('h')
  await expect(input).toHaveValue('12/2026')
})

test('month: the calendar of months picks one, follows typed text, and Alt+↓ opens it', async ({ page }) => {
  const input = box(page, 'Period')
  await input.click()
  await input.press('Alt+ArrowDown')
  await expect(panel(page)).toBeVisible()
  await expect(panel(page).locator('[data-selected]')).toHaveAttribute('data-value', '2026-05-01')
  // Typed but not committed: the selection follows it.
  await input.press('ControlOrMeta+a')
  await input.pressSequentially('2/26')
  await expect(panel(page).locator('[data-selected]')).toHaveAttribute('data-value', '2026-02-01')
  await panel(page).locator('[data-value="2026-07-01"]').click()
  await expect(panel(page)).toBeHidden()
  await expect(input).toHaveValue('07/2026')
  await expect(input).toBeFocused()
  await expect(out(page, 'period-model')).toHaveText('PlainYearMonth 2026-07')
  await expect(out(page, 'period-events').locator('li')).toHaveText(['PlainYearMonth 2026-07'])

  // The calendar button toggles it; the heading pages to the year view.
  await input.locator('..').getByRole('button', { name: 'Choose a month' }).click()
  await expect(panel(page)).toBeVisible()
  await expect(panel(page).getByRole('button', { name: '2026', exact: true })).toBeVisible()
  await input.locator('..').getByRole('button', { name: 'Choose a month' }).click()
  await expect(panel(page)).toBeHidden()
})

test('month: clear empties it, announces null, and keeps focus', async ({ page }) => {
  const input = box(page, 'Period')
  await input.click()
  await input.locator('..').getByRole('button', { name: 'Clear month' }).click()
  await expect(input).toHaveValue('')
  await expect(input).toBeFocused()
  await expect(out(page, 'period-model')).toHaveText('null')
  await expect(out(page, 'period-events').locator('li')).toHaveText(['null'])
})

test('month: a CalendarDate model, from null, hands back the first of the month', async ({ page }) => {
  const input = box(page, 'Billing month')
  await enter(input, '5/26')
  await expect(out(page, 'cal-model')).toHaveText('CalendarDate 2026-05-01')
  await input.press('h')
  await expect(out(page, 'cal-model')).toHaveText('CalendarDate 2026-06-01')
})

test('month: the limits refuse a typed month, mark the field, and stop the keys and the calendar', async ({ page }) => {
  const input = box(page, 'Sprint month')
  await enter(input, '9/26')
  await expect(input).toHaveValue('05/2026')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Choose a month on or before 08/2026.')).toBeVisible()
  await expect(out(page, 'limited-month-problem')).toHaveText('after-max PlainYearMonth 2026-09 PlainYearMonth 2026-08')
  await expect(out(page, 'limited-month-model')).toHaveText('PlainYearMonth 2026-05')
  // The next edit takes the mark away.
  await input.pressSequentially('6')
  await expect(input).not.toHaveAttribute('aria-invalid', 'true')
  await expect(out(page, 'limited-month-problem')).toHaveText('none')
  await enter(input, '2/26')
  await expect(out(page, 'limited-month-problem')).toHaveText('before-min PlainYearMonth 2026-02 PlainYearMonth 2026-03')

  await enter(input, '5/26')
  await input.press('r')
  await expect(input).toHaveValue('08/2026')
  await input.press('y')
  await expect(input).toHaveValue('03/2026')
  await input.press('m')
  await expect(input).toHaveValue('03/2026')
  await input.press('t') // November is past the last month
  await expect(input).toHaveValue('08/2026')

  await input.press('Alt+ArrowDown')
  await expect(panel(page).locator('[data-value="2026-02-01"]')).toHaveAttribute('data-disabled', '')
  await expect(panel(page).locator('[data-value="2026-03-01"]')).not.toHaveAttribute('data-disabled', '')
  await expect(panel(page).locator('[data-value="2026-08-01"]')).not.toHaveAttribute('data-disabled', '')
  await expect(panel(page).locator('[data-value="2026-09-01"]')).toHaveAttribute('data-disabled', '')
})

test('month: YYYY-MM reads year first, and its - types a dash', async ({ page }) => {
  const input = box(page, 'Release month')
  await expect(input).toHaveValue('2026-05')
  await expect(input).toHaveAttribute('placeholder', 'YYYY-MM')
  await enter(input, '26-7')
  await expect(input).toHaveValue('2026-07')
  await input.press('_')
  await expect(input).toHaveValue('2026-06')
  await input.press('ControlOrMeta+a')
  await input.pressSequentially('2026-10')
  await expect(input).toHaveValue('2026-10')
  await input.press('Enter')
  await expect(out(page, 'iso-model')).toHaveText('PlainYearMonth 2026-10')
})

// ── ZYearField ────────────────────────────────────────────────────────────────────────────────────────────────

test('year: typed years commit, two digits as ZDateField reads them, and bad text clears on blur', async ({ page }) => {
  const input = box(page, 'Fiscal year')
  await expect(input).toHaveValue('2025')
  await expect(input).toHaveAttribute('placeholder', 'YYYY')
  for (const [typed, shown] of [['2030', '2030'], ['26', '2026'], ['1999', '1999'], ['47', '1947'], ['999', '']]) {
    await enter(input, typed!)
    await expect(input, typed).toHaveValue(shown!)
  }
  await enter(input, '2024')
  await expect(out(page, 'year-model')).toHaveText('number 2024')
  // Bad text, then Tab away: the field clears, and the model is null, not the text.
  await input.click()
  await input.press('ControlOrMeta+a')
  await input.pressSequentially('abc')
  await input.press('Tab')
  await expect(input).toHaveValue('')
  await expect(out(page, 'year-model')).toHaveText('null')
})

test('year: every shortcut key', async ({ page }) => {
  const input = box(page, 'Fiscal year')
  await input.click()
  for (const [k, shown] of [['t', '2026'], ['y', '2025'], ['-', '2024'], ['_', '2023'], ['r', '2024'], ['+', '2025'], ['=', '2026'], ['R', '2027'], ['T', '2026']]) {
    await input.press(k!)
    await expect(input, k).toHaveValue(shown!)
  }
  await expect(out(page, 'year-model')).toHaveText('number 2026')
  // m and h are not a year's keys: they type.
  await input.press('ControlOrMeta+a')
  await input.press('m')
  await expect(input).toHaveValue('m')
})

test('year: the calendar of years picks one', async ({ page }) => {
  const input = box(page, 'Fiscal year')
  await input.click()
  await input.locator('..').getByRole('button', { name: 'Choose a year' }).click()
  await expect(panel(page)).toBeVisible()
  await expect(panel(page).locator('[data-selected]')).toHaveText('2025')
  await panel(page).getByRole('button', { name: '2028', exact: true }).click()
  await expect(panel(page)).toBeHidden()
  await expect(input).toHaveValue('2028')
  await expect(out(page, 'year-model')).toHaveText('number 2028')
  await expect(out(page, 'year-events').locator('li')).toHaveText(['number 2028'])
})

test('year: the limits refuse a typed year and stop the keys', async ({ page }) => {
  const input = box(page, 'Budget year')
  await enter(input, '2031')
  await expect(input).toHaveValue('2025')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Choose a year on or before 2030.')).toBeVisible()
  await expect(out(page, 'limited-year-problem')).toHaveText('after-max 2031 2030')
  for (let i = 0; i < 6; i++) await input.press('y')
  await expect(input).toHaveValue('2020')
  await expect(out(page, 'limited-year-problem')).toHaveText('none')
  // In the calendar, every year outside 2020 to 2030 is disabled and every one inside is not, whichever years it shows.
  await input.press('Alt+ArrowDown')
  const cells = panel(page).locator('[data-reka-year-picker-cell-trigger]')
  await expect(cells.first()).toBeVisible()
  const years = await cells.evaluateAll((els) => els.map((el) => ({ year: Number(el.textContent!.trim()), disabled: el.hasAttribute('data-disabled') })))
  expect(years.filter((y) => y.disabled).length, 'some years are outside').toBeGreaterThan(0)
  expect(years.filter((y) => !y.disabled).length, 'some years are inside').toBeGreaterThan(0)
  for (const { year, disabled } of years) expect(disabled, String(year)).toBe(year < 2020 || year > 2030)
})

// ── The rest ──────────────────────────────────────────────────────────────────────────────────────────────────

test('the month-of-year recipe: a USelect of month names valued 1 to 12, beside a year', async ({ page }) => {
  const select = page.locator('[data-month-of-year]')
  await expect(select).toHaveText('12 - December')
  await select.click()
  await page.getByRole('option', { name: '10 - October' }).click()
  await expect(out(page, 'report-model')).toHaveText('month 10, year number 2025')
  await enter(box(page, 'Year'), '26')
  await expect(out(page, 'report-model')).toHaveText('month 10, year number 2026')
})

test('disabled fields take no typing and no calendar; the leading icon emits iconClick', async ({ page }) => {
  await expect(box(page, 'Locked month')).toBeDisabled()
  await expect(box(page, 'Locked year')).toBeDisabled()
  await expect(box(page, 'Locked month').locator('..').getByRole('button', { name: 'Choose a month' })).toBeDisabled()
  await expect(box(page, 'Locked month').locator('..').getByRole('button', { name: 'Clear month' })).toHaveCount(0)

  await page.locator('[data-fields="other"] [data-slot="leadingIcon"]').click()
  await expect(out(page, 'icon-clicks')).toHaveText('1')
})
