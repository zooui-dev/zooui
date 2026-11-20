import { expect, test, type Locator, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// ZDateField on the theme-free base, in a product (specimens/DateFieldSpecimen.vue), against the
// production build: it paints in the product's palette and its input variant in both modes, keeps the product's
// placeholder ink, keeps its UFormField label through hydration, and its calendar icon — the first Z* icon that is
// not also one of Nuxt UI's defaults — comes from the client bundle the layer registers it in.

// "Today" is the browser's, so the test owns the browser's clock and zone (see apps/forest/tests/date-field.spec.ts).
test.use({ timezoneId: 'America/Los_Angeles' })
const NOW = new Date('2026-11-13T05:30:00Z')

/** Tailwind's palette values the product's app.config and main.css point at. */
const TW = {
  'sky-200': 'oklch(90.1% 0.058 230.902)', 'sky-400': 'oklch(74.6% 0.16 232.661)', 'sky-500': 'oklch(68.5% 0.169 237.323)',
  'sky-900': 'oklch(39.1% 0.09 240.876)',
} as const

const toggle = (page: Page) => page.getByRole('group', { name: 'Theme' })
/** Hydrated: ZThemeToggle renders on the client only, and its enabled buttons replace the server's disabled ones. */
const hydrated = (page: Page) => expect(toggle(page).getByRole('button', { name: 'dark', exact: true })).toBeEnabled()

const field = (page: Page, name: string) => page.locator(`[data-date-field="${name}"]`)
const panel = (page: Page) => page.locator('[data-date-field-panel]')

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: NOW })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await hydrated(page)
})

const setDark = async (page: Page) => {
  await page.evaluate(() => localStorage.setItem('product-color-mode', 'dark'))
  await page.reload()
  await page.waitForLoadState('networkidle')
  await hydrated(page)
  await expect(page.locator('html')).toHaveClass(/dark/)
}

/** Opens "Starts" (focused, with a date) and reads its colors beside the palette values they should be, all as canvas
 *  pixels, since computed colors can be oklch, color-mix or light-dark(). */
async function paint(page: Page, expected: Record<string, string>) {
  const input = page.getByRole('textbox', { name: 'Starts', exact: true })
  await input.click()
  await field(page, 'starts').getByRole('button', { name: 'Choose a date' }).click()
  await expect(panel(page).locator('[data-selected]')).toBeVisible()
  return page.evaluate((want) => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
    const probe = document.createElement('div'); document.body.append(probe)
    const rgb = (c: string) => {
      probe.style.color = c; ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = getComputedStyle(probe).color; ctx.fillRect(0, 0, 1, 1)
      return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).join()
    }
    const starts = document.querySelector<HTMLInputElement>('[data-date-field="starts"] input')!
    const ends = document.querySelector<HTMLInputElement>('[data-date-field="ends"] input')!
    const cs = getComputedStyle(starts)
    const got = {
      text: rgb(cs.color),
      ring: rgb(cs.getPropertyValue('--tw-ring-color')),
      icon: rgb(getComputedStyle(starts.parentElement!.querySelector('button[aria-label="Choose a date"] > *')!).color),
      selected: rgb(getComputedStyle(document.querySelector('[data-date-field-panel] [data-selected]')!).backgroundColor),
      placeholder: rgb(getComputedStyle(ends, '::placeholder').color),
    }
    const wanted = Object.fromEntries(Object.entries(want).map(([k, v]) => [k, rgb(v)]))
    probe.remove()
    return { got, wanted }
  }, expected)
}

for (const mode of ['light', 'dark'] as const) {
  test(`ZDateField (${mode}): the product's input variant and primary, and its own placeholder ink`, async ({ page }) => {
    if (mode === 'dark') await setDark(page)
    // The value ink is the product's input variant (app.config: text-val-input); the ring, the focused icon and the
    // picked day are its primary (sky: 500 light, 400 dark, by Nuxt UI's rule); the placeholder is Nuxt UI's dimmed
    // ink in the product's neutral (slate), not one the component chose.
    const primary = mode === 'light' ? TW['sky-500'] : TW['sky-400']
    const { got, wanted } = await paint(page, {
      text: mode === 'light' ? TW['sky-900'] : TW['sky-200'],
      ring: primary, icon: primary, selected: primary,
      placeholder: 'var(--ui-text-dimmed)',
    })
    expect(got).toEqual(wanted)
  })

  test(`guards (${mode}): open and focused, no element carries two same-property utilities`, async ({ page }) => {
    if (mode === 'dark') await setDark(page)
    await page.getByRole('textbox', { name: 'Starts', exact: true }).click()
    await expect(field(page, 'starts').getByRole('button', { name: 'Clear date' })).toBeVisible()
    await field(page, 'starts').getByRole('button', { name: 'Choose a date' }).click()
    await expect(panel(page)).toBeVisible()
    expect(await page.evaluate(findConflicts)).toEqual([])
  })
}

// A focused input already has Nuxt UI's primary focus ring, so the open field's highlight shows once focus moves into
// the calendar (paging a month): the field stays ringed in the primary, not the product's input line (sky-600).
test('ZDateField: with focus in its open calendar, the field keeps the primary ring', async ({ page }) => {
  const { got, wanted } = await paint(page, { ring: TW['sky-500'] })
  expect(got.ring).toBe(wanted.ring)
  await panel(page).getByRole('button', { name: /next month/i }).click()
  await expect(panel(page)).toContainText('June 2026')
  expect(await page.evaluate(() => document.activeElement?.closest('[data-date-field-panel]') != null)).toBe(true)
  const ring = await page.locator('[data-date-field="starts"] input').evaluate((el) => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
    ctx.fillStyle = getComputedStyle(el).getPropertyValue('--tw-ring-color'); ctx.fillRect(0, 0, 1, 1)
    return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).join()
  })
  expect(ring).toBe(wanted.ring)
})

// Round-trip: every server-rendered DateField is named by its label after a fresh load. These fields sit in a
// data-loading component behind svg icons, and each field's own calendar icon is one more boundary before the
// next: with Nuxt's client tree-shake of onServerPrefetch, the browser's useId() ids drift from the server's and
// hydration leaves each label pointing at an id that is gone. The base keeps the call.
test('UFormField labels still name ZDateField after hydration (production build)', async ({ page }) => {
  for (const [name, label, value] of [['starts', 'Starts', '05/12/2026'], ['ends', 'Ends', '']] as const) {
    const r = await field(page, name).evaluate((el) => ({ for: el.querySelector('label')!.htmlFor, id: el.querySelector('input')!.id }))
    expect(r.for, name).not.toBe('')
    expect(r.for, name).toBe(r.id)
    const input = page.getByRole('textbox', { name: label, exact: true })
    await expect(input).toHaveValue(value)
    await field(page, name).locator('label').click()
    await expect(input, `clicking "${label}" focuses its textbox`).toBeFocused()
  }
})

// The base app lists only its own icons and does not `scan`, and lucide:calendar is not one of Nuxt UI's defaults: a
// field that mounts in the browser can only draw it from the client bundle if the layer put it there (Z_ICONS). On a
// page of its own: on the index page the server-rendered fields bring the same icon, and the browser reuses it.
// Checked to fail with lucide:calendar taken out of Z_ICONS.
test('ZDateField\'s icons come from the client bundle: a field mounted in the browser requests no icon data', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (r) => { if (/_nuxt_icon|iconify/.test(r.url())) requests.push(r.url()) })
  await page.goto('/date-field-later')
  await hydrated(page)
  await page.locator('[data-open="reminder"]').click()
  const remind = field(page, 'remind')
  await expect(remind.getByRole('button', { name: 'Choose a date' }).locator('svg')).toHaveCount(1)
  await remind.getByRole('textbox').click()
  await remind.getByRole('textbox').press('t')
  await expect(remind.getByRole('textbox')).toHaveValue('11/12/2026')
  await page.waitForLoadState('networkidle')
  expect(requests).toEqual([])
})

// ── Either type of day, and Nuxt UI's limits (pages/date-field-types.vue) ─────────────────────────────────────
// Each model hands back its own type: the page writes the type beside the day. The limited fields take March 10 to
// August 20, 2026 (a CalendarDate and a PlainDate), with weekends unavailable; today (November 12) is after them.

async function typesPage(page: Page) {
  await page.goto('/date-field-types')
  await page.waitForLoadState('networkidle')
  await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__)
}
const box = (page: Page, label: string) => page.getByRole('textbox', { name: label, exact: true })
const cell = (page: Page, iso: string) => panel(page).locator(`[data-slot="cellTrigger"][data-value="${iso}"]:not([data-outside-view])`)
async function commit(input: Locator, text: string) {
  await input.click()
  await input.press('ControlOrMeta+a')
  await input.pressSequentially(text)
  await input.press('Enter')
}
/** The text of what the input's aria-describedby names. */
const description = (input: Locator) => input.evaluate((el) =>
  (el.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean).map((id) => document.getElementById(id)?.textContent?.trim() ?? `(no #${id})`).join(' | '))

test('a CalendarDate model hands back CalendarDates: typed, picked, a shortcut, cleared and typed again', async ({ page }) => {
  await typesPage(page)
  const input = box(page, 'CalendarDate')
  const model = page.getByTestId('cal-model')
  await expect(input).toHaveValue('05/12/2026')
  await commit(input, '7/4/2026')
  await expect(model).toHaveText('CalendarDate 2026-07-04')
  await input.locator('..').getByRole('button', { name: 'Choose a date' }).click()
  await cell(page, '2026-07-20').click()
  await expect(model).toHaveText('CalendarDate 2026-07-20')
  await input.press('+')
  await expect(model).toHaveText('CalendarDate 2026-07-21')
  await input.locator('..').getByRole('button', { name: 'Clear date' }).click()
  await expect(model).toHaveText('null')
  // Cleared, it keeps the type it held.
  await commit(input, '5')
  await expect(model).toHaveText('CalendarDate 2026-11-05')
  await expect(page.getByTestId('cal-events').locator('li')).toHaveText([
    'CalendarDate 2026-07-04', 'CalendarDate 2026-07-20', 'CalendarDate 2026-07-21', 'null', 'CalendarDate 2026-11-05',
  ])
})

test('model-type: a null model told calendar-date hands back CalendarDates', async ({ page }) => {
  await typesPage(page)
  const input = box(page, 'From null')
  const model = page.getByTestId('from-null-model')
  await expect(model).toHaveText('null')
  await commit(input, '0512')
  await expect(model).toHaveText('CalendarDate 2026-05-12')
  await input.press('t')
  await expect(model).toHaveText('CalendarDate 2026-11-12')
})

test('a PlainDate model still hands back PlainDates', async ({ page }) => {
  await typesPage(page)
  const input = box(page, 'PlainDate')
  const model = page.getByTestId('plain-model')
  await commit(input, '7/4/2026')
  await expect(model).toHaveText('PlainDate 2026-07-04')
  await input.press('+')
  await input.locator('..').getByRole('button', { name: 'Clear date' }).click()
  await expect(model).toHaveText('null')
  await commit(input, '5')
  await expect(model).toHaveText('PlainDate 2026-11-05')
  await expect(page.getByTestId('plain-events').locator('li')).toHaveText(['PlainDate 2026-07-04', 'PlainDate 2026-07-05', 'null', 'PlainDate 2026-11-05'])
})

test('limits: a typed date before minValue or after maxValue keeps the date there was and marks the field invalid', async ({ page }) => {
  await typesPage(page)
  const input = box(page, 'Limited')
  const field = page.locator('[data-types="limited"]')
  const model = page.getByTestId('limited-model')
  const problem = page.getByTestId('limited-problem')
  await expect(input).toHaveAttribute('aria-invalid', 'false')

  await commit(input, '3/9/2026')
  await expect(input).toHaveValue('05/12/2026')
  await expect(model).toHaveText('CalendarDate 2026-05-12')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await expect(problem).toHaveText('before-min CalendarDate 2026-03-09 CalendarDate 2026-03-10')
  // The product shows `invalid`'s message in its UFormField, and the input is described by it.
  await expect(field.getByText('Choose a date on or after 03/10/2026.')).toBeVisible()
  expect(await description(input)).toBe('Choose a date on or after 03/10/2026.')
  // An edit takes the mark away.
  await input.pressSequentially('8')
  await expect(input).toHaveAttribute('aria-invalid', 'false')
  await expect(problem).toHaveText('none')

  await commit(input, '8/21/2026')
  await expect(input).toHaveValue('05/12/2026')
  await expect(problem).toHaveText('after-max CalendarDate 2026-08-21 CalendarDate 2026-08-20')
  await commit(input, '3/10/2026')
  await expect(model).toHaveText('CalendarDate 2026-03-10')
  await expect(input).toHaveAttribute('aria-invalid', 'false')

  // Outside a UFormField the field marks itself, with the message for screen readers.
  const bare = page.getByRole('textbox', { name: 'Bare limited' })
  await commit(bare, '8/21/2026')
  await expect(bare).toHaveValue('05/12/2026')
  await expect(bare).toHaveAttribute('aria-invalid', 'true')
  expect(await description(bare)).toBe('Choose a date on or before 08/20/2026.')
  await bare.pressSequentially('1')
  await expect(bare).not.toHaveAttribute('aria-invalid', 'true')
})

test('limits: the shortcut keys stop at minValue and maxValue, and t at the nearest allowed day', async ({ page }) => {
  await typesPage(page)
  const input = box(page, 'Limited')
  await commit(input, '3/11/2026')
  for (const [key, shown] of [
    ['-', '03/10/2026'],
    ['-', '03/10/2026'],
    ['m', '03/10/2026'],
    ['y', '03/10/2026'],
    ['r', '08/20/2026'],
    ['+', '08/20/2026'],
    ['h', '08/20/2026'],
    ['m', '08/03/2026'], // August 1 is a Saturday
    ['t', '08/20/2026'], // today, November 12, is after maxValue
  ]) {
    await input.press(key!)
    await expect(input, key).toHaveValue(shown!)
  }
  await expect(page.getByTestId('limited-model')).toHaveText('CalendarDate 2026-08-20')
  await expect(input).toHaveAttribute('aria-invalid', 'false')
})

test('limits: unavailable days are disabled in the calendar, refused when typed, and skipped by + and -', async ({ page }) => {
  await typesPage(page)
  const input = box(page, 'Limited')
  const model = page.getByTestId('limited-model')
  await commit(input, '5/15/2026') // a Friday
  await input.press('+')
  await expect(input).toHaveValue('05/18/2026')
  await input.press('-')
  await expect(input).toHaveValue('05/15/2026')

  await commit(input, '5/16/2026')
  await expect(input).toHaveValue('05/15/2026')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByTestId('limited-problem')).toHaveText('unavailable CalendarDate 2026-05-16 null')
  await expect(page.locator('[data-types="limited"]').getByText('05/16/2026 isn\'t available.')).toBeVisible()

  await input.locator('..').getByRole('button', { name: 'Choose a date' }).click()
  await expect(panel(page)).toContainText('May 2026')
  await expect(cell(page, '2026-05-16')).toHaveAttribute('data-unavailable', '')
  await expect(cell(page, '2026-05-16')).toHaveAttribute('aria-disabled', 'true')
  await expect(cell(page, '2026-05-15')).not.toHaveAttribute('aria-disabled', 'true')
  await cell(page, '2026-05-16').click({ force: true })
  await expect(model).toHaveText('CalendarDate 2026-05-15')
  await cell(page, '2026-05-19').click()
  await expect(model).toHaveText('CalendarDate 2026-05-19')

  // minValue and maxValue disable the days outside them.
  await commit(input, '3/10/2026')
  await input.locator('..').getByRole('button', { name: 'Choose a date' }).click()
  await expect(cell(page, '2026-03-09')).toHaveAttribute('data-disabled', '')
  await expect(cell(page, '2026-03-10')).not.toHaveAttribute('data-disabled', '')
  // isDateUnavailable was only ever handed the model's type.
  await expect(page.getByTestId('wrong-type')).toHaveText('')
})

// ── Typing and shortcuts, as Buoy's UInputDate (pages/date-field-entry.vue) ────────────────────────────────────

async function entryPage(page: Page) {
  await page.goto('/date-field-entry')
  await page.waitForLoadState('networkidle')
  await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__)
}

test('the #leading slot is drawn in place of the icon, with the input\'s leadingIcon class', async ({ page }) => {
  await entryPage(page)
  const input = box(page, 'With a leading slot')
  const leading = input.locator('..').locator('[data-slot="leading"]')
  await expect(leading.getByTestId('leading-badge')).toHaveText('Due')
  // The slot replaces the icon: the badge is all there is.
  await expect(leading.locator('> *')).toHaveCount(1)
  await expect(leading.getByTestId('leading-badge')).toHaveClass(/(^|\s)shrink-0(\s|$)/)
})

test('shortcuts step from the committed date, not from text typed since; with none, from today', async ({ page }) => {
  await entryPage(page)
  const saved = box(page, 'Saved')
  await saved.click()
  await saved.press('ControlOrMeta+a')
  await saved.pressSequentially('04/0')
  await saved.press('+')
  await expect(saved).toHaveValue('03/16/2026')
  await expect(page.getByTestId('saved-model')).toHaveText('2026-03-16')
  // Again, from what + just committed: typing then m goes to the first of the committed month.
  await saved.pressSequentially('12/2')
  await saved.press('m')
  await expect(saved).toHaveValue('03/01/2026')

  const empty = box(page, 'Empty')
  await empty.click()
  await empty.pressSequentially('5')
  await empty.press('+')
  // Today is November 12, 2026 in the browser: + is the 13th, not the 6th.
  await expect(empty).toHaveValue('11/13/2026')
  await expect(page.getByTestId('empty-model')).toHaveText('2026-11-13')
})

test('eight digits are month, day and year', async ({ page }) => {
  await entryPage(page)
  const eight = box(page, 'Eight digits')
  await commit(eight, '05122026')
  await expect(eight).toHaveValue('05/12/2026')
  await expect(page.getByTestId('eight-model')).toHaveText('2026-05-12')
})
