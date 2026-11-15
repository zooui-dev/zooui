import { expect, test, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// The base layer's contract, asserted on a product with its own look (its palette, typefaces and color-mode
// key): none of the Forest theme's colors, typefaces, ground or restyling arrive with it; the Z* components take the product's
// colors; what the product adds in its one CSS entry works; and the mechanisms a product depends on hold in a
// production build — light-dark() tokens, data-accent sections, UFormField labels after hydration, bundled icons.

/** Tailwind's palette values the product's app.config and main.css point at. */
const TW = {
  'sky-200': 'oklch(90.1% 0.058 230.902)', 'sky-300': 'oklch(82.8% 0.111 230.318)', 'sky-400': 'oklch(74.6% 0.16 232.661)',
  'sky-500': 'oklch(68.5% 0.169 237.323)', 'sky-600': 'oklch(58.8% 0.158 241.966)', 'sky-700': 'oklch(50% 0.134 242.749)',
  'sky-900': 'oklch(39.1% 0.09 240.876)',
  'slate-200': 'oklch(92.9% 0.013 255.508)', 'slate-900': 'oklch(20.8% 0.042 265.755)', 'slate-950': 'oklch(12.9% 0.042 264.695)',
  'amber-400': 'oklch(82.8% 0.189 84.429)', 'amber-500': 'oklch(76.9% 0.188 70.08)', 'emerald-500': 'oklch(69.6% 0.17 162.48)', 'red-500': 'oklch(63.7% 0.237 25.331)',
  'teal-200': 'oklch(91% 0.096 180.426)', 'teal-400': 'oklch(77.7% 0.152 181.912)', 'teal-600': 'oklch(60% 0.118 184.704)',
  'teal-800': 'oklch(43.7% 0.078 188.216)', 'teal-950': 'oklch(27.7% 0.046 192.524)',
  'cyan-300': 'oklch(86.5% 0.127 207.078)', 'cyan-500': 'oklch(71.5% 0.143 215.221)', 'cyan-950': 'oklch(30.2% 0.056 229.695)',
  'white': '#fff',
} as const

/** Any CSS color (a literal, a var(), a color-mix()) as getComputedStyle reports it, so the two sides compare equal. */
const resolve = (page: Page, value: string) => page.evaluate((v) => {
  const d = document.createElement('div'); d.style.color = v; document.body.append(d)
  const c = getComputedStyle(d).color; d.remove(); return c
}, value)
const tw = (page: Page, name: keyof typeof TW) => resolve(page, TW[name])

const style = (page: Page, selector: string, prop: string, pseudo?: string) => page.locator(selector).first()
  .evaluate((el, [p, ps]) => getComputedStyle(el, ps).getPropertyValue(p), [prop, pseudo ?? null] as const)

const buttonBg = (page: Page, name: string) => page.locator('section#nuxt-ui')
  .getByRole('button', { name, exact: true }).evaluate((el) => getComputedStyle(el).backgroundColor)

const toggle = (page: Page) => page.getByRole('group', { name: 'Theme' })

/** Hydrated: ZThemeToggle renders on the client only, and its enabled buttons replace the server's disabled ones. */
const hydrated = (page: Page) => expect(toggle(page).getByRole('button', { name: 'dark', exact: true })).toBeEnabled()

const setDark = async (page: Page) => {
  await page.evaluate(() => localStorage.setItem('product-color-mode', 'dark'))
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page.locator('html')).toHaveClass(/dark/)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
})

test('renders cleanly, and no element carries two same-property utilities', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })
  await page.reload()
  await page.waitForLoadState('networkidle')
  await hydrated(page)
  for (const id of ['nuxt-ui', 'form', 'zoo', 'accent', 'product-css']) await expect(page.locator(`section#${id}`)).toBeVisible()
  expect(await page.evaluate(findConflicts)).toEqual([])
  expect(errors).toEqual([])
})

test('no Forest colors: Nuxt UI paints the product\'s palette, and Forest\'s ramps are not even declared', async ({ page }) => {
  expect(await buttonBg(page, 'primary')).toBe(await tw(page, 'sky-500'))
  expect(await buttonBg(page, 'secondary')).toBe(await tw(page, 'amber-500'))
  expect(await buttonBg(page, 'success')).toBe(await tw(page, 'emerald-500'))
  expect(await buttonBg(page, 'warning')).toBe(await tw(page, 'amber-500'))
  expect(await buttonBg(page, 'error')).toBe(await tw(page, 'red-500'))
  // the one the product leaves to Nuxt UI: its default blue, not a leaked pine-info (config.spec.ts covers the rest)
  expect(await buttonBg(page, 'info')).toBe(await resolve(page, 'oklch(62.3% 0.214 259.815)'))
  expect(await resolve(page, 'var(--ui-border)')).toBe(await tw(page, 'slate-200'))   // neutral: slate
  // Forest's ramps and palettes, and the theme's nav-marker variables
  const declared = await page.evaluate(() => ['--pine-50', '--teal-500', '--amber-500', '--success-500', '--color-pine-50', '--color-accent-500',
    '--color-pine-red-500', '--nav-highlight-size', '--nav-current-weight']
    .filter((v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() !== ''))
  expect(declared).toEqual([])
})

// The product sets no typeface: it keeps what Nuxt UI 4.11 ships with @nuxt/fonts on, a system sans stack.
test('no Forest typefaces: the product\'s own sans stack, and nothing of the AT stack declared or fetched', async ({ page }) => {
  const fonts: string[] = []
  page.on('request', (r) => { if (r.resourceType() === 'font') fonts.push(r.url()) })
  await page.reload()
  await page.waitForLoadState('networkidle')
  const r = await page.evaluate(() => {
    const d = document.createElement('div'); d.style.fontFamily = 'var(--font-sans)'; document.body.append(d)
    const sans = getComputedStyle(d).fontFamily; d.remove()
    return {
      body: getComputedStyle(document.body).fontFamily, sans,
      features: getComputedStyle(document.body).fontFeatureSettings,
      faces: [...new Set([...document.fonts].map((f) => f.family.replace(/"/g, '')))],
    }
  })
  expect(r.body).toBe(r.sans)
  expect(r.body).not.toMatch(/AT (Name|Lang)/)
  expect(r.features).toBe('normal')
  expect(r.faces.filter((f) => f.startsWith('AT '))).toEqual([])
  expect(fonts.filter((u) => /AT(Lang|Name)/.test(u))).toEqual([])
})

test('no Forest ground or restyling: the page, badges, keys, table headers, alerts and toasts are Nuxt UI\'s', async ({ page }) => {
  const body = await page.evaluate(() => getComputedStyle(document.body).fontFamily)
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 255, 255)')   // --ui-bg, not paper
  expect(await style(page, '[data-badge]', 'font-family')).toBe(body)
  expect(await style(page, 'kbd', 'font-family')).toBe(body)
  expect(await style(page, 'section#nuxt-ui th', 'font-family')).toBe(body)
  expect(await style(page, 'section#nuxt-ui th', 'text-transform')).toBe('none')
  expect(await style(page, '[data-alert]', 'content', '::before')).toBe('none')   // no striped edge
  await page.locator('[data-toast]').click()
  const toast = page.locator('li').filter({ hasText: 'A toast in the product\'s colors.' }).first()
  await expect(toast).toBeVisible()
  expect(await toast.evaluate((el) => getComputedStyle(el).borderLeftWidth)).toBe('0px')   // no colored edge
  await expect(toast.locator('[role="progressbar"]')).toBeVisible()   // Nuxt UI's countdown, which Forest hides
  await setDark(page)   // and in dark, Nuxt UI's ground
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(await resolve(page, 'var(--ui-bg)'))
  expect(await resolve(page, 'var(--ui-bg)')).toBe(await tw(page, 'slate-900'))
})

test.describe('color mode', () => {
  test.use({ colorScheme: 'dark' })

  test('the product\'s own: light on a dark OS, saved under its key, no data-theme', async ({ page }) => {
    await hydrated(page)
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await toggle(page).getByRole('button', { name: 'dark', exact: true }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    expect(await page.evaluate(() => ({ product: localStorage.getItem('product-color-mode'), forest: localStorage.getItem('zooui-color-mode') })))
      .toEqual({ product: 'dark', forest: null })
    expect(await page.locator('html').getAttribute('data-theme')).toBeNull()
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)   // and read back from that key
  })
})

for (const mode of ['light', 'dark'] as const) {
  test(`Z* components take the product's colors (${mode})`, async ({ page }) => {
    if (mode === 'dark') await setDark(page)
    const light = mode === 'light'
    const primary = await resolve(page, 'var(--ui-primary)')
    expect(primary).toBe(await tw(page, light ? 'sky-500' : 'sky-400'))
    expect(await style(page, '[data-specimen="kicker"]', 'color', '::before')).toBe(primary)
    expect(await style(page, '[data-edge="primary"]', 'border-left-color')).toBe(primary)
    expect(await style(page, '[data-specimen="ident-version"]', 'color')).toBe(await tw(page, light ? 'sky-700' : 'sky-300'))
    expect(await style(page, '[data-status="healthy"] > span[aria-hidden]', 'background-color')).toBe(await resolve(page, 'var(--ui-success)'))
    expect(await style(page, '[data-meter="warn"] > span > span', 'background-color')).toBe(await resolve(page, 'var(--ui-warning)'))
    expect(await style(page, '[data-code="block"]', 'background-color')).toBe(await tw(page, light ? 'slate-900' : 'slate-950'))   // near-black in both
    expect(await style(page, '[data-specimen="eco"]', 'border-top-color')).toBe(await resolve(page, 'var(--ui-border-inverted)'))
    // the eyebrow in the accent ink, the healthy glow in the success color, ZSlots' open slot
    // a primary badge and its held one in the page's face (the theme's mono badges are not here)
    expect(await style(page, '[data-specimen="eyebrow"]', 'color')).toBe(await tw(page, light ? 'sky-700' : 'sky-300'))
    expect(await style(page, '[data-status="glow"] > span[aria-hidden]', 'box-shadow')).toContain(await resolve(page, 'var(--ui-success)'))
    expect(await style(page, '[data-specimen="slots"] [data-available="true"]', 'background-color')).toBe(primary)
    expect(await style(page, '[data-specimen="slots"] [data-available="false"]', 'font-family')).toBe(await page.evaluate(() => getComputedStyle(document.body).fontFamily))
    // ZTokenReveal's warning is Nuxt UI's outline alert, in the product's amber
    expect(await style(page, '[data-specimen="token-reveal"] [data-slot="root"]', 'color')).toBe(await resolve(page, 'var(--ui-warning)'))
    expect(await resolve(page, 'var(--ui-warning)')).toBe(await tw(page, light ? 'amber-500' : 'amber-400'))
  })
}

test('font-mono degrades: the Z* mono faces fall back to Tailwind\'s system mono stack', async ({ page }) => {
  for (const sel of ['[data-specimen="kicker"]', '[data-code="block"]', '[data-specimen="ident-version"]']) {
    expect(await style(page, sel, 'font-family'), sel).toMatch(/^ui-monospace/)
  }
  expect(await page.locator('[data-specimen="kicker"]').evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThan(0)
})

test('the product\'s CSS additions work after the base: @theme tokens, @utility, @layer base, and app.config on them', async ({ page }) => {
  expect(await style(page, '[data-probe="text-sm"]', 'font-size')).toBe('15px')   // --text-sm overridden
  expect(await style(page, '[data-probe="navy"]', 'color')).toBe('rgb(19, 19, 83)')
  expect(await style(page, '[data-probe="num"]', 'font-variant-numeric')).toBe('tabular-nums')
  expect(await style(page, '[data-section="teal"] .section-label', 'text-transform')).toBe('uppercase')
  expect(await style(page, '[data-section="teal"] .section-label', 'color')).toBe(await tw(page, 'teal-800'))
  // the product's app.config paints UInput with its own token
  expect(await style(page, '[data-field="from"] input', 'background-color')).toBe('rgb(219, 238, 243)')
})

// Lightning CSS compiles light-dark() into variables it defines only where color-scheme is declared; the base
// declares it on the root, where @theme puts the tokens. Without that, these resolve to nothing in production.
test('light-dark() tokens resolve in both modes in the production build', async ({ page }) => {
  const compiled = await page.evaluate(() => {
    const text = [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules].map((r) => r.cssText) } catch { return [] } }).join('\n')
    return { lightDark: text.includes('light-dark('), lightning: text.includes('--lightningcss-light') }
  })
  expect(compiled).toEqual({ lightDark: false, lightning: true })   // this IS the compiled path, not native light-dark()
  const probe = '[data-probe="val-input"]'
  expect(await style(page, probe, 'color')).toBe(await tw(page, 'sky-900'))
  expect(await style(page, probe, 'background-color')).toBe('rgb(219, 238, 243)')
  await setDark(page)
  expect(await style(page, probe, 'color')).toBe(await tw(page, 'sky-200'))
  expect(await style(page, probe, 'background-color')).toBe(await resolve(page, `color-mix(in oklab, ${TW['sky-500']} 22%, transparent)`))
})

for (const mode of ['light', 'dark'] as const) {
  test(`data-accent: the product's hue map paints the roles, and ZCard's accent edge follows (${mode})`, async ({ page }) => {
    if (mode === 'dark') await setDark(page)
    const light = mode === 'light'
    const section = (hue: string, probe: string, prop: string) => style(page, `[data-section="${hue}"] [data-probe="${probe}"]`, prop)
    const edge = (hue: string) => style(page, `[data-section="${hue}"] [data-edge="accent"]`, 'border-left-color')

    expect(await section('teal', 'solid', 'background-color')).toBe(await tw(page, light ? 'teal-600' : 'teal-400'))
    expect(await section('teal', 'solid', 'color')).toBe(await tw(page, light ? 'white' : 'teal-950'))
    expect(await section('teal', 'strong', 'color')).toBe(await tw(page, light ? 'teal-800' : 'teal-200'))
    expect(await edge('teal')).toBe(await tw(page, light ? 'teal-600' : 'teal-400'))
    // cyan points its stops elsewhere and sets --accent-on outright
    expect(await section('cyan', 'solid', 'background-color')).toBe(await tw(page, light ? 'cyan-500' : 'cyan-300'))
    expect(await section('cyan', 'solid', 'color')).toBe(await tw(page, 'cyan-950'))
    // a name with no hue map reads as the product's primary, not as nothing
    expect(await section('unmapped', 'solid', 'background-color')).toBe(await tw(page, light ? 'sky-600' : 'sky-400'))
    // outside any section, the accent edge is the primary
    expect(await style(page, '[data-edge="accent-outside"]', 'border-left-color')).toBe(await resolve(page, 'var(--ui-primary)'))
  })

  // Nuxt UI portals overlays to <body>, outside the section; the wrapper carries the section's name onto the content
  test(`data-accent: an overlay opened from a section takes that section's accent edge (${mode})`, async ({ page }) => {
    if (mode === 'dark') await setDark(page)
    await hydrated(page)
    await page.locator('[data-open="accent-modal"]').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    expect(await dialog.evaluate((el) => el.closest('[data-section]'))).toBeNull()   // it really is outside the section
    await expect(dialog).toHaveAttribute('data-accent', 'teal')
    const edge = await dialog.evaluate((el) => { const cs = getComputedStyle(el); return { width: cs.borderTopWidth, color: cs.borderTopColor } })
    expect(edge).toEqual({ width: '3px', color: await tw(page, mode === 'light' ? 'teal-600' : 'teal-400') })
  })
}

// Nuxt strips onServerPrefetch from the client production bundle by default; with svg icons ahead of a data-loading
// component (DateRange.vue), the client's useId() inside it then drifts from the server's and hydration leaves the
// label pointing at an id that is gone. Checked to fail with the base's fix removed.
test('UFormField labels still name their inputs after hydration (production build)', async ({ page }) => {
  await hydrated(page)
  for (const field of ['from', 'to']) {
    const r = await page.locator(`[data-field="${field}"]`).evaluate((el) => ({
      for: el.querySelector('label')!.htmlFor, id: el.querySelector('input')!.id,
    }))
    expect(r.for, field).not.toBe('')
    expect(r.for, field).toBe(r.id)
  }
  await expect(page.getByLabel('From', { exact: true })).toHaveValue('2026-01-01')
  await expect(page.getByLabel('To', { exact: true })).toHaveValue('2026-03-31')
})

// The outcome a product needs: Z* icons rendered on the client (ZThemeToggle's, ZTokenReveal's check) come from the
// client bundle, though the app lists only its own icons and does not `scan`. The layer registers them; today each
// is also a Nuxt UI default icon, which Nuxt UI bundles too, so this cannot yet tell the two apart (docs/mechanisms.md, "Z*
// icons in the client bundle"). scripts/check-icons.test.mjs keeps the layer's list complete.
test('Z* icons come from the client bundle: they render with no request for icon data', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (r) => { if (/_nuxt_icon|iconify/.test(r.url())) requests.push(r.url()) })
  await page.reload()
  await hydrated(page)
  for (const name of ['light', 'dark', 'system']) {
    await expect(toggle(page).getByRole('button', { name, exact: true }).locator('svg')).toHaveCount(1)
  }
  const ack = page.locator('[data-specimen="token-reveal"]').getByRole('button', { name: 'I have saved it' })
  await ack.click()
  await expect(ack.locator('svg')).toHaveCount(1)   // i-lucide-check, rendered only after the click
  await page.waitForLoadState('networkidle')
  expect(requests).toEqual([])
})
