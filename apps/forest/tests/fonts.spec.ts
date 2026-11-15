import { expect, test, type Page } from '@playwright/test'
import { findFaceMismatches, roleFaces } from './faces'

// Forest's typefaces: Inter for the interface and display, JetBrains Mono for code and values, self-hosted from
// fontsource, each with the OpenType set read off its files (theme.css), behind six --zoo-* role hooks that a font
// package (a licensed one) overrides. No AT face, file or URL may reach the page.

const INTER = '"Inter Variable"'
const MONO = '"JetBrains Mono Variable"'
const MONO_SET = '"calt" 0'   // JetBrains Mono's code ligatures, which all live in calt, off

/** Open the page, recording every request it makes from the first byte. */
async function open(page: Page) {
  const requests: { url: string, type: string }[] = []
  page.on('request', (r) => requests.push({ url: r.url(), type: r.resourceType() }))
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  return requests
}

test('Inter and JetBrains Mono load from the build and take their roles', async ({ page }) => {
  const requests = await open(page)
  const r = await page.evaluate(async () => {
    const code = document.body.appendChild(document.createElement('code'))
    code.textContent = 'x'
    await document.fonts.ready
    const out = {
      body: getComputedStyle(document.body).fontFamily,
      button: getComputedStyle(document.querySelector('section#buttons button')!).fontFamily,
      code: getComputedStyle(code).fontFamily,
      kbd: getComputedStyle(document.querySelector('kbd')!).fontFamily,
      loaded: [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')))].sort(),
    }
    code.remove()
    return out
  })
  const roles = await page.evaluate(roleFaces)
  expect(roles.sans!.family).toMatch(new RegExp(`^${INTER}, `))
  expect(roles.display!.family).toMatch(new RegExp(`^${INTER}, `))
  expect(roles.mono!.family).toMatch(new RegExp(`^${MONO}, `))
  expect(r.body).toBe(roles.sans!.family)
  expect(r.button).toBe(roles.sans!.family)
  expect(r.code).toBe(roles.mono!.family)
  expect(r.kbd).toBe(roles.mono!.family)
  expect(r.loaded).toEqual(expect.arrayContaining(['Inter Variable', 'JetBrains Mono Variable']))
  expect(r.loaded).not.toContain('Public Sans')   // @nuxt/fonts is off: nothing fetched Nuxt UI's default
  // served by this app, from fontsource's files: the latin subset of each
  const fonts = requests.filter((q) => q.type === 'font').map((q) => new URL(q.url).pathname)
  expect(fonts.some((p) => /\/inter-latin-opsz-normal\.[\w-]+\.woff2$/.test(p))).toBe(true)
  expect(fonts.some((p) => /\/jetbrains-mono-latin-wght-normal\.[\w-]+\.woff2$/.test(p))).toBe(true)
})

test('no AT face is declared and no AT file, or any font from elsewhere, is requested', async ({ page }) => {
  const requests = await open(page)
  // walk every font weight and style the page could ask for, so a declared-but-unused face would be fetched too
  const families = await page.evaluate(async () => {
    await Promise.all(['400 14px', '600 14px', 'italic 400 14px'].flatMap((f) => [...new Set([...document.fonts].map((x) => x.family))].map((fam) => document.fonts.load(`${f} ${fam}`))))
    return [...new Set([...document.fonts].map((f) => f.family.replace(/"/g, '')))].sort()
  })
  await page.waitForLoadState('networkidle')
  expect(families).toEqual(['Inter Variable', 'JetBrains Mono Variable'])
  expect(requests.filter((q) => /AT(%20)?(Name|Lang)/i.test(q.url))).toEqual([])
  expect(requests.filter((q) => /fonts\.(googleapis|gstatic|bunny)\./.test(q.url))).toEqual([])
  const origin = new URL(page.url()).origin
  for (const q of requests.filter((x) => x.type === 'font')) {
    expect(q.url.startsWith(`${origin}/_nuxt/`), q.url).toBe(true)
    expect(new URL(q.url).pathname, q.url).toMatch(/\/(inter-[a-z-]+-opsz|jetbrains-mono-[a-z-]+-wght)-(normal|italic)\.[\w-]+\.woff2$/)
  }
})

test('Inter: the drawn italic and the optical-size axis both work', async ({ page }) => {
  const requests = await open(page)
  const r = await page.evaluate(async () => {
    // the face the browser matches for italic text: the italic file, not the upright one slanted
    const italic = (await document.fonts.load(`italic 400 16px "Inter Variable"`, 'Ag')).map((f) => f.style)
    await document.fonts.load(`400 32px "Inter Variable"`, 'Hamburgefonstiv')
    // opsz follows font-size under font-optical-sizing: auto, so a 32px line sets Inter's display cut, tighter than
    // the 14px text cut that `none` pins. With a wght-only build the two would measure the same.
    const width = (size: number, sizing: string) => {
      const s = document.body.appendChild(document.createElement('span'))
      s.textContent = 'Hamburgefonstiv'
      s.style.cssText = `font: 400 ${size}px "Inter Variable"; font-optical-sizing: ${sizing}; position: absolute; white-space: nowrap`
      const w = s.getBoundingClientRect().width
      s.remove()
      return w
    }
    return { italic, display: [width(32, 'auto'), width(32, 'none')], text: [width(14, 'auto'), width(14, 'none')] }
  })
  expect(r.italic).toEqual(['italic'])
  expect(r.display[0]).toBeLessThan(r.display[1]! - 2)
  expect(r.text[0]).toBeCloseTo(r.text[1]!, 1)   // at opsz's default (14) the two agree: the axis, not noise
  await page.waitForLoadState('networkidle')
  expect(requests.some((q) => /\/inter-latin-opsz-italic\.[\w-]+\.woff2$/.test(q.url))).toBe(true)
})

test('each role computes its own set: Inter normal, JetBrains Mono with calt off; tabular figures in tables', async ({ page }) => {
  await open(page)
  const r = await page.evaluate(() => {
    const code = document.body.appendChild(document.createElement('code'))
    code.textContent = 'x'
    const out = {
      body: getComputedStyle(document.body).fontFeatureSettings,
      code: getComputedStyle(code).fontFeatureSettings,
      kbd: getComputedStyle(document.querySelector('kbd')!).fontFeatureSettings,
      td: getComputedStyle(document.querySelector('section#data table td')!).fontVariantNumeric,
    }
    code.remove()
    return out
  })
  const roles = await page.evaluate(roleFaces)
  expect(roles.sans!.features).toBe('normal')
  expect(roles.display!.features).toBe('normal')
  expect(roles.mono!.features).toBe(MONO_SET)
  expect(r).toEqual({ body: 'normal', code: MONO_SET, kbd: MONO_SET, td: 'tabular-nums' })
  // every rendered element, bare `font-mono` utilities (badges, the kicker) included
  expect(await page.evaluate(findFaceMismatches)).toEqual([])
})

// Sans and display are both Inter. Give display a set of its own and the face alone no longer says which role an
// element is in: the guard must say so, not merge the two sets and pass whichever an element carries.
test('the face guard reports two roles on one family with different sets', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    const style = document.head.appendChild(document.createElement('style'))
    style.textContent = ':root { --zoo-features-display: "ss01"; }'
  })
  const lines = await page.evaluate(findFaceMismatches)
  expect(lines.filter((l) => l.startsWith(`sans and display share ${INTER} with different sets`))).toHaveLength(1)
})

// Ligatures are judged by the pixels: JetBrains Mono's ligatures keep the cell width, so no measurement can tell
// them apart. ONE code element, in one place, rendered as the theme sets it, then with calt forced on and off.
test('mono: code ligatures are off, so -> => != render as typed', async ({ page }) => {
  await open(page)
  await page.evaluate(async () => {
    const c = document.body.appendChild(document.createElement('code'))
    c.dataset.lig = ''
    c.textContent = '-> => != === <= >= |>'
    c.style.cssText = 'position: fixed; left: 0; bottom: 0; z-index: 100000; padding: 4px; font-size: 24px; line-height: 32px; background: white; color: black; white-space: pre'
    await document.fonts.load(`24px "JetBrains Mono Variable"`, '->')
    await document.fonts.ready
  })
  const code = page.locator('[data-lig]')
  const shot = async (calt: string) => {
    await code.evaluate((el, v) => { (el as HTMLElement).style.fontFeatureSettings = v }, calt)
    return code.screenshot({ animations: 'disabled' })
  }
  const themed = await shot('')
  const on = await shot('"calt" 1')
  const off = await shot('"calt" 0')
  expect(on.equals(off)).toBe(false)   // the font has ligatures to turn off: the check can fail
  expect(themed.equals(off)).toBe(true)
  expect(themed.equals(on)).toBe(false)
})

// The override contract a licensed face package relies on. Forest declares the six hooks' defaults in a cascade
// layer, so an UNLAYERED stylesheet setting them wins in either order: after forest, as documented, and before it.
// Before is the case the layer exists for: were the defaults unlayered, forest's later :root would beat it.
const STANDIN = {
  '--zoo-font-sans': 'Georgia, serif',
  '--zoo-font-display': '"Times New Roman", serif',
  '--zoo-font-mono': '"Courier New", monospace',
  '--zoo-features-sans': '"ss02"',
  '--zoo-features-display': '"ss03"',
  '--zoo-features-mono': '"zero"',
}

for (const where of ['after', 'before'] as const) {
  test(`contract: the six --zoo-* hooks, set by a stylesheet ${where} forest's, win`, async ({ page }) => {
    await open(page)
    const r = await page.evaluate(([decls, where]) => {
      const style = document.createElement('style')
      style.textContent = `:root { ${Object.entries(decls).map(([k, v]) => `${k}: ${v};`).join(' ')} }`
      if (where === 'after') document.head.append(style)
      else document.head.prepend(style)
      const code = document.body.appendChild(document.createElement('code'))
      code.textContent = 'x'
      // the display role through its Tailwind token, as `font-display` reads it
      const display = document.body.appendChild(document.createElement('div'))
      display.className = 'font-display'
      display.textContent = 'x'
      const pick = (el: Element) => { const s = getComputedStyle(el); return { family: s.fontFamily, features: s.fontFeatureSettings } }
      const out = {
        sans: pick(document.body),
        button: pick(document.querySelector('section#buttons button')!),
        display: pick(display),
        mono: pick(code),
        kbd: pick(document.querySelector('kbd')!),
      }
      code.remove(); display.remove()
      return out
    }, [STANDIN, where] as const)
    const sans = { family: 'Georgia, serif', features: '"ss02"' }
    const mono = { family: '"Courier New", monospace', features: '"zero"' }
    expect(r).toEqual({
      sans, button: sans,
      display: { family: '"Times New Roman", serif', features: '"ss03"' },
      mono, kbd: mono,
    })
  })
}
