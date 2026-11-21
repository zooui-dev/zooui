import { expect, test, type Page } from '@playwright/test'

// ZUrlInput (pages/url-input.vue) on Forest, in both color modes: a commit normalizes the address, and an address that
// fails marks the input in the theme's error color — its ring, and the UFormField's message in the error ink — with
// aria-invalid. Its behavior is driven in full in apps/base/tests/url-input.spec.ts.

const hydrated = (page: Page) => page.waitForFunction(() => !!(document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__)

async function open(page: Page, mode: 'light' | 'dark') {
  await page.addInitScript((m) => localStorage.setItem('zooui-color-mode', m), mode)
  await page.goto('/url-input')
  await page.waitForLoadState('networkidle')
  await hydrated(page)
  if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
  else await expect(page.locator('html')).not.toHaveClass(/dark/)
}

/** A color as the browser serializes it, read through a probe so it compares with computed styles. */
const resolved = (page: Page, css: string, property: 'color' | 'boxShadow') => page.evaluate(([value, prop]) => {
  const probe = document.createElement('div')
  if (prop === 'color') probe.style.color = value!
  else probe.style.boxShadow = `inset 0 0 0 2px ${value}`
  document.body.append(probe)
  const out = getComputedStyle(probe)[prop as 'color' | 'boxShadow']
  probe.remove()
  return prop === 'color' ? out : out.slice(0, out.indexOf(')') + 1)
}, [css, property])

for (const mode of ['light', 'dark'] as const) {
  test(`${mode}: a commit normalizes; a failed one is the error color, with the field's message in the error ink`, async ({ page }) => {
    await open(page, mode)
    const site = page.getByRole('textbox', { name: 'Website', exact: true })
    await site.fill('example.com')
    await site.press('Tab')
    await expect(site).toHaveValue('https://example.com')
    await expect(site).toHaveAttribute('aria-invalid', 'false')

    await site.fill('not a site')
    await site.press('Tab')
    await expect(site).toHaveAttribute('aria-invalid', 'true')
    const ring = await site.evaluate((el) => getComputedStyle(el).boxShadow)
    expect(ring).toContain(await resolved(page, 'var(--ui-error)', 'boxShadow'))

    const message = page.locator('[data-section="field"]').locator('[data-slot="error"]')
    await expect(message).toHaveText('Invalid website address')
    await expect(message).toBeVisible()
    expect(await message.evaluate((el) => getComputedStyle(el).color)).toBe(await resolved(page, 'var(--ui-error)', 'color'))
  })
}
