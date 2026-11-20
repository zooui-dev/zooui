import { expect, test, type Page } from '@playwright/test'

// ZSelectMenu on the Forest theme (pages/select-menu.vue): a data-entry row filled from the keyboard alone — open on
// focus, typed to filter, Tab to take it and move on — and a ZSelectMenu painting exactly as a plain USelectMenu does
// on every Forest scheme in light and dark (it adds behavior, never a look). The behaviors one by one, with
// `multiple`, grouped items and each switch off, are in apps/base/tests/select-menu.spec.ts.

const hydrated = (page: Page) => page.waitForFunction(() => !!(document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__)
const listbox = (page: Page) => page.locator('[role="listbox"][data-state="open"]')

test('a data-entry row, from the keyboard alone', async ({ page }) => {
  await page.goto('/select-menu')
  await page.waitForLoadState('networkidle')
  await hydrated(page)
  const form = page.locator('[data-form]')

  await page.locator('[data-payee]').fill('Acme')
  await page.keyboard.press('Tab')
  // The state menu opened on focus, its search input focused: type to filter, Tab takes the match.
  await expect(page.locator('[data-state-menu]')).toHaveAttribute('aria-expanded', 'true')
  await expect(listbox(page).locator('input')).toBeFocused()
  await page.keyboard.type('new')
  await expect(listbox(page).locator('[data-highlighted]')).toHaveText('New York')
  await page.keyboard.press('Tab')
  await expect(form).toHaveText('Acme|NY||')
  // The kind menu has no search input: arrow keys pick, and Tab leaves the value as it was.
  await expect(page.locator('[data-kind-menu]')).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(form).toHaveText('Acme|NY|Receipt|')
  await expect(page.locator('[data-kind-menu]')).toBeFocused()
  // Typeahead on the closed menu, then on to the memo.
  await page.keyboard.press('s')
  await expect(form).toHaveText('Acme|NY|Statement|')
  await page.keyboard.press('Tab')
  await expect(page.locator('[data-memo]')).toBeFocused()
  await page.keyboard.type('Q3')
  await expect(form).toHaveText('Acme|NY|Statement|Q3')
  await expect(listbox(page)).toHaveCount(0)
})

const SCHEMES = ['teal', 'slate-cobalt', 'graphite-violet', 'paper-olive', 'ink-indigo', 'ember']

for (const mode of ['light', 'dark'] as const) {
  test.describe(`paints as USelectMenu does (${mode})`, () => {
    for (const scheme of SCHEMES) {
      test(scheme, async ({ page, baseURL }) => {
        // Scheme and theme in place before the page's own scripts run, as the theme's other specs set them.
        await page.context().addCookies([{ name: 'zooui-scheme', value: scheme, url: baseURL as string }])
        await page.addInitScript((m) => localStorage.setItem('zooui-color-mode', m), mode)
        await page.goto('/select-menu')
        await page.waitForLoadState('networkidle')
        await hydrated(page)
        if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
        else await expect(page.locator('html')).not.toHaveClass(/dark/)
        await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important }' })

        const paint = async (side: 'native' | 'wrapped') => {
          const css = (el: Element) => {
            const c = getComputedStyle(el)
            return { color: c.color, background: c.backgroundColor, ring: c.boxShadow, font: c.fontFamily, radius: c.borderRadius }
          }
          const trigger = page.locator(`[data-side="${side}"]`)
          const closed = await trigger.evaluate(css)
          await trigger.click()
          const opened = await listbox(page).evaluate(css)
          const checked = await listbox(page).locator('[role="option"][aria-selected="true"]').evaluate(css)
          await page.keyboard.press('Escape')
          await expect(listbox(page)).toHaveCount(0)
          return { closed, opened, checked }
        }
        const wrapped = await paint('wrapped')
        await page.mouse.move(0, 0)
        expect(wrapped).toEqual(await paint('native'))
      })
    }
  })
}
