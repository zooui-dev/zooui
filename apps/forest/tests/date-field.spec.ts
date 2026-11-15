import { expect, test, type Locator, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// ZDateField (specimens/DateFieldSpecimen.vue) on the Forest theme: its inks on every scheme in both themes, the
// guards, and a product's two e2e flows (a form in a dialog, a date round-trip) driven the way a person
// drives the field. The parsing and shortcut arithmetic are unit-tested in scripts/date-entry.test.mjs; this is the
// wiring. What the product checked against its server (a save and a reload) is the parent's v-model here.
//
// "Today" is the browser's, so the test owns the browser's clock and zone: 21:30 on November 12 in Los Angeles,
// which is already the 13th in UTC (and in Tokyo, below). Test code may use a Date; the component may not.
// The clock starts there and RUNS (clock.install), never frozen (setFixedTime): Vue drops a DOM event whose timestamp
// is not later than its listener's, and with Date.now() stuck they tie — a click away then left junk in the field.
const NOW = new Date('2026-11-13T05:30:00Z')
const TODAY = '11/12/2026'
test.use({ timezoneId: 'America/Los_Angeles' })

const hydrated = (page: Page) => page.waitForFunction(() => !!(document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__)

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: NOW })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await hydrated(page)
})

const specimen = (page: Page) => page.locator('section#date-field')
const panel = (page: Page) => page.locator('[data-date-field-panel]')
const isFocused = (l: Locator) => l.evaluate((el) => document.activeElement === el)
/** The highlight ring Nuxt UI puts on a field, as a bare class (not its focus-visible: one). */
const RING = /(^|\s)ring-primary(\s|$)/

async function enter(input: Locator, text: string) {
  await input.click()
  await input.press('ControlOrMeta+a')
  await input.press('Backspace')
  if (text) await input.pressSequentially(text)
  await input.press('Enter')
}

// ── Inks, on every scheme ─────────────────────────────────────────────────────────────────────────────────────

const SCHEMES = ['teal', 'slate-cobalt', 'graphite-violet', 'paper-olive', 'ink-indigo', 'ember']

async function onScheme(page: Page, scheme: string, mode: 'light' | 'dark') {
  await page.context().addCookies([{ name: 'zooui-scheme', value: scheme, url: page.url() }])
  await page.evaluate((m) => localStorage.setItem('zooui-color-mode', m), mode)
  await page.reload()
  await page.waitForLoadState('networkidle')
  await hydrated(page)
  if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
  else await expect(page.locator('html')).not.toHaveClass(/dark/)
}

/** The field's colors with its calendar open, in one evaluate: canvas pixels, since computed colors can be oklch or
 *  color-mix. The open field is the focused one (with a date); the harness field is empty, showing its placeholder. */
const paint = (page: Page) => page.evaluate(() => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  const rgb = (c: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3) }
  const lum = (c: number[]) => c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i]!, 0)
  const ratio = (fg: string, bg: string) => { const [a, b] = [lum(rgb(fg)), lum(rgb(bg))]; return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) }
  const probe = document.createElement('div'); probe.style.color = 'var(--ui-primary)'; document.body.append(probe)
  const primary = rgb(getComputedStyle(probe).color).join(); probe.remove()
  const q = (sel: string) => { const el = document.querySelector(sel); if (!el) throw new Error(`nothing matches ${sel}`); return el }
  const input = document.activeElement as HTMLInputElement
  const empty = q('[data-date-specimen="harness"] input') as HTMLInputElement
  // Forest draws icons in CSS mode (a span), the base app in svg mode: the icon is the button's one child either way.
  const choose = input.parentElement!.querySelector('button[aria-label="Choose a date"] > *')!
  const bg = getComputedStyle(input).backgroundColor
  return {
    primary,
    ring: rgb(getComputedStyle(input).getPropertyValue('--tw-ring-color')).join(),
    icon: rgb(getComputedStyle(choose).color).join(),
    selected: rgb(getComputedStyle(q('[data-date-field-panel] [data-selected]')).backgroundColor).join(),
    value: Math.floor(ratio(getComputedStyle(input).color, bg) * 100) / 100,
    placeholder: rgb(getComputedStyle(empty, '::placeholder').color).join(),
    plainPlaceholder: rgb(getComputedStyle(q('input[placeholder="Somewhere else"]'), '::placeholder').color).join(),
  }
})

for (const mode of ['light', 'dark'] as const) {
  test.describe(`ZDateField (${mode}): the primary marks it open and focused, the date clears 4.5:1, the placeholder is the input's`, () => {
    for (const scheme of SCHEMES) {
      test(scheme, async ({ page }) => {
        await onScheme(page, scheme, mode)
        const due = specimen(page).getByRole('textbox', { name: 'Due', exact: true })
        await due.click()
        await due.locator('..').getByRole('button', { name: 'Choose a date' }).click()
        await expect(panel(page).locator('[data-selected]')).toBeVisible()
        const p = await paint(page)
        expect({ ring: p.ring, icon: p.icon, selected: p.selected }).toEqual({ ring: p.primary, icon: p.primary, selected: p.primary })
        expect(p.value, 'the date').toBeGreaterThanOrEqual(4.5)
        // The placeholder is the input's own, as the product styles it: the same ink as a plain UInput's.
        expect(p.placeholder).toBe(p.plainPlaceholder)
      })
    }
  })

  test(`guards (${mode}): open, focused and clearable, no element carries two same-property utilities`, async ({ page }) => {
    if (mode === 'dark') await onScheme(page, 'ink-indigo', 'dark')
    const due = specimen(page).getByRole('textbox', { name: 'Due', exact: true })
    await due.click()
    await expect(due.locator('..').getByRole('button', { name: 'Clear date' })).toBeVisible()
    await due.locator('..').getByRole('button', { name: 'Choose a date' }).click()
    await expect(panel(page)).toBeVisible()
    expect(await page.evaluate(findConflicts)).toEqual([])
  })
}

// ── A form's "Ends", in a dialog ──────────────────────────────────────

async function billForm(page: Page) {
  await page.locator('[data-open="bill"]').click()
  const dialog = page.getByRole('dialog')
  const input = dialog.getByRole('textbox', { name: 'Ends' })
  await expect(input).toBeVisible()
  return { dialog, input, field: input.locator('..'), icon: input.locator('..').getByRole('button', { name: 'Choose a date' }) }
}

test('typed forms commit on Enter; junk clears', async ({ page }) => {
  const { input } = await billForm(page)
  for (const [typed, shown] of [
    ['5', '11/05/2026'],
    ['0512', '05/12/2026'],
    ['5/12', '05/12/2026'],
    ['051226', '05/12/2026'],
    ['5/12/26', '05/12/2026'],
    ['5/12/2026', '05/12/2026'],
    ['13/45', ''],
    ['2/30', ''],
  ]) {
    await enter(input, typed!)
    await expect(input, typed).toHaveValue(shown!)
  }
})

test('shortcut keys', async ({ page }) => {
  const { input } = await billForm(page)
  await input.click()
  await input.press('t')
  await expect(input).toHaveValue(TODAY)
  await enter(input, '5/12/2026')
  for (const [key, shown] of [
    ['m', '05/01/2026'],
    ['m', '04/01/2026'],
    ['h', '04/30/2026'],
    ['h', '05/31/2026'],
    ['y', '01/01/2026'],
    ['y', '01/01/2025'],
    ['r', '12/31/2025'],
    ['r', '12/31/2026'],
    ['+', '01/01/2027'],
    ['-', '12/31/2026'],
    ['=', '01/01/2027'],
  ]) {
    await input.press(key!)
    await expect(input, key).toHaveValue(shown!)
  }
  // The shortcut's date is selected, so typing replaces it.
  await input.pressSequentially('0704')
  await input.press('Enter')
  await expect(input).toHaveValue('07/04/2026')
})

test('calendar: opens on the field\'s month without taking focus, highlights the field, a pick closes it', async ({ page }) => {
  const { input, icon } = await billForm(page)
  await enter(input, '5/12/2026')
  await expect(input).not.toHaveClass(RING)
  await icon.click()
  await expect(panel(page)).toBeVisible()
  await expect(panel(page)).toContainText('May 2026')
  expect(await isFocused(input)).toBe(true)
  await expect(input).toHaveClass(RING)
  await panel(page).locator('[data-slot="cellTrigger"]:not([data-outside-view])', { hasText: /^\s*20\s*$/ }).click()
  await expect(input).toHaveValue('05/20/2026')
  await expect(panel(page)).toBeHidden()
  expect(await isFocused(input)).toBe(true)
  await expect(input).not.toHaveClass(RING)
})

test('calendar: the icon toggles it, typing moves it, Escape closes it but not the dialog', async ({ page }) => {
  const { dialog, input, icon } = await billForm(page)
  await input.click()
  await icon.click()
  await expect(panel(page)).toBeVisible()
  await icon.click()
  await expect(panel(page)).toBeHidden()
  await icon.click()
  await input.press('ControlOrMeta+a')
  await input.pressSequentially('0204')
  await expect(panel(page)).toContainText('February 2026')
  await input.press('Escape')
  await expect(panel(page)).toBeHidden()
  await expect(dialog).toBeVisible()
})

test('clear, blur and Tab; the PlainDate stays in the model', async ({ page }) => {
  const { dialog, input, field } = await billForm(page)
  await enter(input, '7/4/2026')
  const clear = field.getByRole('button', { name: 'Clear date' })
  await clear.click()
  await expect(input).toHaveValue('')
  expect(await isFocused(input)).toBe(true)
  await expect(clear).toHaveCount(0)

  await input.pressSequentially('99/99')
  await dialog.getByText('Payee or description').click()
  await expect(input).toHaveValue('')
  await input.click()
  await input.pressSequentially('0916')
  await input.press('Tab')
  await expect(input).toHaveValue('09/16/2026')

  // The product saved the bill and reopened it; here the dialog's owner keeps the PlainDate across close and reopen.
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  const again = await billForm(page)
  await expect(again.input).toHaveValue('09/16/2026')
})

// ── The harness: `dateUpdate` announces each settle once, with the new date ───────────────────────────────

function harness(page: Page) {
  const root = page.locator('[data-date-specimen="harness"]')
  return {
    root,
    input: root.getByRole('textbox', { name: 'Harness date' }),
    events: page.getByTestId('events').locator('li'),
    model: page.getByTestId('model'),
    elsewhere: page.getByPlaceholder('Somewhere else'),
    reset: () => page.getByTestId('reset').click(),
  }
}

test('dateUpdate: typing and leaving announces the typed date once, a changed date the new one, Enter its date', async ({ page }) => {
  const { input, events, model, elsewhere, reset } = harness(page)
  await input.click()
  await input.pressSequentially('5/12/2026')
  await input.press('Tab')
  await expect(events).toHaveText(['2026-05-12'])
  await expect(model).toHaveText('2026-05-12')

  await reset()
  await input.click()
  await input.press('ControlOrMeta+a')
  await input.pressSequentially('6/1/2026')
  await elsewhere.click()
  await expect(events).toHaveText(['2026-06-01'])

  await reset()
  await input.click()
  await input.press('ControlOrMeta+a')
  await input.pressSequentially('7/4/2026')
  await input.press('Enter')
  await expect(events).toHaveText(['2026-07-04'])
})

// An inline editor saves on dateUpdate, so Enter and the blur that follows it must not save twice.
test('dateUpdate: leaving after Enter, or after a shortcut, doesn\'t announce the same date again', async ({ page }) => {
  const { input, events, model, elsewhere } = harness(page)
  await input.click()
  await input.pressSequentially('7/4/2026')
  await input.press('Enter')
  await elsewhere.click()
  await expect(model).toHaveText('2026-07-04')
  await expect(events).toHaveText(['2026-07-04'])
  // A changed date is a new settle, and leaving after it is announced as usual.
  await input.click()
  await input.press('+')
  await input.press('Tab')
  await expect(events).toHaveText(['2026-07-04', '2026-07-05'])
  await input.click()
  await input.press('ControlOrMeta+a')
  await input.pressSequentially('8/1/2026')
  await elsewhere.click()
  await expect(events).toHaveText(['2026-07-04', '2026-07-05', '2026-08-01'])
})

test('dateUpdate: a shortcut, a pick and a clear each announce their own date', async ({ page }) => {
  const { root, input, events } = harness(page)
  await input.click()
  await input.pressSequentially('5/12/2026')
  await input.press('h')
  await expect(events).toHaveText(['2026-05-31'])
  await root.getByRole('button', { name: 'Choose a date' }).click()
  await panel(page).locator('[data-slot="cellTrigger"]:not([data-outside-view])', { hasText: /^\s*20\s*$/ }).click()
  await expect(events).toHaveText(['2026-05-31', '2026-05-20'])
  await root.getByRole('button', { name: 'Clear date' }).click()
  await expect(events).toHaveText(['2026-05-31', '2026-05-20', 'null'])
})

// Round-trip: a stored day the field couldn't read back if typed (a year before 1000 shows as
// "0026", which parseDateEntry takes for a slip) is kept while untouched (commitDateEntry).
test('a stored year-0026 date survives passing through the field', async ({ page }) => {
  const { input, model, elsewhere } = harness(page)
  await page.getByTestId('load-0026').click()
  await expect(input).toHaveValue('05/12/0026')
  await input.click()
  await elsewhere.click()
  await expect(input).toHaveValue('05/12/0026')
  await expect(model).toHaveText('0026-05-12')
})

// ── Referral filters: a range whose ends put a default back when a settle carries null ──────────────

function range(page: Page) {
  const root = page.locator('[data-date-specimen="range"]')
  return {
    from: root.getByRole('textbox', { name: 'From', exact: true }),
    to: root.getByRole('textbox', { name: 'To', exact: true }),
    elsewhere: specimen(page).getByRole('heading', { name: 'ZDateField' }),
  }
}

test('a settle carries its own date: a blanked or junk From puts the default back', async ({ page }) => {
  const { from: input, elsewhere } = range(page)
  await expect(input).toHaveValue('01/01/2026')
  await input.click()
  await input.press('ControlOrMeta+a')
  await input.pressSequentially('5/12/2026')
  await input.press('Tab')
  await expect(input).toHaveValue('05/12/2026')
  await input.click()
  await input.press('ControlOrMeta+a')
  await input.press('Backspace')
  await input.press('Tab')
  await expect(input).toHaveValue('01/01/2026')

  await input.click()
  await input.press('ControlOrMeta+a')
  await input.pressSequentially('6/1/2026')
  await input.press('Enter')
  await expect(input).toHaveValue('06/01/2026')
  await input.press('ControlOrMeta+a')
  await input.pressSequentially('99/99')
  await elsewhere.click()
  await expect(input).toHaveValue('01/01/2026')
})

// Past these ends formatDateEntry writes a year parseDateEntry won't read, so the blur would clear the field.
test('shortcuts stop at the last and first day the field can read back', async ({ page }) => {
  const { from: input, elsewhere } = range(page)
  await enter(input, '12/31/9999')
  for (const k of ['+', 'h', 'r']) await input.press(k)
  await expect(input).toHaveValue('12/31/9999')
  await input.press('ControlOrMeta+a')
  await input.pressSequentially('1/1/1000')
  await input.press('Enter')
  for (const k of ['-', 'm', 'y']) await input.press(k)
  await expect(input).toHaveValue('01/01/1000')
  await elsewhere.click()
  await expect(input).toHaveValue('01/01/1000')
})

// The month heading was the only part of the calendar whose width depended on its text, and the popover sizes to its
// content: paging from May to September widened it and slid the grid and arrows under the pointer.
test('the calendar keeps its width as you page through the months', async ({ page }) => {
  const { from: input } = range(page)
  await enter(input, '5/12/2026')
  await input.locator('..').getByRole('button', { name: 'Choose a date' }).click()
  await expect(panel(page)).toContainText('May 2026')
  // Layout width, not boundingBox(): the popover opens with a scale-in animation.
  const width = () => panel(page).evaluate((el) => (el as HTMLElement).offsetWidth)
  const may = await width()
  for (let i = 0; i < 4; i++) await panel(page).getByRole('button', { name: /next month/i }).click()
  await expect(panel(page)).toContainText('September 2026')
  expect(await width()).toBe(may)
  for (let i = 0; i < 4; i++) await panel(page).getByRole('button', { name: /previous month/i }).click()
  await expect(panel(page)).toContainText('May 2026')
  expect(await width()).toBe(may)
})

// The default "To" is today, and the reset hands back a new PlainDate; Enter and a click away each blank and
// reset in one handler.
for (const how of ['Enter', 'click away'] as const) {
  test(`blanking To puts today back in the box (${how})`, async ({ page }) => {
    const { to, elsewhere } = range(page)
    await expect(to).toHaveValue(TODAY)
    await to.click()
    await to.press('ControlOrMeta+a')
    await to.press('Backspace')
    if (how === 'Enter') await to.press('Enter')
    else await elsewhere.click()
    await expect(to).toHaveValue(TODAY)
  })
}

// Every server-rendered DateField is named by its label after a fresh load (the base layer's onServerPrefetch fix). apps/base holds the drift case itself.
test('every server-rendered ZDateField is named by its label after a fresh load', async ({ page }) => {
  for (const label of ['Due', 'Due (de)', 'Due (ISO)', 'From', 'To']) {
    const field = specimen(page).getByRole('textbox', { name: label, exact: true })
    await expect(field, `"${label}" names its textbox`).toHaveCount(1)
    await specimen(page).locator('label').getByText(label, { exact: true }).click()
    await expect(field, `clicking "${label}" focuses its textbox`).toBeFocused()
  }
})

// ── Format and locale ─────────────────────────────────────────────────────────────────────────────────────────

test('locale="de": DD.MM.YYYY from the locale, its own separator only, a German calendar', async ({ page }) => {
  const input = specimen(page).getByRole('textbox', { name: 'Due (de)', exact: true })
  await expect(input).toHaveValue('12.05.2026')
  await expect(input).toHaveAttribute('placeholder', 'DD.MM.YYYY')
  await enter(input, '1/6')
  await expect(input).toHaveValue('')
  await enter(input, '1.6')
  await expect(input).toHaveValue('01.06.2026')
  await enter(input, '0106')
  await expect(input).toHaveValue('01.06.2026')
  await input.locator('..').getByRole('button', { name: 'Choose a date' }).click()
  await expect(panel(page)).toContainText('Juni 2026')
})

test('format="YYYY-MM-DD": the dash types as the separator, and _ is the day before', async ({ page }) => {
  const input = specimen(page).getByRole('textbox', { name: 'Due (ISO)', exact: true })
  await expect(input).toHaveValue('2026-05-12')
  await expect(input).toHaveAttribute('placeholder', 'YYYY-MM-DD')
  await enter(input, '2026-6-1')
  await expect(input).toHaveValue('2026-06-01')
  await input.press('_')
  await expect(input).toHaveValue('2026-05-31')
  await input.press('+')
  await expect(input).toHaveValue('2026-06-01')
})

// ── Icon options and weekday headers ───────────────────────────────────────────────────────────────────

test('the leading icon emits iconClick with its MouseEvent; calendar-icon replaces the calendar', async ({ page }) => {
  const root = page.locator('[data-date-specimen="icons"]')
  const input = root.getByRole('textbox', { name: 'Starts', exact: true })
  const clicks = page.getByTestId('icon-clicks')
  // Forest draws icons in CSS mode: the icon's name is its class.
  const leading = root.locator('[data-slot="leading"] > *')
  await expect(leading).toHaveClass(/lucide:history(\s|$)/)
  await expect(clicks).toHaveText('')
  await leading.click()
  await expect(clicks).toHaveText('click')
  await leading.click()
  await expect(clicks).toHaveText('click click')

  const choose = input.locator('..').getByRole('button', { name: 'Choose a date' })
  await expect(choose.locator('> *')).toHaveClass(/lucide:calendar-days(\s|$)/)
  // It is still the calendar's button, and a field without the prop keeps the default.
  await choose.click()
  await expect(panel(page)).toBeVisible()
  const due = specimen(page).getByRole('textbox', { name: 'Due', exact: true })
  await expect(due.locator('..').getByRole('button', { name: 'Choose a date' }).locator('> *')).toHaveClass(/lucide:calendar(\s|$)/)
  // No leading icon, no leading slot.
  await expect(due.locator('..').locator('[data-slot="leading"]')).toHaveCount(0)
})

/** The calendar's weekday headers, and the locale's narrow weekdays from Intl in some rotation (weeks start on
 *  Sunday or Monday). Sunday 2026-11-15, at noon UTC so no zone moves the day. */
async function weekdays(page: Page, label: string, locale: string) {
  const input = specimen(page).getByRole('textbox', { name: label, exact: true })
  await input.locator('..').getByRole('button', { name: 'Choose a date' }).click()
  const heads = panel(page).locator('[data-slot="headCell"]')
  await expect(heads).toHaveCount(7)
  const shown = (await heads.allTextContents()).map((t) => t.trim())
  const narrow = await page.evaluate((loc) => Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(loc, { weekday: 'narrow', timeZone: 'UTC' }).format(Date.UTC(2026, 10, 15 + i, 12))), locale)
  const rotations = narrow.map((_, r) => [...narrow.slice(r), ...narrow.slice(0, r)])
  return { shown, rotations }
}

test('weekday headers are the locale\'s narrow weekdays: one letter in en, German ones in de', async ({ page }) => {
  const en = await weekdays(page, 'Due', 'en')
  for (const d of en.shown) expect(d, 'one character').toHaveLength(1)
  expect(en.rotations).toContainEqual(en.shown)
  await page.keyboard.press('Escape')
  const de = await weekdays(page, 'Due (de)', 'de')
  expect(de.rotations).toContainEqual(de.shown)
  // German narrow weekdays (Dienstag, Donnerstag: D) aren't English ones (Tuesday, Thursday: T).
  expect(de.shown).toContain('D')
  expect(de.shown).not.toContain('T')
})

// ── Today is the browser's ────────────────────────────────────────────────────────────────────────────────────

test('today is the browser\'s day: t, a bare day of the month, and the calendar\'s month and today marker', async ({ page }) => {
  const { root, input } = harness(page)
  await input.click()
  await input.press('t')
  await expect(input).toHaveValue(TODAY)
  await enter(input, '5')
  await expect(input).toHaveValue('11/05/2026')
  await enter(input, '')
  await root.getByRole('button', { name: 'Choose a date' }).click()
  await expect(panel(page)).toContainText('November 2026')
  await expect(panel(page).locator('[data-today]')).toHaveText('12')
})

test.describe('in Tokyo, where it is already the 13th', () => {
  test.use({ timezoneId: 'Asia/Tokyo' })
  test('t is the 13th, and so is the calendar\'s today', async ({ page }) => {
    const { root, input } = harness(page)
    await input.click()
    await input.press('t')
    await expect(input).toHaveValue('11/13/2026')
    await enter(input, '')
    await root.getByRole('button', { name: 'Choose a date' }).click()
    await expect(panel(page).locator('[data-today]')).toHaveText('13')
  })
})
