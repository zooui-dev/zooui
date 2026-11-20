import { expect, test, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// ZMaskedInput on Forest (pages/masked-input.vue): it paints exactly as a plain UInput does on Forest's schemes in light
// and dark (it changes typing, not looks), a UFormField's error takes the error ink, and the presets work on the
// theme: the phone formatted on blur, the tax ID's SSN and EIN as typed. Its behavior one case at a time is
// apps/base/tests/masked-input.spec.ts; the mask rules are scripts/masked-input.test.mjs.

const hydrated = (page: Page) => page.waitForFunction(() => !!(document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__)

async function open(page: Page, mode: 'light' | 'dark', scheme: string) {
  await page.context().addCookies([{ name: 'zooui-scheme', value: scheme, url: 'http://localhost' }])
  await page.addInitScript((m) => localStorage.setItem('zooui-color-mode', m), mode)
  await page.goto('/masked-input')
  await page.waitForLoadState('networkidle')
  await hydrated(page)
  if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
  else await expect(page.locator('html')).not.toHaveClass(/dark/)
}

const section = (page: Page, name: string) => page.locator(`[data-section="${name}"]`)
const input = (page: Page, name: string) => section(page, name).locator('input[data-masked-input]')

/** An input's paint, as canvas pixels: ground, text, ring and border. */
const paint = (page: Page, selector: string) => page.locator(selector).evaluate((el) => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  const rgb = (c: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 4).join() }
  const s = getComputedStyle(el)
  return { ground: rgb(s.backgroundColor), text: rgb(s.color), ring: rgb(s.getPropertyValue('--tw-ring-color')), font: s.fontFamily, size: s.fontSize, height: s.height, radius: s.borderRadius }
})
const ink = (page: Page, token: string) => page.evaluate((t) => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  const probe = document.createElement('div'); probe.style.color = `var(${t})`; document.body.append(probe)
  ctx.fillStyle = getComputedStyle(probe).color; probe.remove(); ctx.fillRect(0, 0, 1, 1)
  return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 4).join()
}, token)

for (const mode of ['light', 'dark'] as const) {
  for (const scheme of ['teal', 'ink-indigo']) {
    test(`ZMaskedInput (${mode}, ${scheme}): paints as a plain UInput; an error takes the error ink`, async ({ page }) => {
      await open(page, mode, scheme)
      expect(await paint(page, '[data-section="paint"] input[data-side="wrapped"]')).toEqual(await paint(page, '[data-section="paint"] input[data-side="native"]'))
      const errored = await paint(page, '[data-section="errored"] input')
      expect(errored.ring).toBe(await ink(page, '--ui-error'))
      expect(await page.evaluate(findConflicts)).toEqual([])
    })
  }
}

test('ZMaskedInput on Forest: the phone formatted on blur, the tax ID as typed', async ({ page }) => {
  await open(page, 'light', 'teal')
  const phone = input(page, 'phone')
  await phone.pressSequentially('5551234567')
  await phone.press('Tab')
  await expect(phone).toHaveValue('(555) 123-4567')
  const tax = input(page, 'tax-id')
  await tax.pressSequentially('12-3456789')
  await expect(tax).toHaveValue('12-3456789')
  await expect(section(page, 'tax-id').locator('[data-lookup]')).toBeEnabled()
})
