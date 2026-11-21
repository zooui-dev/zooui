import { expect, test, type Page } from '@playwright/test'

// ZSearchInput on the Forest theme (pages/search-input.vue): it paints as a plain UInput does on Forest schemes in
// light and dark (the ground, the ring and the text), its icons in the field's dimmed ink; and a smoke test of the
// pause and the clear on Playwright's clock. The behaviors one by one are in apps/base/tests/search-input.spec.ts.

const NOW = new Date('2026-11-13T17:00:00Z')
const hydrated = (page: Page) => page.waitForFunction(() => !!(document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__)

async function open(page: Page, mode: 'light' | 'dark' = 'light', scheme = 'teal') {
  await page.context().addCookies([{ name: 'zooui-scheme', value: scheme, url: 'http://localhost' }])
  await page.addInitScript((m) => localStorage.setItem('zooui-color-mode', m), mode)
  await page.clock.install({ time: NOW })
  await page.goto('/search-input')
  await page.waitForLoadState('networkidle')
  await hydrated(page)
  if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
  else await expect(page.locator('html')).not.toHaveClass(/dark/)
}

const section = (page: Page, name: string) => page.locator(`[data-section="${name}"]`)

/** The search field beside the plain UInput at the bottom of the page, and its two icons, as canvas pixels. */
const paint = (page: Page) => page.evaluate(() => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  const rgb = (c: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).join() }
  const look = (el: Element) => {
    const s = getComputedStyle(el)
    return { ground: rgb(s.backgroundColor), ring: rgb(s.getPropertyValue('--tw-ring-color')), ink: rgb(s.color) }
  }
  const input = document.querySelector('[data-section="parent"] input[data-search-input]')!
  const root = input.parentElement!
  return {
    search: look(input),
    plain: look(document.querySelector('input[placeholder="Somewhere else"]')!),
    icon: rgb(getComputedStyle(root.querySelector('[data-slot="leadingIcon"]')!).color),
    clear: rgb(getComputedStyle(root.querySelector('[data-search-clear]')!).color),
    dimmed: (() => { const p = document.createElement('div'); p.style.color = 'var(--ui-text-dimmed)'; document.body.append(p); const c = rgb(getComputedStyle(p).color); p.remove(); return c })(),
  }
})

for (const mode of ['light', 'dark'] as const) {
  for (const scheme of ['teal', 'ink-indigo']) {
    test(`paints as a plain UInput, icons dimmed: ${scheme}, ${mode}`, async ({ page }) => {
      await open(page, mode, scheme)
      const p = await paint(page)
      expect(p.search).toEqual(p.plain)
      expect(p.icon).toBe(p.dimmed)
      expect(p.clear).toBe(p.dimmed)
    })
  }
}

test('hands back the search after the pause, and the clear button empties it at once', async ({ page }) => {
  await open(page)
  await page.clock.pauseAt(new Date(NOW.getTime() + 60_000))
  const field = section(page, 'basic').getByRole('searchbox', { name: 'Projects', exact: true })
  await field.pressSequentially('des')
  await page.clock.runFor(299)
  await expect(page.getByTestId('basic-model')).toHaveText('null')
  await page.clock.runFor(1)
  await expect(page.getByTestId('basic-model')).toHaveText('"des"')
  await expect(page.getByTestId('basic-filters')).toHaveText('"des"')
  await section(page, 'basic').getByRole('button', { name: 'Clear' }).click()
  await expect(field).toHaveValue('')
  await expect(page.getByTestId('basic-model')).toHaveText('""')
  await expect(field).toBeFocused()
})
