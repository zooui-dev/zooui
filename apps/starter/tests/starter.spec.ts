import { expect, test } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

/** Runs in the page. Every rendered element with its own text whose OpenType set is not the one its face's role
 *  declares (read from Forest's six --zoo-* hooks, so it holds for the theme's faces and any font package that
 *  overrides them). Two roles on one family with different sets can't be told apart by face, so that pair is
 *  reported rather than merged. Self-contained: page.evaluate serializes it. */
function findFaceMismatches(): string[] {
  const probe = document.body.appendChild(document.createElement('div'))
  const first = (stack: string) => stack.split(',')[0]!.trim()
  const roles = new Map<string, { role: string, features: string }>()
  const out = new Set<string>()
  for (const role of ['sans', 'mono', 'display']) {
    probe.style.fontFamily = `var(--zoo-font-${role})`
    probe.style.fontFeatureSettings = `var(--zoo-features-${role})`
    const s = getComputedStyle(probe)
    const seen = roles.get(first(s.fontFamily))
    if (!seen) roles.set(first(s.fontFamily), { role, features: s.fontFeatureSettings })
    else if (seen.features !== s.fontFeatureSettings) out.add(`${seen.role} and ${role} share ${first(s.fontFamily)} with different sets: elements cannot be judged by face`)
  }
  probe.remove()
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('svg') || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())) continue
    const s = getComputedStyle(el)
    if (s.display === 'none' || s.visibility === 'hidden') continue
    const expected = roles.get(first(s.fontFamily))
    if (expected && expected.features !== s.fontFeatureSettings) out.add(`${first(s.fontFamily)} with ${s.fontFeatureSettings} on <${el.tagName.toLowerCase()}>`)
  }
  return [...out]
}

// What every Forest product should assert, per page: it renders cleanly, in Forest's faces, with no element
// carrying two same-property utilities and every text element in its own face's OpenType set.
test('the page renders on the layer, and both guards pass', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: 'Workspace settings' })).toBeVisible()
  expect(await page.evaluate(findConflicts)).toEqual([])
  expect(await page.evaluate(findFaceMismatches)).toEqual([])
  expect(errors).toEqual([])
})

// Forest's faces: Inter for the page and the display heading (at 500, tracked −0.025em), JetBrains Mono with its
// code ligatures off for code, both served from the build; no AT face, file or font CDN anywhere.
test('Forest\'s faces: Inter and JetBrains Mono, from the build, and nothing else', async ({ page }) => {
  const requests: { url: string, type: string }[] = []
  page.on('request', (r) => requests.push({ url: r.url(), type: r.resourceType() }))
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const r = await page.evaluate(async () => {
    await document.fonts.ready
    const s = (el: Element) => getComputedStyle(el)
    const h1 = document.querySelector('h1')!
    return {
      body: [s(document.body).fontFamily.split(',')[0], s(document.body).fontFeatureSettings],
      h1: [s(h1).fontFamily.split(',')[0], s(h1).fontWeight, (parseFloat(s(h1).letterSpacing) / parseFloat(s(h1).fontSize)).toFixed(3)],
      code: [s(document.querySelector('code')!).fontFamily.split(',')[0], s(document.querySelector('code')!).fontFeatureSettings],
      families: [...new Set([...document.fonts].map((f) => f.family.replace(/"/g, '')))].sort(),
      loaded: [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')))].sort(),
    }
  })
  expect(r.body).toEqual(['"Inter Variable"', 'normal'])
  expect(r.h1).toEqual(['"Inter Variable"', '500', '-0.025'])
  expect(r.code).toEqual(['"JetBrains Mono Variable"', '"calt" 0'])
  expect(r.families).toEqual(['Inter Variable', 'JetBrains Mono Variable'])
  expect(r.loaded).toEqual(['Inter Variable', 'JetBrains Mono Variable'])
  const fonts = requests.filter((q) => q.type === 'font').map((q) => new URL(q.url).pathname)
  expect(fonts.length).toBeGreaterThan(0)
  for (const p of fonts) expect(p).toMatch(/^\/_nuxt\/(inter-[a-z-]+-opsz|jetbrains-mono-[a-z-]+-wght)-(normal|italic)\.[\w-]+\.woff2$/)
  expect(requests.filter((q) => /AT(%20)?(Name|Lang)|fonts\.(googleapis|gstatic|bunny)\./i.test(q.url))).toEqual([])
})

// Nuxt UI arrives through the layer — this app never installs it — and it is already Forest: the primary
// button is the scheme's accent (Slate · Cobalt's 500, the raw ramp), not Nuxt UI's default green.
test('Nuxt UI comes from the layer, themed to the scheme', async ({ page }) => {
  await page.goto('/')
  const bg = await page.getByRole('button', { name: 'Save' }).evaluate((el) => getComputedStyle(el).backgroundColor)
  const accent = await page.evaluate(() => {
    const probe = document.createElement('div'); probe.style.background = 'var(--teal-500)'; document.body.append(probe)
    const c = getComputedStyle(probe).backgroundColor; probe.remove(); return c
  })
  expect(bg).toBe(accent)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Settings saved', { exact: true })).toBeVisible()
})

test('ZModal: opens as a dialog, with the error edge, and closes', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Delete workspace' }).click()
  const dialog = page.getByRole('dialog', { name: 'Delete this workspace?' })
  await expect(dialog).toBeVisible()
  expect(await dialog.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('3px')
  await dialog.getByRole('button', { name: 'Keep it' }).click()
  await expect(dialog).toHaveCount(0)
})
