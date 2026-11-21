import { expect, test, type Locator, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// ZMaskedInput (pages/masked-input.vue) on the theme-free base, in a real browser: the phone preset formatting on
// blur (and leaving a number from elsewhere as typed) and as typed; the caret kept on its character through typing,
// Backspace and Delete across a separator, and a paste; the tax-ID preset's SSN and EIN, `isValid` and `v-model:raw`;
// a mask list chosen by the first fit and raw set from the parent; an upper-casing token; a UForm whose rule reads the
// value the commit wrote; UFormField's error on the input; and a disabled field. The mask rules themselves are
// scripts/masked-input.test.mjs.

const hydrated = (page: Page) => page.waitForFunction(() => !!(document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__)

test.beforeEach(async ({ page }) => {
  await page.goto('/masked-input')
  await page.waitForLoadState('networkidle')
  await hydrated(page)
})

const section = (page: Page, name: string) => page.locator(`[data-section="${name}"]`)
const input = (page: Page, name: string) => section(page, name).locator('input[data-masked-input]')
const out = (page: Page, name: string, hook = 'data-value') => section(page, name).locator(`[${hook}]`)
const caret = (l: Locator) => l.evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])
const setCaret = (l: Locator, at: number) => l.evaluate((el: HTMLInputElement, n) => el.setSelectionRange(n, n), at)
async function clear(l: Locator) {
  await l.press('ControlOrMeta+a')
  await l.press('Backspace')
}

test('phone on blur: typed as it is, formatted when the field is left; a number from elsewhere stays as typed', async ({ page }) => {
  const phone = input(page, 'phone')
  await expect(phone).toHaveAttribute('type', 'tel')
  await expect(phone).toHaveAttribute('inputmode', 'tel')
  await phone.pressSequentially('5551234567')
  await expect(phone).toHaveValue('5551234567')
  await expect(out(page, 'phone')).toHaveText('"5551234567"')
  await phone.press('Tab')
  await expect(phone).toHaveValue('(555) 123-4567')
  await expect(out(page, 'phone')).toHaveText('"(555) 123-4567"')

  await clear(phone)
  await expect(out(page, 'phone')).toHaveText('null')
  await phone.pressSequentially('+44 20 7946 0958')
  await phone.press('Tab')
  await expect(phone).toHaveValue('+44 20 7946 0958')
  await expect(out(page, 'phone')).toHaveText('"+44 20 7946 0958"')
})

test('phone as typed: the mask is written keystroke by keystroke, and a letter is refused', async ({ page }) => {
  const phone = input(page, 'phone-live')
  await phone.pressSequentially('555')
  await expect(phone).toHaveValue('(555')
  await phone.pressSequentially('1')
  await expect(phone).toHaveValue('(555) 1')
  await phone.pressSequentially('234567')
  await expect(phone).toHaveValue('(555) 123-4567')
  await expect(out(page, 'phone-live')).toHaveText('"(555) 123-4567"')
  expect(await caret(phone)).toEqual([14, 14])
  await setCaret(phone, 7)
  await phone.press('x')
  await expect(phone).toHaveValue('(555) 123-4567')
  expect(await caret(phone)).toEqual([7, 7])
})

test('the caret stays on its character: typing, Backspace and Delete across a separator', async ({ page }) => {
  const phone = input(page, 'phone-live')
  await phone.pressSequentially('555123456')
  await expect(phone).toHaveValue('(555) 123-456')
  // typing before the ") ": the digit goes in, the rest moves up, the caret after it
  await setCaret(phone, 4)
  await phone.press('9')
  await expect(phone).toHaveValue('(555) 912-3456')
  expect(await caret(phone)).toEqual([7, 7])
  // Backspace just after ") " takes the 5 before it
  await setCaret(phone, 6)
  await phone.press('Backspace')
  await expect(phone).toHaveValue('(559) 123-456')
  expect(await caret(phone)).toEqual([3, 3])
  // Delete just before ") " takes the digit after it, and the caret stays
  await setCaret(phone, 4)
  await phone.press('Delete')
  await expect(phone).toHaveValue('(559) 234-56')
  expect(await caret(phone)).toEqual([4, 4])
})

test('a paste keeps its digits and lands with the caret after it', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const tax = input(page, 'tax-id')
  await tax.pressSequentially('1236789')
  await expect(tax).toHaveValue('123-67-89')
  await page.evaluate(() => navigator.clipboard.writeText('4 5'))
  await setCaret(tax, 4)
  await tax.press('ControlOrMeta+v')
  await expect(tax).toHaveValue('123-45-6789')
  expect(await caret(tax)).toEqual([6, 6])
})

test('tax ID: an SSN by default, the EIN when a dash is typed after two digits; isValid and raw follow', async ({ page }) => {
  const tax = input(page, 'tax-id')
  await expect(tax).toHaveAttribute('placeholder', 'SSN or EIN')
  await expect(tax).toHaveAttribute('inputmode', 'numeric')
  const lookup = section(page, 'tax-id').locator('[data-lookup]')
  await expect(lookup).toBeDisabled()

  await tax.pressSequentially('12345678')
  await expect(tax).toHaveValue('123-45-678')
  await expect(out(page, 'tax-id', 'data-complete-readout')).toHaveText('false')
  await expect(tax).not.toHaveAttribute('data-complete')
  await tax.pressSequentially('9')
  await expect(tax).toHaveValue('123-45-6789')
  await expect(out(page, 'tax-id')).toHaveText('"123-45-6789"')
  await expect(out(page, 'tax-id', 'data-raw')).toHaveText('"123456789"')
  await expect(out(page, 'tax-id', 'data-complete-readout')).toHaveText('true')
  await expect(tax).toHaveAttribute('data-complete', '')
  await expect(lookup).toBeEnabled()
  await lookup.click()
  await expect(out(page, 'tax-id', 'data-found')).toHaveText('123-45-6789')

  await clear(tax)
  await expect(out(page, 'tax-id')).toHaveText('null')
  await expect(out(page, 'tax-id', 'data-raw')).toHaveText('null')
  await tax.pressSequentially('12-')
  await expect(tax).toHaveValue('12-')
  await tax.pressSequentially('3456789')
  await expect(tax).toHaveValue('12-3456789')
  await expect(out(page, 'tax-id', 'data-raw')).toHaveText('"123456789"')
  await expect(lookup).toBeEnabled()
  // the EIN holds while the digits go, until the field is empty
  for (let i = 0; i < 7; i++) await tax.press('Backspace')
  await expect(tax).toHaveValue('12-')
  await tax.press('Backspace')
  await expect(tax).toHaveValue('12')
  await tax.pressSequentially('3')
  await expect(tax).toHaveValue('123')
  // a dash anywhere else adds nothing
  await tax.press('-')
  await expect(tax).toHaveValue('123')
  await expect(lookup).toBeDisabled()
})

test('a full field refuses another character rather than pushing one out', async ({ page }) => {
  const phone = input(page, 'phone-live')
  await phone.pressSequentially('5551234567')
  await setCaret(phone, 4)
  await phone.press('9')
  await expect(phone).toHaveValue('(555) 123-4567')
  expect(await caret(phone)).toEqual([4, 4])
})

test('a mask list: the first that fits, and raw set from the parent', async ({ page }) => {
  const zip = input(page, 'zip')
  await zip.pressSequentially('12345')
  await expect(zip).toHaveValue('12345')
  await zip.pressSequentially('6')
  await expect(zip).toHaveValue('12345-6')
  await expect(out(page, 'zip', 'data-raw')).toHaveText('"123456"')
  await section(page, 'zip').locator('[data-set-raw]').click()
  await expect(zip).toHaveValue('94105-1234')
  await expect(out(page, 'zip')).toHaveText('"94105-1234"')
  await section(page, 'zip').locator('[data-clear]').click()
  await expect(zip).toHaveValue('')
  await expect(out(page, 'zip', 'data-raw')).toHaveText('null')
})

test('an inline mask list and tokens: editing mid-field keeps the caret as the parent re-renders', async ({ page }) => {
  const zip = input(page, 'zip')
  await zip.pressSequentially('1234567')
  await expect(zip).toHaveValue('12345-67')
  await setCaret(zip, 2)
  await zip.press('9')
  await expect(zip).toHaveValue('12934-567')
  await expect(out(page, 'zip')).toHaveText('"12934-567"')
  expect(await caret(zip)).toEqual([3, 3])
  const code = input(page, 'code')
  await code.pressSequentially('ab12')
  await setCaret(code, 3)
  await code.press('9')
  await expect(code).toHaveValue('AB-912')
  expect(await caret(code)).toEqual([4, 4])
})

test('letters and digits: an upper-casing token, a literal written for you, a digit refused where a letter goes', async ({ page }) => {
  const code = input(page, 'code')
  await expect(code).not.toHaveAttribute('inputmode', 'numeric')
  await code.pressSequentially('1ab1234')
  await expect(code).toHaveValue('AB-1234')
  await expect(out(page, 'code')).toHaveText('"AB-1234"')
})

test('in a UForm: the rule reads the value the commit wrote, and an incomplete one is marked', async ({ page }) => {
  const phone = input(page, 'form')
  await phone.pressSequentially('5551234567')
  await phone.press('Tab')
  await expect(phone).toHaveValue('(555) 123-4567')
  // on change and on blur alike, the rule never saw the digits as typed
  await expect(out(page, 'form', 'data-seen')).toContainText('"(555) 123-4567"')
  await expect(out(page, 'form', 'data-seen')).not.toContainText('"5551234567"')
  await expect(phone).not.toHaveAttribute('aria-invalid', 'true')
  await expect(section(page, 'form').getByText('Enter a phone number like')).toHaveCount(0)

  await clear(phone)
  await phone.pressSequentially('555')
  await phone.press('Tab')
  await expect(section(page, 'form').getByText('Enter a phone number like (555) 123-4567')).toBeVisible()
  await expect(phone).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByRole('textbox', { name: 'Contact phone' })).toHaveCount(1)
})

test('in a UFormField: its error marks the input and describes it; disabled refuses focus', async ({ page }) => {
  const fax = input(page, 'errored')
  await expect(fax).toHaveValue('(555')
  await expect(fax).toHaveAttribute('aria-invalid', 'true')
  const described = await fax.getAttribute('aria-describedby')
  expect(described).toBeTruthy()
  await expect(page.locator(`[id="${described!.split(' ').find((id) => id.endsWith('error'))}"]`)).toHaveText('Enter a whole number')
  await expect(page.getByRole('textbox', { name: 'Fax' })).toHaveCount(1)
  const off = input(page, 'disabled')
  await expect(off).toBeDisabled()
  await expect(off).toHaveValue('(555) 123-4567')
  expect(await page.evaluate(findConflicts)).toEqual([])
})
