import { expect, test, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'
import { findFaceMismatches } from './faces'

// Forest's own components (ZKicker, ZIdentifier, ZStatus, ZQuotaMeter, ZCodeBlock, ZTokenReveal, ZEcosystemMark,
// ZThemeToggle), the places it sets
// Nuxt UI in the mono face, and the two guards every Forest product runs.

const MONO = '"JetBrains Mono Variable"'
const MONO_SET = '"calt" 0'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
})

const setDark = async (page: Page) => {
  await page.evaluate(() => { localStorage.setItem('zooui-color-mode', 'dark') })
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page.locator('html')).toHaveClass(/dark/)
}

/** One contrast check: a label for the report, the element whose text is measured, and where its background is read
 *  ('self' starts at the element, 'parent' at its parent; either walks up past transparent ancestors). */
type Check = [label: string, selector: string, bgOf?: 'self' | 'parent']

/** Contrast of each element's text against its background, all in ONE page.evaluate (a round trip per element made
 *  a per-scheme test too slow for CI). Colors go through a canvas pixel, since computed colors can be oklch or
 *  color-mix, which no regex parses. A selector that matches nothing throws, so a missing element can never pass. */
const contrasts = (page: Page, checks: Check[]) => page.evaluate((list) => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  const rgb = (c: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3) }
  const lum = (c: number[]) => c.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i]!, 0)
  return Object.fromEntries(list.map(([label, sel, which]) => {
    const el = document.querySelector(sel)
    if (!el) throw new Error(`contrast: nothing matches ${sel} (${label})`)
    let bgEl: Element | null = which === 'parent' ? el.parentElement : el
    let bg = 'rgba(0, 0, 0, 0)'
    while (bgEl) { bg = getComputedStyle(bgEl).backgroundColor; if (!/rgba\(.*, 0\)$|transparent/.test(bg)) break; bgEl = bgEl.parentElement }
    const [a, b] = [lum(rgb(getComputedStyle(el).color)), lum(rgb(bg))]
    return [label, (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)]
  }))
}, checks)

/** The checks below 4.5:1, so a failure names every offender at once. The RAW ratio is compared — rounding first
 *  would pass anything from 4.495 — and only the reported value is rounded, for reading. */
const belowAA = (ratios: Record<string, number>) =>
  Object.entries(ratios).filter(([, r]) => r < 4.5).map(([label, r]) => [label, Math.floor(r * 100) / 100] as const)

/** Put the page on one scheme and theme with a single reload: the scheme cookie and the stored theme first. */
async function onScheme(page: Page, scheme: string, mode: 'light' | 'dark') {
  await page.context().addCookies([{ name: 'zooui-scheme', value: scheme, url: page.url() }])
  await page.evaluate((m) => localStorage.setItem('zooui-color-mode', m), mode)
  await page.reload()
  await page.waitForLoadState('networkidle')
  if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
  else await expect(page.locator('html')).not.toHaveClass(/dark/)
}

for (const mode of ['light', 'dark'] as const) {
  test(`guards (${mode}): no element carries two same-property utilities, and every face has its own set`, async ({ page }) => {
    if (mode === 'dark') await setDark(page)
    await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(findConflicts)).toEqual([])
    expect(await page.evaluate(findFaceMismatches)).toEqual([])
  })
}

test('the mono face where Forest sets values: badges, table headers, keyboard keys', async ({ page }) => {
  const faces = await page.evaluate(() => {
    const one = (el: Element) => { const s = getComputedStyle(el); return `${s.fontFamily.split(',')[0]} ${s.fontFeatureSettings}` }
    return {
      badge: [...document.querySelectorAll('section#feedback span, section#data span')]
        .filter((e) => (e as HTMLElement).dataset.slot === 'base' || /\binline-flex\b.*\bfont-medium\b|\bfont-medium\b.*\binline-flex\b/.test(e.className))
        .filter((e) => !e.closest('button, a, th, td')).slice(0, 1).map(one),
      th: [...document.querySelectorAll('section#data table th')].slice(0, 1).map(one),
      thTransform: getComputedStyle(document.querySelector('section#data table th')!).textTransform,
      kbd: [...document.querySelectorAll('kbd')].slice(0, 1).map(one),
    }
  })
  for (const key of ['badge', 'th', 'kbd'] as const) {
    expect(faces[key], key).toHaveLength(1)
    expect(faces[key][0], key).toBe(`${MONO} ${MONO_SET}`)
  }
  expect(faces.thTransform).toBe('uppercase')
})

test('ZKicker: mono, uppercase, bracketed in the primary', async ({ page }) => {
  const k = await page.locator('[data-specimen="kicker"]').evaluate((el) => {
    const s = getComputedStyle(el), b = getComputedStyle(el, '::before')
    return { family: s.fontFamily, features: s.fontFeatureSettings, transform: s.textTransform, before: b.content, beforeColor: b.color }
  })
  const primary = await page.evaluate(() => { const d = document.createElement('div'); d.style.color = 'var(--ui-primary)'; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c })
  expect(k.family).toMatch(new RegExp(`^${MONO}`))
  expect(k.features).toBe(MONO_SET)
  expect(k.transform).toBe('uppercase')
  expect(k.before).toBe('"[ "')
  expect(k.beforeColor).toBe(primary)
})

// Every scheme, both themes: the accent ink is the one that moves, and Forest's six accents differ most in how dark
// their 500 is (Teal's would not clear 4.5:1 as text on the chip, Ink · Indigo's would).
const SCHEMES = ['teal', 'slate-cobalt', 'graphite-violet', 'paper-olive', 'ink-indigo', 'ember']
// One test per scheme and theme: one reload and one batched read each, so no test grows with the scheme list.
for (const mode of ['light', 'dark'] as const) {
  test.describe(`ZIdentifier, ZStatus, the eyebrow and slot chips (${mode}): every ink clears 4.5:1 on its surface`, () => {
    for (const scheme of SCHEMES) {
      test(scheme, async ({ page }) => {
        await onScheme(page, scheme, mode)
        const checks: Check[] = [
          ...['package', 'version', 'hash'].map((kind): Check => [kind, `[data-specimen="ident-${kind}"]`]),
          ...['healthy', 'warn', 'suspended', 'unreachable', 'quiet'].map((state): Check => [state, `[data-status="${state}"]`, 'parent']),
          // the eyebrow's accent ink, and both kinds of slot chip
          ['eyebrow', '[data-specimen="eyebrow"]'],
          ['slot open', '[data-specimen="slots"] [data-available="true"]'],
          ['slot held', '[data-specimen="slots"] [data-available="false"]'],
        ]
        const ratios = await contrasts(page, checks)
        // every check measured: labels are unique, so a dropped one would shrink the result
        expect(Object.keys(ratios)).toEqual(checks.map(([label]) => label))
        expect(belowAA(ratios)).toEqual([])
      })
    }
  })
}

// The eyebrow kicker, the healthy glow, the slot chips and the nav's current-page marker, on the default scheme in dark.
const colorOf = (page: Page, value: string) => page.evaluate((v) => {
  const d = document.createElement('div'); d.style.color = v; document.body.append(d)
  const c = getComputedStyle(d).color; d.remove(); return c
}, value)

test.describe('eyebrow, glow, slot chips and the nav marker (dark)', () => {
  test.beforeEach(async ({ page }) => { await setDark(page) })

  test('eyebrow kicker: mono, uppercase, the label in the accent ink, no brackets', async ({ page }) => {
    const k = await page.locator('[data-specimen="eyebrow"]').evaluate((el) => {
      const s = getComputedStyle(el)
      return { family: s.fontFamily.split(',')[0], transform: s.textTransform, color: s.color, before: getComputedStyle(el, '::before').content }
    })
    expect(k).toEqual({ family: MONO, transform: 'uppercase', color: await colorOf(page, 'var(--ui-color-primary-300)'), before: 'none' })
  })

  test('glow: the healthy dot is lit in its own color; other states are not', async ({ page }) => {
    const shadow = (state: string) => page.locator(`[data-status-glow="${state}"] > span[aria-hidden]`).evaluate((el) => getComputedStyle(el).boxShadow)
    // Tailwind composes shadows with transparent ring layers, so the glow is one entry in the list
    expect(await shadow('healthy')).toContain(`${await colorOf(page, 'var(--ui-success)')} 0px 0px 12px 0px`)
    expect(await shadow('warn')).not.toContain('12px')
  })

  test('slot chips: each names its slot; open ones solid primary, held ones outlined', async ({ page }) => {
    const list = page.getByRole('list', { name: 'Linux VMs: 2 of 3 free' })
    await expect(list.getByRole('listitem')).toHaveText(['slot 1 · free', 'slot 2 · build 4812', 'slot 3 · free'])
    const look = (open: string) => list.locator(`[data-available="${open}"]`).first().evaluate((el) => {
      const s = getComputedStyle(el); return { bg: s.backgroundColor, color: s.color, family: s.fontFamily.split(',')[0] }
    })
    expect(await look('true')).toEqual({ bg: await colorOf(page, 'var(--ui-primary)'), color: await colorOf(page, 'var(--ui-text-inverted)'), family: MONO })
    expect(await look('false')).toEqual({ bg: await colorOf(page, 'var(--ui-bg)'), color: await colorOf(page, 'var(--ui-text)'), family: MONO })
    await expect(list.locator('[title="Held since 09:41"]')).toHaveText('slot 2 · build 4812')
  })

  const marker = (page: Page, name: string) => page.locator('[data-specimen="nav"]').getByRole('link', { name }).evaluate((el) => {
    const s = getComputedStyle(el), a = getComputedStyle(el, '::after')
    return { weight: s.fontWeight, bar: a.height, barColor: a.backgroundColor, pill: getComputedStyle(el, '::before').backgroundColor }
  })

  test('nav marker: with no variables set, a highlighted menu keeps Nuxt UI\'s 1px bar and medium current item', async ({ page }) => {
    expect(await marker(page, 'Fleet')).toMatchObject({ weight: '500', bar: '1px' })
  })

  test('nav marker: a product setting the two variables gets a bold current item over a 2px primary bar, with no pill', async ({ page }) => {
    await page.addStyleTag({ content: ':root { --nav-highlight-size: 2px; --nav-current-weight: 700; }' })
    const current = await marker(page, 'Fleet')
    expect(current.weight).toBe('700')
    expect(current.bar).toBe('2px')
    expect(current.barColor).toBe(await colorOf(page, 'var(--ui-primary)'))
    expect(current.pill).toBe('rgba(0, 0, 0, 0)')   // link variant: no pill behind the current item
    expect((await marker(page, 'Runs')).weight).toBe('500')   // only the current page
  })
})

test('ZStatus: the shape carries the state, so it survives grayscale', async ({ page }) => {
  const shapes = await page.evaluate(() => Object.fromEntries(
    ['healthy', 'warn', 'suspended', 'unreachable', 'quiet'].map((s) => {
      const g = document.querySelector(`[data-status="${s}"] > span[aria-hidden]`)!
      const c = getComputedStyle(g)
      // `rounded-full` is calc(infinity * 1px) in Tailwind 4, so a circle is any radius of at least half its width
      const radius = parseFloat(c.borderTopLeftRadius) >= 5 ? 'round' : c.borderTopLeftRadius
      return [s, { w: c.width, radius, style: c.borderTopStyle, bottom: c.borderBottomWidth, side: c.borderLeftColor, label: g.parentElement!.textContent!.trim() }]
    })))
  expect(shapes.healthy).toMatchObject({ w: '10px', radius: 'round', label: 'Healthy' })      // filled circle
  expect(shapes.warn).toMatchObject({ side: 'rgba(0, 0, 0, 0)', bottom: '10px', label: 'Near limit' }) // triangle: clear sides, a 10px base
  expect(shapes.suspended).toMatchObject({ w: '10px', radius: '1px', label: 'Suspended' }) // square
  expect(shapes.unreachable).toMatchObject({ radius: 'round', style: 'dashed', label: 'Unreachable' })
  expect(shapes.quiet).toMatchObject({ radius: 'round', style: 'solid', label: 'Quiet' })   // hollow ring
  // five shapes, five different signatures
  expect(new Set(Object.values(shapes).map((s) => `${s.radius}|${s.style}|${s.bottom}|${s.side}`)).size).toBe(5)
})

test('ZQuotaMeter: a meter with its values, amber from the mark, red and hatched over the limit', async ({ page }) => {
  const m = await page.evaluate(() => Object.fromEntries(['ok', 'warn', 'over'].map((l) => {
    const el = document.querySelector(`[data-meter="${l}"]`)!
    const fill = el.querySelector(':scope > span > span')!   // root > track > fill
    const probe = (v: string) => { const d = document.createElement('div'); d.style.backgroundColor = v; document.body.append(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c }
    return [l, {
      role: el.getAttribute('role'), now: el.getAttribute('aria-valuenow'), max: el.getAttribute('aria-valuemax'),
      width: (fill as HTMLElement).style.width, bg: getComputedStyle(fill).backgroundColor,
      hatch: getComputedStyle(fill).backgroundImage, warning: probe('var(--ui-warning)'), error: probe('var(--ui-error)'),
    }]
  })))
  expect(m.ok).toMatchObject({ role: 'meter', now: '3.2', max: '10', width: '32%', hatch: 'none' })
  const { warn, over } = m as Required<typeof m>
  expect(warn!.bg).toBe(warn!.warning)
  expect(over!.bg).toBe(over!.error)
  expect(over!.width).toBe('100%')
  expect(over!.hatch).toContain('repeating-linear-gradient')
})

for (const mode of ['light', 'dark'] as const) {
  test(`ZCodeBlock (${mode}): near-black in both themes, mono, the token marked`, async ({ page }) => {
    if (mode === 'dark') await setDark(page)
    const c = await page.locator('[data-code="block"]').evaluate((el) => {
      const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
      ctx.fillStyle = getComputedStyle(el).backgroundColor; ctx.fillRect(0, 0, 1, 1)
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
      const tok = el.querySelector('pre span')
      return { maxChannel: Math.max(r!, g!, b!), family: getComputedStyle(el).fontFamily, features: getComputedStyle(el.querySelector('pre')!).fontFeatureSettings, tok: tok?.textContent, lang: el.textContent!.includes('npmrc') }
    })
    expect(c.maxChannel).toBeLessThan(60)
    expect(c.family).toMatch(new RegExp(`^${MONO}`))
    expect(c.features).toBe(MONO_SET)
    expect(c.tok).toBe('${NPM_TOKEN}')
    expect(c.lang).toBe(true)
  })
}

test('ZCodeBlock: copy puts the code on the clipboard and says so', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const block = page.locator('[data-code="line"]')
  await expect(block.getByText('$', { exact: true })).toBeVisible()
  await block.getByRole('button', { name: 'copy' }).click()
  await expect(block.getByRole('button', { name: 'copied' })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('pnpm add @zooui/theme-forest')
  await expect(block.getByRole('status')).toHaveText('Copied to clipboard')   // the label change alone is not announced
})

test('ZCodeBlock: a refused copy says so, and never claims "copied"', async ({ page }) => {
  await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('denied')) })
  const block = page.locator('[data-code="line"]')
  await block.getByRole('button', { name: 'copy' }).click()
  await expect(block.getByRole('button', { name: 'copy failed' })).toBeVisible()
  await expect(block.getByRole('status')).toHaveText(/Couldn't copy/)
  await expect(block.getByRole('button', { name: 'copied' })).toHaveCount(0)
})

const TOKEN = 'zoo_tok_7Qm2vX9kLr4TzW8nB3cYh6Jd'

for (const mode of ['light', 'dark'] as const) {
  test(`ZTokenReveal (${mode}): the token on the code surface, in a labeled region, with a warning banner`, async ({ page }) => {
    if (mode === 'dark') await setDark(page)
    const reveal = page.locator('[data-specimen="token-reveal"]')
    // a labeled region, named by its kicker
    await expect(page.getByRole('region', { name: 'token · ci-main · shown once' })).toBeVisible()
    // the secret is the whole token, marked, and selected in one click
    const tok = reveal.locator('[data-slot="secret"] pre span')
    await expect(tok).toHaveText(TOKEN)
    expect(await tok.evaluate((el) => getComputedStyle(el).userSelect)).toBe('all')
    await expect(reveal.getByText("You won't see this token again")).toBeVisible()
  })

  test.describe(`ZTokenReveal (${mode}): every ink clears 4.5:1`, () => {
    for (const scheme of SCHEMES) {
      test(scheme, async ({ page }) => {
        await onScheme(page, scheme, mode)
        const r = '[data-specimen="token-reveal"]'
        const ratios = await contrasts(page, [
          ['token', `${r} [data-slot="secret"] pre span`],
          ['kicker', `${r} > div:first-child`],
          ['warning title', `${r} [data-slot="title"]`],
          ['warning text', `${r} [data-slot="description"]`],
          ['ack button', `${r} button[data-slot="base"]`],
        ])
        expect(belowAA(ratios)).toEqual([])
      })
    }
  })
}

test('ZTokenReveal: copy puts the token on the clipboard, announces it, and emits copy', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const reveal = page.locator('[data-specimen="token-reveal"]')
  await reveal.getByRole('button', { name: 'copy' }).click()
  await expect(reveal.getByRole('button', { name: 'copied' })).toBeVisible()
  await expect(reveal.getByRole('status')).toHaveText('Copied to clipboard')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(TOKEN)
  await expect(page.locator('[data-specimen="token-events"]')).toHaveText('events: copy')
})

test('ZTokenReveal: acknowledging blurs the secret, takes it out of reach, keeps focus, and emits ack once', async ({ page }) => {
  const reveal = page.locator('[data-specimen="token-reveal"]')
  const secret = reveal.locator('[data-slot="secret"]')
  expect(await secret.evaluate((el) => getComputedStyle(el).filter)).toBe('none')
  const ack = reveal.getByRole('button', { name: 'I have saved it' })
  await ack.click()
  await ack.click()
  await expect(page.locator('[data-specimen="token-events"]')).toHaveText('events: ack')
  await expect(ack).toBeFocused()
  await expect(secret).toHaveAttribute('inert', '')
  await expect.poll(() => secret.evaluate((el) => getComputedStyle(el).filter)).toMatch(/^blur\(/)
  expect(await secret.evaluate((el) => getComputedStyle(el).userSelect)).toBe('none')
  // inert: the copy button can no longer take focus, so it is out of the tab order
  const copyButton = secret.locator('button')
  await copyButton.evaluate((el) => (el as HTMLElement).focus())
  await expect(copyButton).not.toBeFocused()
})

const ECOSYSTEMS = { npm: 'npm', nuget: 'NuGet', winget: 'winget', chocolatey: 'Chocolatey', scoop: 'Scoop', homebrew: 'Homebrew' }

test('ZEcosystemMark: an image named by its ecosystem, the monogram in mono, one corner shape each, three sizes', async ({ page }) => {
  for (const [id, label] of Object.entries(ECOSYSTEMS)) {
    await expect(page.locator(`[data-eco-specimen="${id}-sm"]`)).toHaveAttribute('role', 'img')
    await expect(page.locator(`[data-eco-specimen="${id}-sm"]`)).toHaveAccessibleName(label)
  }
  const tiles = await page.evaluate((ids) => Object.fromEntries(ids.map((id) => {
    const el = document.querySelector(`[data-eco-specimen="${id}-sm"]`)!
    const c = getComputedStyle(el)
    return [id, {
      corners: [c.borderTopLeftRadius, c.borderTopRightRadius, c.borderBottomRightRadius, c.borderBottomLeftRadius].join(' '),
      border: c.borderTopStyle, borderWidth: parseFloat(c.borderTopWidth), family: c.fontFamily, features: c.fontFeatureSettings, text: el.textContent,
      sizes: ['sm', 'md', 'lg'].map((s) => getComputedStyle(document.querySelector(`[data-eco-specimen="${id}-${s}"]`)!).width),
    }]
  })), Object.keys(ECOSYSTEMS))
  // six ecosystems, six corner geometries — they read apart without color
  expect(new Set(Object.values(tiles).map((t) => t.corners)).size).toBe(6)
  expect(tiles.npm!.corners).toBe('0px 0px 0px 0px')
  expect(tiles.nuget!.corners).toBe('50% 50% 50% 50%')
  for (const [id, t] of Object.entries(tiles)) {
    expect(t.border, id).toBe('solid')
    // authored 1.5px as core draws it; Chrome snaps border widths, so what it computes depends on the screen
    expect(t.borderWidth, id).toBeGreaterThanOrEqual(1)
    expect(t.borderWidth, id).toBeLessThanOrEqual(1.5)
    expect(t.family, id).toMatch(new RegExp(`^${MONO}`))
    expect(t.features, id).toBe(MONO_SET)
    expect(t.sizes, id).toEqual(['20px', '28px', '40px'])
  }
  expect(tiles.nuget!.text).toBe('nu')
})

test('ZEcosystemMark: with-label names it in text, disabled dashes it, and products can draw their own', async ({ page }) => {
  const labeled = page.locator('[data-eco-specimen="labeled"]')
  await expect(labeled).toHaveText('wgwinget')
  await expect(labeled.locator('[data-eco]')).toHaveAttribute('aria-hidden', 'true')   // the visible label names it
  await expect(page.locator('[data-eco-specimen="disabled-labeled"]')).toContainText('Scoop · soon')
  const disabled = page.locator('[data-eco-specimen="disabled"]')
  await expect(disabled).toHaveAccessibleName('Homebrew (soon)')
  expect(await disabled.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe('dashed')
  const custom = page.locator('[data-eco-specimen="custom"]')
  await expect(custom).toHaveAccessibleName('Cargo')
  await expect(custom).toHaveText('rs')
  // a custom ecosystem takes a named shape: lens is scoop's geometry
  const [lens, scoop] = await page.evaluate(() => ['custom', 'scoop-md'].map((id) => {
    const c = getComputedStyle(document.querySelector(`[data-eco-specimen="${id}"]`)!)
    return [c.borderTopLeftRadius, c.borderTopRightRadius, c.borderBottomRightRadius, c.borderBottomLeftRadius].join(' ')
  }))
  expect(lens).toBe(scoop)
  const unknown = page.locator('[data-eco-specimen="unknown"]')
  await expect(unknown).toHaveAccessibleName('pypi')
  await expect(unknown).toHaveText('py')
})

for (const mode of ['light', 'dark'] as const) {
  test.describe(`ZEcosystemMark (${mode}): monograms and labels clear 4.5:1, enabled and disabled`, () => {
    for (const scheme of SCHEMES) {
      test(scheme, async ({ page }) => {
        await onScheme(page, scheme, mode)
        const ratios = await contrasts(page, [
          ...['npm-sm', 'disabled', 'custom'].map((id): Check => [id, `[data-eco-specimen="${id}"]`]),
          ...['labeled', 'disabled-labeled'].map((id): Check => [`${id} label`, `[data-eco-specimen="${id}"] > span:last-child`]),
        ])
        expect(belowAA(ratios)).toEqual([])
      })
    }
  })
}

test('ZThemeToggle: one pressed choice, and it drives color-mode under the theme\'s key', async ({ page }) => {
  const group = page.locator('section#zoo').getByRole('group', { name: 'Theme' })
  await expect(group.getByRole('button')).toHaveCount(3)
  await group.getByRole('button', { name: 'dark' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  expect(await page.locator('html').getAttribute('data-theme')).toBeNull()   // the `dark` class only: no 1.x attribute
  await expect(group.getByRole('button', { name: 'dark' })).toHaveAttribute('aria-pressed', 'true')
  await expect(group.getByRole('button', { name: 'light' })).toHaveAttribute('aria-pressed', 'false')
  expect(await page.evaluate(() => localStorage.getItem('zooui-color-mode'))).toBe('dark')
  await group.getByRole('button', { name: 'light' }).click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
})
