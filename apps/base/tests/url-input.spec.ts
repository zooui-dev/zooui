import { expect, test, type Locator, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// ZUrlInput (pages/url-input.vue) on the theme-free base: typing writes the text as it is; blur and Enter commit it,
// trimmed with https:// in front, or keep it and mark the field invalid (aria-invalid, Nuxt UI's error color, the
// message describing the input) until the next commit or a value from the parent; blank is null; add-www; outside a
// UFormField the message comes through v-model:error; a UForm's rule and submit see the committed address.

const hydrated = (page: Page) => page.waitForFunction(() => !!(document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__)

test.beforeEach(async ({ page }) => {
  await page.goto('/url-input')
  await page.waitForLoadState('networkidle')
  await hydrated(page)
})

const section = (page: Page, name: string) => page.locator(`[data-section="${name}"]`)
const input = (page: Page, name: string) => section(page, name).getByRole('textbox').first()
const text = (page: Page, id: string) => page.getByTestId(id)

async function type(field: Locator, value: string) {
  await field.click()
  await field.press('ControlOrMeta+a')
  await field.press('Backspace')
  await field.pressSequentially(value)
}

/** The text of every element the input's aria-describedby names, in order. */
const description = (field: Locator) => field.evaluate((el) =>
  (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)?.textContent?.trim() ?? `#${id} missing`))

test('a text input with the url keyboard, named by its field, with the placeholder, not marked invalid', async ({ page }) => {
  const site = page.getByRole('textbox', { name: 'Website', exact: true })
  await expect(site).toHaveAttribute('type', 'text')
  await expect(site).toHaveAttribute('inputmode', 'url')
  await expect(site).toHaveAttribute('autocomplete', 'url')
  await expect(site).toHaveAttribute('placeholder', 'https://example.com')
  await expect(site).toHaveAttribute('aria-invalid', 'false')
  await expect(site).toHaveValue('')
  expect(await page.evaluate(findConflicts)).toEqual([])
})

test('typing writes each keystroke as it is; Tab commits it, trimmed with https:// in front', async ({ page }) => {
  const site = input(page, 'field')
  await type(site, ' example.com/about ')
  await expect(text(page, 'field-model')).toHaveText('" example.com/about "')
  await expect(site).toHaveValue(' example.com/about ')
  await site.press('Tab')
  await expect(site).toHaveValue('https://example.com/about')
  await expect(text(page, 'field-model')).toHaveText('"https://example.com/about"')
  const updates = await text(page, 'field-updates').locator('li').allTextContents()
  expect(updates.at(-1)).toBe('"https://example.com/about"')
  expect(updates.at(-2)).toBe('" example.com/about "')
  expect(updates.slice(0, -1).every((u) => !u.includes('https'))).toBe(true)
  await expect(text(page, 'field-error')).toHaveText('null')
})

test('http:// becomes https://, in any case, and the rest is kept as typed', async ({ page }) => {
  const site = input(page, 'field')
  await type(site, 'HTTP://Example.com/Shop')
  await site.press('Tab')
  await expect(site).toHaveValue('https://Example.com/Shop')
})

test('text that is no address is kept, trimmed, and marks the field until the next commit', async ({ page }) => {
  const site = input(page, 'field')
  await type(site, '  not a site ')
  await site.press('Tab')
  await expect(text(page, 'field-model')).toHaveText('"not a site"')
  await expect(site).toHaveValue('not a site')
  await expect(text(page, 'field-error')).toHaveText('"Invalid website address"')
  await expect(site).toHaveAttribute('aria-invalid', 'true')
  await expect(section(page, 'field').locator('[data-slot="error"]')).toHaveText('Invalid website address')
  expect(await description(site)).toContain('Invalid website address')

  // Typing doesn't clear it; the next commit does.
  await type(site, 'example.com')
  await expect(site).toHaveAttribute('aria-invalid', 'true')
  await site.press('Enter')
  await expect(site).toHaveValue('https://example.com')
  await expect(site).toHaveAttribute('aria-invalid', 'false')
  await expect(text(page, 'field-error')).toHaveText('null')
  expect(await description(site)).not.toContain('Invalid website address')
})

test('a host with no top-level domain is refused: localhost, example, an IP address', async ({ page }) => {
  const site = input(page, 'field')
  for (const t of ['localhost', 'example', '192.168.1.10', 'sam@example.com']) {
    await type(site, t)
    await site.press('Tab')
    await expect(text(page, 'field-model')).toHaveText(JSON.stringify(t))
    await expect(site).toHaveAttribute('aria-invalid', 'true')
  }
})

test('blank text commits as null and clears the error', async ({ page }) => {
  const site = input(page, 'field')
  await type(site, 'nope')
  await site.press('Tab')
  await expect(site).toHaveAttribute('aria-invalid', 'true')
  await type(site, '   ')
  await site.press('Tab')
  await expect(text(page, 'field-model')).toHaveText('null')
  await expect(site).toHaveValue('')
  await expect(site).toHaveAttribute('aria-invalid', 'false')
  await expect(text(page, 'field-error')).toHaveText('null')
})

test('add-www puts www. in front of a two-label host only; without it, none is added', async ({ page }) => {
  const www = input(page, 'www')
  await type(www, 'example.com')
  await www.press('Tab')
  await expect(text(page, 'www-model')).toHaveText('"https://www.example.com"')
  await type(www, 'shop.example.com')
  await www.press('Tab')
  await expect(text(page, 'www-model')).toHaveText('"https://shop.example.com"')

  const site = input(page, 'field')
  await type(site, 'example.app')
  await site.press('Tab')
  await expect(text(page, 'field-model')).toHaveText('"https://example.app"')
})

test('outside a UFormField: aria-invalid, the error color, the custom message through v-model:error and aria-describedby', async ({ page }) => {
  const plain = page.getByRole('textbox', { name: 'Team website' })
  await type(plain, 'localhost')
  await plain.press('Tab')
  await expect(plain).toHaveAttribute('aria-invalid', 'true')
  await expect(text(page, 'plain-message')).toHaveText('Enter a website like example.com')
  expect(await description(plain)).toEqual(['Enter a website like example.com'])
  const ring = await plain.evaluate((el) => getComputedStyle(el).boxShadow)
  const errorRing = await page.evaluate(() => {
    const probe = document.createElement('div')
    probe.style.boxShadow = 'inset 0 0 0 2px var(--ui-error)'
    document.body.append(probe)
    const shadow = getComputedStyle(probe).boxShadow
    probe.remove()
    return shadow.slice(0, shadow.indexOf(')') + 1)
  })
  expect(ring).toContain(errorRing)

  await type(plain, 'example.com')
  await plain.press('Tab')
  await expect(plain).not.toHaveAttribute('aria-invalid', 'true')
  await expect(text(page, 'plain-message')).toHaveCount(0)
  expect(await plain.getAttribute('aria-describedby')).toBeFalsy()
})

test('in a UFormField with the error unbound, the input is still marked and described, with no visible message', async ({ page }) => {
  const field = page.getByRole('textbox', { name: 'Store website' })
  await type(field, 'example')
  await field.press('Tab')
  await expect(text(page, 'unbound-model')).toHaveText('"example"')
  await expect(field).toHaveAttribute('aria-invalid', 'true')
  expect(await description(field)).toEqual(['Invalid website address'])
  // The field shows no error of its own; the message is the visually hidden one.
  await expect(section(page, 'unbound').locator('[data-slot="error"]')).toHaveCount(0)
  await expect(section(page, 'unbound').getByText('Invalid website address', { exact: true })).toHaveClass(/sr-only/)
  expect(await page.evaluate(findConflicts)).toEqual([])
})

test('in a UForm: the rule checks the committed address on blur, and Enter submits it normalized', async ({ page }) => {
  const shop = page.getByRole('textbox', { name: 'Shop website' })
  // "example.com" fails isWebAddress as typed, so no error here means the rule saw it committed.
  await type(shop, 'example.com')
  await shop.press('Tab')
  await expect(shop).toHaveValue('https://example.com')
  await expect(section(page, 'form').getByText('Enter an address like example.com')).toHaveCount(0)

  await type(shop, 'localhost')
  await shop.press('Tab')
  await expect(section(page, 'form').getByText('Enter an address like example.com')).toBeVisible()
  await expect(shop).toHaveAttribute('aria-invalid', 'true')

  // Submitting text that failed the check reaches the form's rules: no browser check stops it first.
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(section(page, 'form').getByText('Enter an address like example.com')).toBeVisible()
  await expect(text(page, 'form-saved')).toHaveText('undefined')
  expect(await shop.evaluate((el) => (el as HTMLInputElement).validity.valid)).toBe(true)

  await type(shop, 'example.org/shop')
  await shop.press('Enter')
  await expect(text(page, 'form-saved')).toHaveText('"https://example.org/shop"')
  await expect(shop).toHaveValue('https://example.org/shop')
})

test('a value from the parent clears the error; one the field wrote does not', async ({ page }) => {
  const field = input(page, 'loaded')
  await expect(field).toHaveValue('https://example.org')
  await type(field, 'nope')
  await field.press('Tab')
  await expect(text(page, 'loaded-error')).toHaveText('"Invalid website address"')
  await page.locator('[data-action="load"]').click()
  await expect(field).toHaveValue('https://example.net')
  await expect(text(page, 'loaded-error')).toHaveText('null')
  await expect(field).toHaveAttribute('aria-invalid', 'false')

  await type(field, 'nope')
  await field.press('Tab')
  await expect(field).toHaveAttribute('aria-invalid', 'true')
  await page.locator('[data-action="clear"]').click()
  await expect(text(page, 'loaded-model')).toHaveText('null')
  await expect(field).toHaveValue('')
  await expect(text(page, 'loaded-error')).toHaveText('null')
})

test("UInput's props pass through: size from the form field, disabled", async ({ page }) => {
  const large = page.getByRole('textbox', { name: 'Large' })
  const md = input(page, 'field')
  const height = (l: Locator) => l.evaluate((el) => el.getBoundingClientRect().height)
  expect(await height(large)).toBeGreaterThan(await height(md))
  await expect(page.getByRole('textbox', { name: 'Locked' })).toBeDisabled()
})
