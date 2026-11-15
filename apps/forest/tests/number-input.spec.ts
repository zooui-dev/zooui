import { expect, test, type Locator, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// ZNumberInput, on the Forest app's specimen (app/components/specimens/NumberInputSpecimen.vue):
// how it moves, what it hands back, how its marks line up, and that it paints in Nuxt UI's semantic tokens on every
// Forest scheme in both themes with no conflicting utilities. The first two tests are a product's number-input e2e checks,
// ported from its pages to the specimen.

const field = (page: Page, name: string) => page.locator(`[data-specimen="ni-${name}"]`)
/** The UInput's root: the input, its leading mark and its trailing unit mark and chevrons. */
const root = (page: Page, name: string) => field(page, name).locator('xpath=..')
const model = (page: Page, key: string) => page.locator(`[data-model="${key}"]`)

/** Hydrated: before Vue takes over, an arrow key does nothing a test could see. */
async function hydrated(page: Page) {
  await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await hydrated(page)
})

/** Any CSS color as getComputedStyle reports it, so the two sides compare equal. */
const resolve = (page: Page, value: string) => page.evaluate((v) => {
  const d = document.createElement('div'); d.style.color = v; document.body.append(d)
  const c = getComputedStyle(d).color; d.remove(); return c
}, value)
const color = (l: Locator) => l.evaluate((el) => getComputedStyle(el).color)

/** The sweep: at least `least` shared number fields in `scope`, and every number input there is one, with no
 *  native spinner. */
async function expectShared(scope: Locator, where: string, least: number) {
  await expect.poll(() => scope.locator('[data-number-input]').count(), { message: `${where}: shared number fields` }).toBeGreaterThanOrEqual(least)
  const stray = await scope.locator('input[type="number"]').evaluateAll((els) =>
    els
      .filter((el) => !el.hasAttribute('data-number-input') || getComputedStyle(el).appearance !== 'textfield' || el.getAttribute('step') !== 'any')
      .map((el) => `${el.getAttribute('aria-label') ?? el.id}: shared=${el.hasAttribute('data-number-input')} appearance=${getComputedStyle(el).appearance} step=${el.getAttribute('step')}`),
  )
  expect(stray, `${where}: number inputs outside ZNumberInput, or showing the native spinner`).toEqual([])
}

test('every number input is the shared one, step="any", with no native spinner', async ({ page }) => {
  await expectShared(page.locator('section#number-input'), 'specimen', 11)
})

test('a setup wizard figure, typed freely and nudged by its step', async ({ page }) => {
  const hours = page.getByLabel('Hours a week', { exact: true })
  await expect(hours).toHaveAttribute('data-number-input')
  await expect(hours).toHaveAttribute('type', 'text')
  await hours.fill('40')
  await hours.press('ArrowUp')
  await expect(hours).toHaveValue('40.5')
  await root(page, 'wizard').getByRole('button', { name: 'Subtract 0.5 hours' }).click()
  await expect(hours).toHaveValue('40')
  // Read as the wizard reads it ("40." is 40). What it can't read is left for the field's validation to explain, never
  // overwritten: a decimal comma, split digits, a word. Hours stop at zero.
  await hours.fill('40.')
  await hours.press('ArrowUp')
  await expect(hours).toHaveValue('40.5')
  for (const typed of ['1,5', '12 34', 'forty']) {
    await hours.fill(typed)
    await hours.press('ArrowUp')
    await expect(hours).toHaveValue(typed)
  }
  await hours.fill('0')
  await hours.press('ArrowDown')
  await expect(hours).toHaveValue('0')
  // and a figure with its marks, as typed in the wizard: "$125,000" moves to 125,000.5
  await hours.fill('$125,000')
  await hours.press('ArrowUp')
  await expect(hours).toHaveValue('125000.5')
})

test('nudges by the step from the current value, never snapping to a multiple, and stays valid', async ({ page }) => {
  // (live formatting: shown grouped, money in cents)
  const money = field(page, 'money')
  await expect(money).toHaveValue('38,500.00')
  await money.press('ArrowUp')
  await expect(money).toHaveValue('43,500.00')
  await root(page, 'money').getByRole('button', { name: 'Subtract $5,000' }).click()
  await expect(money).toHaveValue('38,500.00')
  await money.fill('38512')
  await money.press('ArrowUp')
  await expect(money).toHaveValue('43,512.00')
  expect(await money.evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(true)
  // decimal arithmetic: float addition would give 0.09999999999999998
  const count = field(page, 'count')
  await count.fill('-0.9')
  await count.press('ArrowUp')
  await expect(count).toHaveValue('0.1')
})

test('hands back the type the caller holds: a number stays a number, a string a string', async ({ page }) => {
  await field(page, 'money').press('ArrowUp')
  await expect(model(page, 'money')).toHaveText('number 43500')
  await field(page, 'percent').press('ArrowUp')
  await expect(model(page, 'percent')).toHaveText('string 13.5')
  await root(page, 'hours').getByRole('button', { name: 'Subtract 0.5 hours' }).click()
  await expect(model(page, 'hours')).toHaveText('string 7')
  // typing too: a string model gets its string back, a number model its number
  await field(page, 'percent').fill('20.25')
  await expect(model(page, 'percent')).toHaveText('string 20.25')
  await field(page, 'percent').press('ArrowUp')
  await expect(model(page, 'percent')).toHaveText('string 21.25')
  await field(page, 'money').fill('1000')
  await expect(model(page, 'money')).toHaveText('number 1000')
  // keystroke by keystroke, the string model doesn't rewrite the field: "1.0" survives on the way to "1.05"
  await field(page, 'percent').fill('')
  await field(page, 'percent').pressSequentially('1.05')
  await expect(field(page, 'percent')).toHaveValue('1.05')
  await expect(model(page, 'percent')).toHaveText('string 1.05')
  // empty starts from zero
  await field(page, 'empty').press('ArrowUp')
  await expect(field(page, 'empty')).toHaveValue('1')
})

test('min and max clamp a nudge and a commit; a typed value out of range is :invalid until then', async ({ page }) => {
  const rating = field(page, 'clamped')
  await rating.press('ArrowUp')
  await expect(rating).toHaveValue('10')
  await root(page, 'clamped').getByRole('button', { name: 'Add 1' }).click()
  await expect(rating).toHaveValue('10')
  await rating.fill('0')
  await rating.press('ArrowDown')
  await expect(rating).toHaveValue('0')
  // (the clamp on commit: until it, the field is left at 12 and rangeOverflow)
  const valid = () => rating.evaluate((el: HTMLInputElement) => el.validity.valid)
  await rating.fill('12')
  expect(await valid()).toBe(false)
  await rating.press('Enter')
  await expect(rating).toHaveValue('10')
  expect(await valid()).toBe(true)
  await rating.fill('15')
  await rating.press('Tab')
  await expect(rating).toHaveValue('10')
  await rating.fill('11')
  await rating.blur()
  await expect(rating).toHaveValue('10')
  // a minus can't be typed where min is 0
  await rating.fill('-3')
  await expect(rating).toHaveValue('3')
})

test('a disabled or read-only field is not nudged, by its chevrons or its keys', async ({ page }) => {
  for (const name of ['disabled', 'readonly']) {
    for (const button of await root(page, name).getByRole('button').all()) await expect(button).toBeDisabled()
  }
  const readonly = field(page, 'readonly')
  await readonly.press('ArrowUp')
  await expect(readonly).toHaveValue('4')
})

test('neutral defaults: money moves by 1 in US dollars; the currency is a prop', async ({ page }) => {
  await expect(root(page, 'plain').locator('[data-number-mark="lead"]')).toHaveText('$')
  await root(page, 'plain').getByRole('button', { name: 'Add $1', exact: true }).click()
  await expect(model(page, 'plain')).toHaveText('number 11')
  await expect(root(page, 'euro').locator('[data-number-mark="lead"]')).toHaveText('€')
  await expect(root(page, 'euro').getByRole('button', { name: 'Add €1', exact: true })).toBeVisible()
  await expect(root(page, 'count').getByRole('button', { name: 'Add 1', exact: true })).toBeVisible()
  await expect(root(page, 'percent').getByRole('button', { name: 'Add 1%', exact: true })).toBeVisible()
})

test('unit marks sit in fixed slots: a column of money, percent and count values ends on one edge', async ({ page }) => {
  const geometry = await page.locator('[data-specimen="ni-column"] [data-number-input]').evaluateAll((els) => els.map((el) => {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el)
    const parent = el.parentElement!
    const mark = parent.querySelector('[data-number-mark="unit"]')!.getBoundingClientRect()
    const chevron = parent.querySelector('button')!.getBoundingClientRect()
    return { unit: el.getAttribute('data-unit'), valueEnd: Math.round(r.right - parseFloat(s.paddingRight)), mark: Math.round(mark.width), chevron: Math.round(chevron.left), align: s.textAlign }
  }))
  expect(geometry.map((g) => g.unit)).toEqual(['money', 'percent', 'count', 'hours'])
  const [money, percent, count, hours] = geometry
  expect(geometry.every((g) => g.align === 'right')).toBe(true)
  // the empty slot (money, count) is as wide as the percent sign's, so the three values end on the same edge
  expect(new Set([money!.mark, percent!.mark, count!.mark]).size).toBe(1)
  expect(new Set([money!.valueEnd, percent!.valueEnd, count!.valueEnd]).size).toBe(1)
  // hours has a wider slot of its own; the chevrons line up in every unit
  expect(hours!.mark).toBeGreaterThan(percent!.mark)
  expect(new Set(geometry.map((g) => g.chevron)).size).toBe(1)
})

/** The field's caret, and where the selection ends. */
const caret = (l: Locator) => l.evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])
/** Put the caret at `at` in a focused field. */
const caretAt = (l: Locator, at: number) => l.evaluate((el: HTMLInputElement, i) => { el.focus(); el.setSelectionRange(i, i) }, at)

test('formats as it is typed: grouping comes and goes, the caret stays on its digit', async ({ page }) => {
  const visitors = field(page, 'big')
  await expect(visitors).toHaveValue('1,234,567')
  await caretAt(visitors, 1)
  await page.keyboard.type('9')
  await expect(visitors).toHaveValue('19,234,567')
  expect(await caret(visitors)).toEqual([2, 2])
  await expect(model(page, 'big')).toHaveText('number 19234567')
  // Backspace over a separator takes the digit before it, and the caret stays put on the digits
  await caretAt(visitors, 3)
  await page.keyboard.press('Backspace')
  await expect(visitors).toHaveValue('1,234,567')
  expect(await caret(visitors)).toEqual([1, 1])
  await page.keyboard.press('Delete')
  await expect(visitors).toHaveValue('134,567')
  // letters and a second decimal mark go nowhere; a paste keeps the figure's digits
  await visitors.fill('')
  await page.keyboard.type('12a3.4.5')
  await expect(visitors).toHaveValue('123.45')
  await visitors.evaluate((el: HTMLInputElement) => {
    el.select()
    el.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertFromPaste', data: '$9,876,543.21', bubbles: true, cancelable: true }))
  })
  await expect(visitors).toHaveValue('9,876,543.21')
  await expect(model(page, 'big')).toHaveText('number 9876543.21')
})

test('reads and writes the locale\'s own marks: de groups with a full stop and has a decimal comma', async ({ page }) => {
  const de = field(page, 'de')
  await expect(root(page, 'de').locator('[data-number-mark="lead"]')).toHaveText('€')
  await expect(de).toHaveValue('1.234,50')
  await de.fill('1234567,891')
  await expect(de).toHaveValue('1.234.567,89')
  await expect(model(page, 'de')).toHaveText('string 1234567.89')
  await de.fill('')
  await page.keyboard.type('12.5') // the full stop is de's separator, not its decimal mark
  await expect(de).toHaveValue('125')
  await de.blur()
  await expect(de).toHaveValue('125,00')
  await expect(model(page, 'de')).toHaveText('string 125.00')
})

test('decimal places: the minimum written on commit, no more than the maximum typed, rounded', async ({ page }) => {
  const rate = field(page, 'places')
  await expect(rate).toHaveValue('0.125')
  await rate.fill('7')
  await expect(model(page, 'places')).toHaveText('string 7')
  await rate.press('Enter')
  await expect(rate).toHaveValue('7.00')
  await expect(model(page, 'places')).toHaveText('string 7.00')
  await rate.fill('1.23456')
  await expect(rate).toHaveValue('1.234')
  // typed into a full fraction, a digit overwrites the next
  await caretAt(rate, 2)
  await page.keyboard.type('9')
  await expect(rate).toHaveValue('1.934')
  const whole = field(page, 'whole')
  await expect(whole).toHaveValue('1,200')
  await whole.fill('99.5')
  await expect(whole).toHaveValue('99')
  await expect(model(page, 'whole')).toHaveText('number 99')
  // typed into a full fraction, a digit equal to the one it overwrites still moves on (PR review: 05 gave .50)
  await field(page, 'plain').fill('10')
  await field(page, 'plain').press('Enter')
  await expect(field(page, 'plain')).toHaveValue('10.00')
  await caretAt(field(page, 'plain'), 3)
  await page.keyboard.type('05')
  await expect(field(page, 'plain')).toHaveValue('10.05')
  await expect(model(page, 'plain')).toHaveText('number 10.05')
  // a nudge is a commit too: money in cents
  await field(page, 'plain').fill('10.5')
  await field(page, 'plain').press('ArrowUp')
  await expect(field(page, 'plain')).toHaveValue('11.50')
})

test('prefix and suffix sit in the mark slots, clear of the value', async ({ page }) => {
  const rent = root(page, 'rent')
  await expect(rent.locator('[data-number-mark="lead"]')).toHaveText('~$')
  await expect(rent.locator('[data-number-mark="unit"]')).toHaveText('/mo')
  await expect(field(page, 'rent')).toHaveValue('1,200.00')
  const room = await field(page, 'rent').evaluate((el) => {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el), p = el.parentElement!
    const lead = p.querySelector('[data-number-mark="lead"]')!.getBoundingClientRect()
    const unit = p.querySelector('[data-number-mark="unit"]')!.getBoundingClientRect()
    return { start: r.left + parseFloat(s.paddingLeft) - lead.right, end: unit.left - (r.right - parseFloat(s.paddingRight)) }
  })
  expect(room.start).toBeGreaterThanOrEqual(0)
  expect(room.end).toBeGreaterThanOrEqual(0)
})

test('spin off: no chevrons, ArrowUp and ArrowDown do nothing, and it is a plain text box', async ({ page }) => {
  const invoice = field(page, 'nospin')
  await expect(root(page, 'nospin').getByRole('button')).toHaveCount(0)
  await invoice.press('ArrowUp')
  await invoice.press('ArrowDown')
  await expect(invoice).toHaveValue('5')
  expect(await invoice.getAttribute('role')).toBeNull()
  expect(await invoice.getAttribute('aria-valuenow')).toBeNull()
})

test('a spinbutton with its range and value, for assistive technology', async ({ page }) => {
  const money = field(page, 'money')
  await expect(money).toHaveAttribute('role', 'spinbutton')
  await expect(money).toHaveAttribute('aria-valuenow', '38500')
  await expect(money).toHaveAttribute('aria-valuetext', '$38,500.00')
  await expect(field(page, 'clamped')).toHaveAttribute('aria-valuemin', '0')
  await expect(field(page, 'clamped')).toHaveAttribute('aria-valuemax', '10')
  await expect(field(page, 'hours')).toHaveAttribute('aria-valuetext', '7.5 hrs')
  await expect(page.getByRole('spinbutton', { name: 'Revenue' })).toHaveValue('38,500.00')
  await expect(money).toHaveAttribute('inputmode', 'decimal')
})

test('highlight on focus selects the whole value, by click or by key', async ({ page }) => {
  const quantity = field(page, 'highlight')
  await quantity.click()
  expect(await caret(quantity)).toEqual([0, 2])
  await field(page, 'big').click()
  const [start, end] = await caret(field(page, 'big'))
  expect(start).toBe(end)
  await quantity.focus()
  expect(await caret(quantity)).toEqual([0, 2])
})

test('calc: an expression, its result shown underneath, put in on Enter, Tab or blur', async ({ page }) => {
  const calc = field(page, 'calc')
  const preview = root(page, 'calc').locator('[data-number-preview]')
  await expect(calc).toHaveValue('1,200.00')
  await expect(preview).toBeHidden()
  // selected on focus, and an operator over the selection is added at the end
  await calc.click()
  await page.keyboard.type('+50')
  await expect(calc).toHaveValue('1,200.00+50')
  await expect(preview).toHaveText('Result=$1,250.00')
  await expect(model(page, 'calc')).toHaveText('number 1200')
  // the preview takes no room: what is under the field doesn't move
  await calc.blur()
  await expect(model(page, 'calc')).toHaveText('number 1250')
  await expect(calc).toHaveValue('1,250.00')
  await expect(preview).toBeHidden()
  const below = () => model(page, 'calc').evaluate((el) => el.getBoundingClientRect().top)
  const before = await below()
  // precedence, live grouping, Enter
  await calc.fill('100+50*2000')
  await expect(calc).toHaveValue('100+50*2,000')
  await expect(preview).toHaveText('Result=$100,100.00')
  expect(await below()).toBe(before)
  await calc.press('Enter')
  await expect(calc).toHaveValue('100,100.00')
  await expect(model(page, 'calc')).toHaveText('number 100100')
  // rounded to the places, on Tab
  await calc.fill('10/3')
  await expect(preview).toHaveText('Result=$3.33')
  await calc.press('Tab')
  await expect(model(page, 'calc')).toHaveText('number 3.33')
  // a minus over everything starts a negative number
  await calc.click()
  await page.keyboard.type('-5*2')
  await expect(calc).toHaveValue('-5*2')
  await calc.press('Enter')
  await expect(calc).toHaveValue('-10.00')
  // incomplete, invalid, or divided by zero: no value
  for (const typed of ['678+', '5/0', '1.2.3']) {
    await calc.fill(typed)
    await expect(preview).toBeHidden()
    await calc.press('Enter')
    await expect(calc).toHaveValue('')
    await expect(model(page, 'calc')).toHaveText('object')
  }
  // a nudge works the expression out first
  await calc.fill('100+20')
  await calc.press('ArrowUp')
  await expect(calc).toHaveValue('121.00')
})

test('calc with no places is the whole-dollar 1040 rule; min clamps the result', async ({ page }) => {
  const line = field(page, 'calc1040')
  await line.fill('10.5*3')
  await expect(root(page, 'calc1040').locator('[data-number-preview]')).toHaveText('Result=$32')
  await line.press('Enter')
  await expect(line).toHaveValue('32')
  await expect(model(page, 'calc1040')).toHaveText('number 32')
  await line.fill('5-10')
  await line.press('Enter')
  await expect(line).toHaveValue('0')
})

test('calc in a grid: blur leaves the expression for the grid, which calls evaluate()', async ({ page }) => {
  const cell = field(page, 'cell')
  await expect(root(page, 'cell').getByRole('button')).toHaveCount(0)
  await cell.fill('100+25')
  await cell.blur()
  await expect(cell).toHaveValue('100+25')
  await expect(model(page, 'cell')).toHaveText('string 250.00')
  await page.getByRole('button', { name: 'Evaluate' }).click()
  await expect(model(page, 'cell')).toHaveText('string 125.00')
  await expect(cell).toHaveValue('125.00')
})

// The independent review's component findings: each test fails without its fix.
const valid = (l: Locator) => l.evaluate((el: HTMLInputElement) => el.validity.valid)

test('review 1 and 2: a key that adds nothing leaves the value and its selection; a digit before the minus keeps the sign', async ({ page }) => {
  const quantity = field(page, 'highlight')
  await quantity.click()
  await page.keyboard.type('a')
  await expect(quantity).toHaveValue('42')
  expect(await caret(quantity)).toEqual([0, 2])
  const visitors = field(page, 'big')
  await visitors.fill('-123')
  await caretAt(visitors, 0)
  await page.keyboard.type('4')
  await expect(visitors).toHaveValue('-4,123')
  await expect(model(page, 'big')).toHaveText('number -4123')
})

test('review 3: keys an IME is composing with neither commit nor nudge', async ({ page }) => {
  const rating = field(page, 'clamped')
  await rating.fill('12')
  await rating.evaluate((el) => {
    for (const key of ['Enter', 'Tab', 'ArrowUp']) el.dispatchEvent(new KeyboardEvent('keydown', { key, isComposing: true, bubbles: true, cancelable: true }))
  })
  await expect(rating).toHaveValue('12')
  await rating.press('Enter')
  await expect(rating).toHaveValue('10')
})

test('review 7: a chevron after typing nudges what is typed, as the arrow key does, and keeps the focus', async ({ page }) => {
  const rating = field(page, 'clamped')
  await rating.fill('12')
  await root(page, 'clamped').getByRole('button', { name: 'Subtract 1' }).click()
  await expect(rating).toHaveValue('10')
  await expect(rating).toBeFocused()
  await rating.fill('12')
  await rating.press('ArrowDown')
  await expect(rating).toHaveValue('10')
})

test('review 8: the range mark follows the model: a parent\'s reset clears it, a model saved out of range has it', async ({ page }) => {
  const rating = field(page, 'clamped')
  await rating.fill('12')
  expect(await valid(rating)).toBe(false)
  // the parent resets the model while the field still has the focus (a synthetic click doesn't move it)
  await page.getByRole('button', { name: 'Reset rating' }).dispatchEvent('click')
  await expect(model(page, 'clamped')).toHaveText('number 5')
  await expect(rating).toHaveValue('5')
  await expect(rating).toBeFocused()
  expect(await valid(rating)).toBe(true)
  const over = field(page, 'over')
  await expect(over).toHaveValue('15')
  expect(await valid(over)).toBe(false)
  await over.fill('7')
  await over.blur()
  expect(await valid(over)).toBe(true)
})

// PR review (CodeRabbit and Baz) on PR 27: each test fails without its fix.
test('PR review: a parent\'s 3 and then 2 again, after the field\'s own 2, both show', async ({ page }) => {
  const rating = field(page, 'clamped')
  await rating.fill('2')
  await expect(model(page, 'clamped')).toHaveText('number 2')
  await page.getByRole('button', { name: 'Reset rating' }).dispatchEvent('click')
  await expect(rating).toHaveValue('5')
  await page.getByRole('button', { name: 'Rating 2', exact: true }).dispatchEvent('click')
  await expect(model(page, 'clamped')).toHaveText('number 2')
  await expect(rating).toHaveValue('2')
})

test('PR review: a locale change mid-edit rewrites the text in the new marks, so the commit reads it right', async ({ page }) => {
  const amount = field(page, 'relocale')
  await amount.click()
  await expect(amount).toHaveValue('1,234.50')
  await page.getByRole('button', { name: 'Switch to de' }).dispatchEvent('click')
  await expect(amount).toHaveValue('1.234,50')
  await amount.press('Enter')
  await expect(amount).toHaveValue('1.234,50')
  await expect(model(page, 'relocale')).toHaveText('number 1234.5')
})

test('PR review: the range mark follows the bounds as well as the value', async ({ page }) => {
  const over = field(page, 'over')
  expect(await valid(over)).toBe(false)
  await page.getByRole('button', { name: 'Raise the cap' }).dispatchEvent('click')
  await expect.poll(() => valid(over)).toBe(true)
})

test('PR review: a bound the places can\'t write is shown as it is handed back, by a commit or a nudge', async ({ page }) => {
  const dose = field(page, 'dose')
  await dose.fill('1')
  await dose.press('Enter')
  await expect(dose).toHaveValue('0.006')
  await expect(model(page, 'dose')).toHaveText('number 0.006')
  await dose.press('ArrowUp')
  await expect(dose).toHaveValue('0.006')
})

test('PR review: at rest the range mark reads the model, not its rounded text', async ({ page }) => {
  // 0.005 is within 0.004 to 0.006 though it shows 0.01; 10.004 is past 10 though it shows 10.00
  await expect(field(page, 'dose')).toHaveValue('0.01')
  expect(await valid(field(page, 'dose'))).toBe(true)
  await expect(field(page, 'edge')).toHaveValue('10.00')
  expect(await valid(field(page, 'edge'))).toBe(false)
  // mid-edit it reads what is typed
  await field(page, 'edge').fill('9')
  expect(await valid(field(page, 'edge'))).toBe(true)
})

test('PR review: a grouped string model saved out of range is marked invalid, and valid once back in range', async ({ page }) => {
  const quota = field(page, 'grouped')
  await expect(quota).toHaveValue('1,500')
  expect(await valid(quota)).toBe(false)
  await quota.fill('900')
  expect(await valid(quota)).toBe(true)
})

test('PR review: a freeform nudge is written in the field\'s locale, so the next one reads the same value', async ({ page }) => {
  const menge = field(page, 'defree')
  await menge.press('ArrowUp')
  await expect(menge).toHaveValue('1,234')
  await menge.press('ArrowUp')
  await expect(menge).toHaveValue('1,235')
  await expect(model(page, 'deFree')).toHaveText('string 1,235')
})

/** Put the page on one scheme and theme with a single reload: the scheme cookie and the stored theme first. */
async function onScheme(page: Page, scheme: string, mode: 'light' | 'dark') {
  await page.context().addCookies([{ name: 'zooui-scheme', value: scheme, url: page.url() }])
  await page.addInitScript((m) => localStorage.setItem('zooui-color-mode', m), mode)
  await page.reload()
  await page.waitForLoadState('networkidle')
  await hydrated(page)
  if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
  else await expect(page.locator('html')).not.toHaveClass(/dark/)
}

const SCHEMES = ['teal', 'slate-cobalt', 'graphite-violet', 'paper-olive', 'ink-indigo', 'ember']
for (const mode of ['light', 'dark'] as const) {
  test.describe(`ZNumberInput on every Forest scheme (${mode}): Nuxt UI's tokens, no conflicting utilities, and it moves`, () => {
    for (const scheme of SCHEMES) {
      test(scheme, async ({ page }) => {
        await onScheme(page, scheme, mode)
        const [dimmed, highlighted, hover] = await Promise.all(['--ui-text-dimmed', '--ui-text-highlighted', '--ui-text'].map((t) => resolve(page, `var(${t})`)))
        const money = root(page, 'money')
        expect(await color(money.locator('[data-number-mark="lead"]'))).toBe(dimmed)
        expect(await color(root(page, 'percent').locator('[data-number-mark="unit"]'))).toBe(dimmed)
        const up = money.getByRole('button', { name: 'Add $5,000' })
        expect(await color(up)).toBe(dimmed)
        await up.hover()
        await expect.poll(() => color(up)).toBe(hover)
        expect(await color(field(page, 'money'))).toBe(highlighted)
        await up.click()
        await expect(field(page, 'money')).toHaveValue('43,500.00')
        // the new marks and the calc preview, in Nuxt UI's tokens too
        expect(await color(root(page, 'rent').locator('[data-number-mark="lead"]'))).toBe(dimmed)
        expect(await color(root(page, 'rent').locator('[data-number-mark="unit"]'))).toBe(dimmed)
        expect(await color(root(page, 'de').locator('[data-number-mark="lead"]'))).toBe(dimmed)
        await field(page, 'calc').click()
        await page.keyboard.type('+50')
        const preview = root(page, 'calc').locator('[data-number-preview]')
        await expect(preview).toBeVisible()
        expect(await color(preview)).toBe(await resolve(page, 'var(--ui-text-inverted)'))
        expect(await preview.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(await resolve(page, 'var(--ui-bg-inverted)'))
        expect(await page.evaluate(findConflicts)).toEqual([])
      })
    }
  })
}
