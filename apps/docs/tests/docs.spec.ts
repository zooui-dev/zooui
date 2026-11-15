import { expect, test, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'
import { html, LAYER_COMPONENTS, ROUTES } from './site'

// The generated site (.output/public), as Netlify will serve it: every page renders cleanly and passes the layer's
// guard, every live example mounts, the API tables carry the components' real props, and every internal link lands.

const COMPONENT_ROUTES = ROUTES.filter((r) => r.startsWith('/components/'))

/** Open a page and wait until it has hydrated: the header's theme toggle is client-only, so its buttons enable then. */
async function open(page: Page, route: string) {
  const errors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  const response = await page.goto(route)
  expect(response?.status(), `${route} status`).toBe(200)
  await expect(page.getByRole('group', { name: 'Theme' }).first().getByRole('button', { name: 'light' })).toBeEnabled()
  await page.waitForLoadState('networkidle')
  return errors
}

test('the site has the pages it should', () => {
  expect(ROUTES).toEqual(expect.arrayContaining(['/', '/guide/getting-started', '/guide/theming', '/components']))
})

for (const route of ROUTES) {
  test(`${route} renders without console errors and passes find-conflicts`, async ({ page }) => {
    const errors = await open(page, route)
    await expect(page.locator('h1').first()).toBeVisible()
    expect(await page.evaluate(findConflicts)).toEqual([])
    expect(errors).toEqual([])
  })
}

test('every Z* component in the layer has a page', () => {
  const documented = COMPONENT_ROUTES.map((r) => html(r).match(/data-api="(Z\w+)"/)?.[1]).filter(Boolean)
  expect(documented.sort()).toEqual(LAYER_COMPONENTS.map((c) => c.name).sort())
})

for (const route of COMPONENT_ROUTES) {
  test(`${route}: the live examples mount and the API table lists the component's real props`, async ({ page }) => {
    await open(page, route)

    const examples = page.locator('[data-example]')
    expect(await examples.count(), 'a component page has at least one live example').toBeGreaterThan(0)
    for (const example of await examples.all()) {
      await expect(example, `${await example.getAttribute('data-example')} mounted`).toHaveAttribute('data-mounted', 'true')
      await expect(example.locator('[data-example-preview]')).not.toBeEmpty()
      await expect(example.locator('[data-example-source] pre')).toContainText('<template>')
    }

    const name = await page.locator('[data-api]').getAttribute('data-api')
    const component = LAYER_COMPONENTS.find((c) => c.name === name)
    expect(component, `${name} is a component of @zooui/nuxt`).toBeDefined()
    const listed = (await page.locator('[data-api-table="props"] [data-prop]').allTextContents()).map((t) => t.trim()).sort()
    expect(listed, `props of ${component!.file}`).toEqual(component!.props)
    if (!component!.props.length) await expect(page.locator('[data-api-empty="props"]')).toBeVisible()
  })
}

test('every internal link resolves, anchors included', () => {
  const broken: string[] = []
  for (const route of ROUTES) {
    for (const [, href] of html(route).matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
      if (!href!.startsWith('/') && !href!.startsWith('#')) continue
      const [path = '', hash] = href!.split('#')
      const target = path === '' ? route : path.replace(/(.)\/$/, '$1')
      if (!ROUTES.includes(target)) { broken.push(`${route} → ${href} (no page)`); continue }
      if (hash && !html(target).includes(`id="${decodeURIComponent(hash)}"`)) broken.push(`${route} → ${href} (no #${hash})`)
    }
  }
  expect(broken).toEqual([])
})

test('the scheme picker repaints the page and the choice survives a reload', async ({ page }) => {
  await open(page, '/')
  const primary = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-color-primary-500').trim())
  const teal = await primary()

  await page.locator('[data-scheme-picker]').click()
  await page.getByRole('menuitemcheckbox', { name: 'Ember · Amber' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-scheme', 'ember')
  const ember = await primary()
  expect(ember).not.toBe(teal)

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-scheme', 'ember')
  expect(await primary()).toBe(ember)
  await expect(page.locator('[data-scheme-picker]')).toContainText('Ember · Amber')
})

test('an unknown address gets the 404 page', async ({ page }) => {
  const response = await page.goto('/no/such/page')
  expect(response?.status()).toBe(404)
  await expect(page.locator('[data-error-page]')).toContainText('Page not found')
})
