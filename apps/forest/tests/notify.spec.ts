import { expect, test, type Locator, type Page } from '@playwright/test'

// useNotify() and errorMessage() on Forest (page: app/pages/notify.vue). The behavior is covered in full on the base
// (apps/base/tests/notify.spec.ts); here, that each tone has its icon, its color, its text and Zoo UI's 3000 ms on the
// theme (this app's app.config sets no durations), that `danger` is `error`, that this app's own error shape is read,
// and that on every scheme in light and dark each tone's title and description clear 4.5:1 and its icon 3:1.

const SCHEMES = ['teal', 'slate-cobalt', 'graphite-violet', 'paper-olive', 'ink-indigo', 'ember']

async function open(page: Page, baseURL: string, scheme = 'teal', mode: 'light' | 'dark' = 'light') {
  await page.context().addCookies([{ name: 'zooui-scheme', value: scheme, url: baseURL }])
  await page.addInitScript((m) => localStorage.setItem('zooui-color-mode', m), mode)
  await page.goto('/notify')
  await page.waitForLoadState('networkidle')
  if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
  else await expect(page.locator('html')).not.toHaveClass(/dark/)
}

const toasts = (page: Page) => page.getByRole('region', { name: /Notifications/ }).locator('li')
const live = (page: Page) => page.locator('[data-toasts] li')

/** Click until the toast appears: a click before hydration does nothing. */
async function raise(page: Page, selector: string, count = 1) {
  await expect(async () => {
    if (await toasts(page).count() < count) await page.locator(selector).click()
    await expect(toasts(page)).toHaveCount(count, { timeout: 1000 })
  }).toPass()
  return toasts(page).nth(count - 1)
}

/** What an icon draws: its inline SVG, or in CSS mode (a masked span with no content) its `i-lucide:check` class. */
const drawing = (icon: Locator) => icon.evaluate((el) => el.innerHTML || [...el.classList].find((c) => /^i-[a-z0-9]+:[a-z0-9-]+$/.test(c)) || '')

/** The toast's icon is the one drawn for `name` in the page's legend. */
async function expectIcon(page: Page, toast: Locator, name: string) {
  const drawn = await drawing(page.locator(`[data-icon-ref="${name}"]`))
  expect(drawn, `the legend draws ${name}`).not.toBe('')
  expect(await drawing(toast.locator('[data-slot="icon"]')), `the toast draws ${name}`).toBe(drawn)
}

/** The icon's ink, and the theme's `text-<color>` ink (Forest darkens warning, success and info to 700 in light). */
const ink = (toast: Locator, color: string) => toast.locator('[data-slot="icon"]').evaluate((icon, c) => {
  const probe = document.createElement('span')
  probe.className = `text-${c}`
  document.body.append(probe)
  const want = getComputedStyle(probe).color
  probe.remove()
  return { got: getComputedStyle(icon).color, want }
}, color)

/** Contrast of each element's color against the first opaque background behind it, translucent layers laid over it. */
const contrasts = (toast: Locator, slots: string[]) => toast.evaluate((root, list) => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  const px = (c: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data] }
  const lum = (c: number[]) => c.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i]!, 0)
  return Object.fromEntries(list.map((slot) => {
    const el = root.querySelector(`[data-slot="${slot}"]`)
    if (!el) throw new Error(`contrast: no ${slot} in the toast`)
    const layers: number[][] = []
    // a CSS-mode icon paints its ink as its own background (masked): measure it against what is behind it
    for (let at: Element | null = slot === 'icon' ? el.parentElement : el; at; at = at.parentElement) {
      const bg = px(getComputedStyle(at).backgroundColor)
      if (bg[3]! > 0) { layers.push(bg); if (bg[3] === 255) break }
    }
    let bg = layers.at(-1) ?? [255, 255, 255, 255]
    for (const layer of layers.slice(0, -1).reverse()) bg = layer.map((v, i) => v * (layer[3]! / 255) + bg[i]! * (1 - layer[3]! / 255))
    const [a, b] = [lum(px(getComputedStyle(el).color)), lum(bg)]
    return [slot, (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)]
  }))
}, slots)

const TONES = [
  { tone: 'success', color: 'success', icon: 'i-lucide-check', title: 'Project saved', description: 'The Lakeside project is up to date.' },
  { tone: 'info', color: 'info', icon: 'i-lucide-info', title: 'Sync started', description: 'Files appear as they arrive.' },
  { tone: 'warning', color: 'warning', icon: 'i-lucide-triangle-alert', title: 'Two tasks have no owner', description: 'Assign them before the sprint starts.' },
  { tone: 'error', color: 'error', icon: 'i-lucide-octagon-alert', title: 'Couldn’t save the project', description: 'The server didn’t answer.' },
  { tone: 'primary', color: 'primary', icon: 'i-lucide-check', title: 'Invite sent', description: 'Sam will get an email.' },
  { tone: 'danger', color: 'error', icon: 'i-lucide-octagon-alert', title: 'Couldn’t delete the file', description: 'It is open elsewhere.' },
]

for (const mode of ['light', 'dark'] as const) {
  test.describe(`each tone on the theme, ${mode}`, () => {
    for (const t of TONES) {
      test(`notify.${t.tone}(): ${t.color}, ${t.icon}, title and description, 3000 ms`, async ({ page, baseURL }) => {
        await open(page, baseURL!, 'teal', mode)
        const toast = await raise(page, `[data-notify="${t.tone}"]`)
        await expect(toast.locator('[data-slot="title"]')).toHaveText(t.title)
        await expect(toast.locator('[data-slot="description"]')).toHaveText(t.description)
        await expectIcon(page, toast, t.icon)
        const { got, want } = await ink(toast, t.color)
        expect(got, `the icon is inked in ${t.color}`).toBe(want)
        await expect(live(page)).toHaveText([`${t.color} · ${t.icon} · 3000`])
      })
    }
  })
}

test('a caught error shows its readable text, this app’s own shape included', async ({ page, baseURL }) => {
  await open(page, baseURL!)
  const problem = await raise(page, '[data-error="problem"]')
  await expect(problem.locator('[data-slot="description"]')).toHaveText('The project was changed by someone else.')
  const product = await raise(page, '[data-error="product"]', 2)
  await expect(product.locator('[data-slot="description"]')).toHaveText('Monthly quota reached')
  await expect(page.locator('[data-message="fields"]')).toHaveText('Name is required, Budget must be positive')
})

for (const scheme of SCHEMES) {
  for (const mode of ['light', 'dark'] as const) {
    test(`${scheme}, ${mode}: every tone's text clears 4.5:1 and its icon 3:1`, async ({ page, baseURL }) => {
      await open(page, baseURL!, scheme, mode)
      const tones = TONES.filter((t) => t.tone !== 'danger')
      const failures: string[] = []
      for (const [i, t] of tones.entries()) {
        const toast = await raise(page, `[data-notify="${t.tone}"]`, i + 1)
        const c = await contrasts(toast, ['title', 'description', 'icon'])
        if (c.title! < 4.5) failures.push(`${t.tone} title ${c.title!.toFixed(2)}`)
        if (c.description! < 4.5) failures.push(`${t.tone} description ${c.description!.toFixed(2)}`)
        if (c.icon! < 3) failures.push(`${t.tone} icon ${c.icon!.toFixed(2)}`)
      }
      expect(failures).toEqual([])
    })
  }
}
