import { expect, test, type Page } from '@playwright/test'

// The layer's contract, asserted: Forest's colors, ground and typefaces are in, and Nuxt UI's geometry and behavior
// did not move. Expected colors are read from the scheme's own ramps at runtime, so these hold whichever
// scheme this app imports (Ink · Indigo).

/** A ramp variable (e.g. "--teal-500") resolved to the rgb() string getComputedStyle reports. */
const ramp = (page: Page, name: string) => page.evaluate((v) => {
  const d = document.createElement('div')
  d.style.color = `var(${v})`
  document.body.append(d)
  const c = getComputedStyle(d).color
  d.remove()
  return c
}, name)

const SCHEME_IDS = ['teal', 'slate-cobalt', 'graphite-violet', 'paper-olive', 'ink-indigo', 'ember']

const buttonBg = (page: Page, name: string) => page.locator('section#buttons')
  .getByRole('button', { name, exact: true }).first().evaluate((el) => getComputedStyle(el).backgroundColor)

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
})

test('every section renders, with no page or console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })
  await page.reload()
  await page.waitForLoadState('networkidle')
  for (const id of ['buttons', 'form', 'data', 'navigation', 'overlays', 'feedback', 'edges', 'zoo', 'grid']) {
    await expect(page.locator(`section#${id}`)).toBeVisible()
  }
  expect(errors).toEqual([])
})

// Success and info are PER SCHEME: each scheme file declares a pair chosen to sit clear of its accent.
// Tailwind's palette values, as the scheme files hold them (packages/theme-forest/schemes/*.css, "status").
const TAILWIND_500: Record<string, string> = {
  green: 'oklch(72.3% 0.219 149.579)', teal: 'oklch(70.4% 0.14 182.503)',
  sky: 'oklch(68.5% 0.169 237.323)', cyan: 'oklch(71.5% 0.143 215.221)', blue: 'oklch(62.3% 0.214 259.815)',
}
const PAIRS: Record<string, { success: string; info: string }> = {
  'teal': { success: 'green', info: 'sky' },
  'slate-cobalt': { success: 'green', info: 'cyan' },
  'graphite-violet': { success: 'green', info: 'blue' },
  'paper-olive': { success: 'teal', info: 'blue' },
  'ink-indigo': { success: 'green', info: 'cyan' },
  'ember': { success: 'green', info: 'blue' },
}
const resolve = (page: Page, c: string) => page.evaluate((v) => {
  const d = document.createElement('div'); d.style.color = v; document.body.append(d)
  const r = getComputedStyle(d).color; d.remove(); return r
}, c)

test('every semantic color paints a Forest ramp (Ink · Indigo, as served)', async ({ page }) => {
  expect(await buttonBg(page, 'primary')).toBe(await ramp(page, '--teal-500'))
  expect(await buttonBg(page, 'success')).toBe(await resolve(page, TAILWIND_500.green!))   // Ink · Indigo's pair
  expect(await buttonBg(page, 'info')).toBe(await resolve(page, TAILWIND_500.cyan!))
  expect(await buttonBg(page, 'secondary')).toBe(await ramp(page, '--pine-500'))  // muted, not a second hue
  expect(await buttonBg(page, 'warning')).toBe(await ramp(page, '--amber-500'))
  expect(await buttonBg(page, 'error')).toBe(await ramp(page, '--red-500'))
})

test('each scheme carries its own success / info pair', async ({ page }) => {
  for (const id of SCHEME_IDS) {
    await page.locator(`button[data-scheme="${id}"]`).click()
    const pair = PAIRS[id]!
    await expect.poll(() => ramp(page, '--ui-success'), { message: `${id} success` }).toBe(await resolve(page, TAILWIND_500[pair.success]!))
    // poll this too: neighboring schemes can share a success color, so the success check alone can pass
    // before the switch lands
    await expect.poll(() => ramp(page, '--ui-info'), { message: `${id} info` }).toBe(await resolve(page, TAILWIND_500[pair.info]!))
  }
})

/**
 * The hue gap between primary and success / info on each of the six schemes, measured in the page through a
 * canvas pixel so oklch() palettes and hex ramps compare on equal terms. A near-gray color has no hue and
 * cannot clash by hue, so it scores 360.
 */
async function hueGaps(page: Page) {
  const gaps: { scheme: string; success: number; info: number }[] = []
  for (const id of SCHEME_IDS) {
    await page.locator(`button[data-scheme="${id}"]`).click()
    // wait for the switch to land: the scheme's injected style carries its id (useScheme.ts)
    await page.waitForFunction((s) => document.querySelector('style[data-scheme]')?.getAttribute('data-scheme') === s, id)
    gaps.push(await page.evaluate((scheme) => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 1
      const cx = cv.getContext('2d', { willReadFrequently: true })!
      const probe = (v: string) => { const d = document.createElement('div'); d.style.color = `var(${v})`; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c }
      const lch = (c: string) => {
        cx.clearRect(0, 0, 1, 1); cx.fillStyle = c; cx.fillRect(0, 0, 1, 1)
        const [r, g, b] = [...cx.getImageData(0, 0, 1, 1).data].slice(0, 3).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
        const l = Math.cbrt(0.4122214708 * r! + 0.5363325363 * g! + 0.0514459929 * b!)
        const m = Math.cbrt(0.2119034982 * r! + 0.6806995451 * g! + 0.1073969566 * b!)
        const s = Math.cbrt(0.0883024619 * r! + 0.2817188376 * g! + 0.6299787005 * b!)
        const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
        const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
        return { C: Math.hypot(A, B), h: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 }
      }
      const gap = (a: string, b: string) => {
        const x = lch(a), y = lch(b)
        if (x.C < 0.04 || y.C < 0.04) return 360
        const d = Math.abs(x.h - y.h); return Math.min(d, 360 - d)
      }
      const p = probe('--ui-primary')
      return { scheme, success: Math.round(gap(p, probe('--ui-success'))), info: Math.round(gap(p, probe('--ui-info'))) }
    }, id))
  }
  return gaps
}

const MIN_GAP = 30   // degrees of OKLCH hue: below this, two chromatic colors read as the same family

// The rule the per-scheme pairs exist for. The two fixed rules it replaced failed exactly here: a pinned teal
// success sat at 0° on Teal, and Nuxt UI's blue info at 3° on Slate · Cobalt.
test('success and info sit clear of the primary on every scheme', async ({ page }) => {
  const gaps = await hueGaps(page)
  expect(gaps).toHaveLength(SCHEME_IDS.length)
  expect(gaps.filter((g) => g.success < MIN_GAP || g.info < MIN_GAP)).toEqual([])
})

test('the scheme override reaches Nuxt UI: Ink · Indigo, not the default teal', async ({ page }) => {
  // #5a51d4 is Ink · Indigo's accent-500; the layer's default (Teal) would be #117d72
  const INDIGO = 'rgb(90, 81, 212)'
  expect(await buttonBg(page, 'primary')).toBe(INDIGO)
  // Two things supply Ink · Indigo here: main.css's static `@import …/ink-indigo.css` (how a product picks its
  // scheme) and this app's switcher's injected style (cookie default, :root:root, which wins). Remove the
  // injected one, so this proves the STATIC import alone reaches Nuxt UI — not the switcher.
  await page.evaluate(() => document.querySelector('style[data-scheme]')!.remove())
  await expect.poll(() => page.evaluate(() => document.querySelectorAll('style[data-scheme]').length)).toBe(0)
  expect(await ramp(page, '--ui-primary')).toBe(INDIGO)
})

test('Forest neutrals drive surfaces, text and borders', async ({ page }) => {
  expect(await ramp(page, '--ui-border')).toBe(await ramp(page, '--pine-200'))
  expect(await ramp(page, '--ui-text-muted')).toBe(await ramp(page, '--pine-500'))
})

// Forest separates the ground (paper) from raised surfaces (white). The ground changes; --ui-bg does not, so
// everything Nuxt UI draws on bg-default — cards, inputs, menus, overlays — stays white and reads as raised.
test('the page ground is Forest paper, and raised surfaces stay white', async ({ page }) => {
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(await ramp(page, '--pine-50'))
  const card = await page.locator('section#data').getByText('Body text inside the default card.')
    .evaluate((el) => getComputedStyle(el.closest('[class*="rounded"]')!).backgroundColor)
  expect(card).toBe('rgb(255, 255, 255)')
  const input = await page.locator('section#form input').first().evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(input).toBe('rgb(255, 255, 255)')
})

// The bug an early build of this theme shipped: the specimens live in ../kitchen-sink, outside this app's root, so Tailwind
// never saw their classes. Colors were right (they come from the layer) and the page had no spacing at all.
test('the shared specimens are styled: row rhythm and label column match the baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1150, height: 900 })
  const layout = await page.evaluate(() => {
    const rows = document.querySelector('section#buttons > div:last-child')!
    const row = rows.firstElementChild!
    return {
      rowGap: getComputedStyle(rows).gap,
      direction: getComputedStyle(row).flexDirection,
      labelWidth: Math.round(row.firstElementChild!.getBoundingClientRect().width),
    }
  })
  expect(layout).toEqual({ rowGap: '20px', direction: 'row', labelWidth: 144 })
})

// Geometry is Nuxt UI's. These are its shipped values, measured on the baseline.
test('geometry is still Nuxt UI\'s', async ({ page }) => {
  const radius = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-radius').trim())
  // the production build minifies 0.25rem to .25rem, so compare the value, not the string
  expect(radius.endsWith('rem') && parseFloat(radius)).toBe(0.25)
  const box = await page.locator('section#buttons').getByRole('button', { name: 'primary', exact: true }).first().evaluate((el) => {
    const s = getComputedStyle(el)
    return { height: Math.round(el.getBoundingClientRect().height), px: s.paddingLeft, radius: s.borderTopLeftRadius, weight: s.fontWeight }
  })
  expect(box).toEqual({ height: 32, px: '10px', radius: '6px', weight: '500' })
})

test('overlays still behave: focus trap, Escape, focus return', async ({ page }) => {
  const opener = page.getByRole('button', { name: 'Modal', exact: true })
  await opener.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  expect(await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null)).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(opener).toBeFocused()
})

test('dark mode: Nuxt UI picks the lighter accent shade, and the ground is its own', async ({ page }) => {
  const accent400 = await ramp(page, '--teal-400')
  const pine900 = await ramp(page, '--pine-900')
  await page.getByLabel('Dark mode').click()
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true)
  await expect.poll(() => buttonBg(page, 'primary')).toBe(accent400)   // 400 in dark: Nuxt UI's rule on Forest's ramp
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(pine900)
})

// This app's scheme toggle: Forest's six schemes, live. Read through --ui-primary rather than a painted
// button, because Nuxt UI transitions button color and a read mid-fade sees a blend of two schemes.

test('scheme toggle: each of the six repaints Nuxt UI with that scheme\'s accent and grays', async ({ page }) => {
  await expect(page.locator('button[data-scheme]')).toHaveCount(SCHEME_IDS.length)
  const seenGrays = new Set<string>()
  for (const id of SCHEME_IDS) {
    const swatch = page.locator(`button[data-scheme="${id}"]`)
    await swatch.click()
    await expect(swatch).toHaveAttribute('aria-pressed', 'true')
    const expected = await swatch.evaluate((el) => getComputedStyle(el).backgroundColor)   // the scheme's own accent-500
    await expect.poll(() => ramp(page, '--ui-primary')).toBe(expected)
    seenGrays.add(await ramp(page, '--pine-200'))
  }
  expect(seenGrays.size).toBe(SCHEME_IDS.length)   // every scheme tints its grays too, not just the accent
})

test('scheme toggle: leaving Ember restores Forest\'s amber (Ember is the one scheme that redefines it)', async ({ page }) => {
  const baseAmber = await ramp(page, '--amber-500')
  await page.locator('button[data-scheme="ember"]').click()
  await expect.poll(() => ramp(page, '--amber-500')).not.toBe(baseAmber)
  await page.locator('button[data-scheme="slate-cobalt"]').click()
  await expect.poll(() => ramp(page, '--amber-500')).toBe(baseAmber)
})

test('scheme toggle: the choice survives a reload, server-rendered (no flash)', async ({ page }) => {
  await page.locator('button[data-scheme="paper-olive"]').click()
  const olive = await page.locator('button[data-scheme="paper-olive"]').evaluate((el) => getComputedStyle(el).backgroundColor)
  // fetch the server HTML directly: the scheme's style must already be in it, before any JavaScript runs
  const html = await page.evaluate(() => fetch('/', { credentials: 'include' }).then((r) => r.text()))
  expect(html).toContain('data-scheme="paper-olive"')
  await page.reload()
  await page.waitForLoadState('networkidle')
  expect(await ramp(page, '--ui-primary')).toBe(olive)
})

// Forest's colored edge — Forest's one addition to Nuxt UI's surfaces (components/edge.ts). 3px in the surface's
// semantic color: LEFT on cards and toasts, TOP on dialogs, slideovers and drawers. No color, no edge.
const EDGE_COLORS = ['primary', 'secondary', 'success', 'info', 'warning', 'error', 'neutral']
const uiColor = (page: Page, c: string) => ramp(page, c === 'neutral' ? '--ui-border-inverted' : `--ui-${c}`)

test('cards: a left edge in each color, and none without one', async ({ page }) => {
  for (const c of EDGE_COLORS) {
    const s = await page.locator(`[data-edge="${c}"]`).evaluate((el) => {
      const cs = getComputedStyle(el); return { width: cs.borderLeftWidth, color: cs.borderLeftColor, top: cs.borderTopWidth }
    })
    expect(s, c).toEqual({ width: '3px', color: await uiColor(page, c), top: '0px' })
  }
  expect(await page.locator('[data-edge="none"]').evaluate((el) => getComputedStyle(el).borderLeftWidth)).toBe('0px')
})

test('ZCard passes Nuxt UI\'s slots through: header and footer render', async ({ page }) => {
  const card = page.locator('section#edges').getByText('The edge spans header, body and footer.').locator('xpath=ancestor::*[contains(@class,"rounded")][1]')
  await expect(card.getByRole('heading', { name: 'Header' })).toBeVisible()
  await expect(card.getByRole('button', { name: 'Save' })).toBeVisible()
})

for (const overlay of ['dialog', 'slideover', 'drawer']) {
  test(`${overlay}: a top edge in the chosen color, and Nuxt UI's behavior intact`, async ({ page }) => {
    for (const c of ['error', 'primary']) {
      await page.getByLabel('Overlay color').click()
      await page.getByRole('option', { name: c, exact: true }).click()
      const opener = page.locator(`[data-open="${overlay}"]`)
      await opener.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      const edge = await dialog.evaluate((el) => { const cs = getComputedStyle(el); return { width: cs.borderTopWidth, color: cs.borderTopColor } })
      expect(edge, `${overlay} ${c}`).toEqual({ width: '3px', color: await uiColor(page, c) })
      // the wrapper must not cost Nuxt UI's behavior: focus inside, Escape closes, focus returns. Except where the
      // component itself differs: Nuxt UI's UDrawer (vaul) leaves focus where it was on open — measured on the
      // untouched baseline too — so the drawer is held to UDrawer's behavior, not Modal's.
      if (overlay !== 'drawer') {
        expect(await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null)).toBe(true)
      }
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(opener).toBeFocused()
    }
  })
}

test('toasts: a left edge in their color', async ({ page }) => {
  for (const c of ['success', 'warning', 'error']) {
    await page.locator(`[data-toast="${c}"]`).click()
    const label = `${c[0]!.toUpperCase()}${c.slice(1)}`
    const toast = page.locator('li').filter({ has: page.getByText(label, { exact: true }) }).filter({ hasText: 'A toast with its colored edge.' }).first()
    await expect(toast).toBeVisible()
    const edge = await toast.evaluate((el) => { const cs = getComputedStyle(el); return { width: cs.borderLeftWidth, color: cs.borderLeftColor } })
    expect(edge, c).toEqual({ width: '3px', color: await uiColor(page, c) })
  }
})

test('toasts: no progress bar — Forest shows the message, not a countdown', async ({ page }) => {
  await page.locator('[data-toast="success"]').click()
  const toast = page.locator('li').filter({ hasText: 'A toast with its colored edge.' }).first()
  await expect(toast).toBeVisible()
  await expect(toast.locator('[role="progressbar"]')).toBeHidden()
})

/** The striped edge: a ::before strip, its width, pattern and color, and the surface it sits on. */
const stripe = (page: Page, selector: string) => page.locator(selector).evaluate((el) => {
  const s = getComputedStyle(el), b = getComputedStyle(el, '::before')
  return { width: b.width, image: b.backgroundImage.startsWith('repeating-linear-gradient(135deg'), color: b.color, surface: s.backgroundColor, text: s.color, shadow: s.boxShadow }
})

// Forest's banner (core RECIPES "Banner (hatched edge)") as Nuxt UI's UAlert with variant="outline": a plain raised
// surface, neutral text and border, and only the 6px hatched strip carrying the color.
test('banner: outline alerts are Forest\'s banner — neutral surface, striped edge in the color', async ({ page }) => {
  const s = await stripe(page, '[data-banner="warning"]')
  expect(s.width).toBe('6px')
  expect(s.image).toBe(true)
  expect(s.color).toBe(await ramp(page, '--ui-warning'))
  expect(s.surface).toBe('rgb(255, 255, 255)')
  expect(s.text).toBe(await ramp(page, '--ui-text'))
  expect(s.shadow).toContain(`${await ramp(page, '--ui-border')} 0px 0px 0px 1px inset`)   // the ring is the neutral border
  expect(await page.locator('[data-banner="error"]').evaluate((el) => getComputedStyle(el, '::before').color)).toBe(await ramp(page, '--ui-error'))
})

// Every Nuxt UI variant keeps its own surface and gains the strip — and the strip must SHOW against that surface:
// on `solid` the surface is the color itself, so the strip turns white.
test('striped edge on every alert variant, always visible against its surface', async ({ page }) => {
  for (const v of ['solid', 'soft', 'subtle', 'outline']) {
    const s = await stripe(page, `[data-variant="${v}"]`)
    expect(s.width, v).toBe('6px')
    expect(s.image, v).toBe(true)
    expect(s.color, `${v}: strip color must differ from its surface`).not.toBe(s.surface)
  }
  expect(await page.locator('[data-variant="solid"]').evaluate((el) => getComputedStyle(el, '::before').color)).toMatch(/0\.7\)$/)  // white at 70%
})

// nu-grid under Forest (the layer's app.config `nuGrid`): color from Forest through Nuxt UI's tokens, geometry left to
// nu-grid's own themes, and the colored-edge rule on group bands — neutral band, 3px accent leading edge.
/** A grouped grid's group band and its leading-edge cell, found from a group label. */
const groupBand = (page: Page, grid: string) => page.locator(`[data-grid="${grid}"]`).evaluate((root) => {
  const label = [...root.querySelectorAll('*')].find((e) => e.children.length === 0 && /^(design|platform)/i.test(e.textContent!.trim()) && e.closest('[class*="sticky"]'))!
  const left = label.closest('[class*="sticky"]') as HTMLElement
  const band = left.parentElement as HTMLElement
  const probe = (v: string) => { const d = document.createElement('div'); d.style.backgroundColor = v; document.body.append(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c }
  return {
    band: getComputedStyle(band).backgroundColor,
    neutralBand: probe('color-mix(in oklab, var(--ui-bg-elevated) 50%, transparent)'),
    accentClasses: band.className.split(/\s+/).filter((c) => /bg-primary/.test(c)),
    edgeWidth: getComputedStyle(left).borderLeftWidth,
    edgeColor: getComputedStyle(left).borderLeftColor,
  }
})

test('grid: all three render, and cells use tabular figures', async ({ page }) => {
  for (const g of ['default', 'default-grouped', 'compact-grouped']) {
    await expect(page.locator(`[data-grid="${g}"] [data-row-id]`).first()).toBeVisible()
    expect(await page.locator(`[data-grid="${g}"] [data-row-id] > *`).first().evaluate((el) => getComputedStyle(el).fontVariantNumeric), g).toBe('tabular-nums')
  }
})

for (const mode of ['light', 'dark']) {
  test(`grid group bands (${mode}): neutral, with a 3px accent leading edge, on both nu-grid themes`, async ({ page }) => {
    if (mode === 'dark') {
      await page.getByLabel('Dark mode').click()
      await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true)
    }
    await expect(page.locator('[data-grid="compact-grouped"] [data-row-id]').first()).toBeVisible()
    const primary = await ramp(page, '--ui-primary')
    for (const g of ['default-grouped', 'compact-grouped']) {
      const b = await groupBand(page, g)
      // never a large area of accent: nu-grid tints the band bg-primary/10 ('default') and, in dark,
      // dark:bg-primary/12 ('compact') — both must be replaced, not merely outranked
      expect(b.accentClasses, `${g} band classes`).toEqual([])
      expect(b.band, `${g} band`).toBe(b.neutralBand)
      expect({ width: b.edgeWidth, color: b.edgeColor }, `${g} edge`).toEqual({ width: '3px', color: primary })
    }
  })
}
