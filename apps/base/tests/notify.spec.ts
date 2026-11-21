import { expect, test, type Locator, type Page } from '@playwright/test'

// useNotify() and errorMessage() on the theme-free base, in a production build (page: app/pages/notify.vue). Each tone's
// icon, color, title, description, close button and duration; `danger` as `error`; a caught error as the description,
// in every shape the page has and from a real $fetch; Nuxt UI's options passed through; this app's app.config (warning
// lasts 6000 ms, and its own error shape is read first); in light and dark.

async function open(page: Page, mode: 'light' | 'dark' = 'light') {
  await page.addInitScript((m) => localStorage.setItem('product-color-mode', m), mode)
  await page.goto('/notify')
  await page.waitForLoadState('networkidle')
  if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
}

const region = (page: Page) => page.getByRole('region', { name: /Notifications/ })
const toasts = (page: Page) => region(page).locator('li')
const live = (page: Page) => page.locator('[data-toasts] li')

/** Click until a toast appears: a click before hydration does nothing. */
async function raise(page: Page, selector: string, count = 1) {
  await expect(async () => {
    if (await toasts(page).count() < count) await page.locator(selector).click()
    await expect(toasts(page)).toHaveCount(count, { timeout: 1000 })
  }).toPass()
  return toasts(page).nth(count - 1)
}

/** The icon's ink against what `text-<color>` resolves to on this page: the tone's own color, not a neighbor's. */
const ink = (toast: Locator, color: string) => toast.locator('[data-slot="icon"]').evaluate((icon, c) => {
  const probe = document.createElement('span')
  probe.style.color = `var(--ui-${c})`
  document.body.append(probe)
  const want = getComputedStyle(probe).color
  probe.remove()
  return { got: getComputedStyle(icon).color, want }
}, color)

/** What an icon draws: its inline SVG, or in CSS mode (a masked span with no content) its `i-lucide:check` class. */
const drawing = (icon: Locator) => icon.evaluate((el) => el.innerHTML || [...el.classList].find((c) => /^i-[a-z0-9]+:[a-z0-9-]+$/.test(c)) || '')

/** The toast's icon is the one drawn for `name` in the page's legend. */
async function expectIcon(page: Page, toast: Locator, name: string) {
  const drawn = await drawing(page.locator(`[data-icon-ref="${name}"]`))
  expect(drawn, `the legend draws ${name}`).not.toBe('')
  expect(await drawing(toast.locator('[data-slot="icon"]')), `the toast draws ${name}`).toBe(drawn)
}

const TONES = [
  { tone: 'success', color: 'success', icon: 'i-lucide-check', title: 'Project saved', description: 'The Lakeside project is up to date.', duration: 3000 },
  { tone: 'info', color: 'info', icon: 'i-lucide-info', title: 'Sync started', description: 'Files appear as they arrive.', duration: 3000 },
  { tone: 'warning', color: 'warning', icon: 'i-lucide-triangle-alert', title: 'Two tasks have no owner', description: 'Assign them before the sprint starts.', duration: 6000 },
  { tone: 'error', color: 'error', icon: 'i-lucide-octagon-alert', title: 'Couldn’t save the project', description: 'The server didn’t answer.', duration: 3000 },
  { tone: 'primary', color: 'primary', icon: 'i-lucide-check', title: 'Invite sent', description: 'Sam will get an email.', duration: 3000 },
  { tone: 'danger', color: 'error', icon: 'i-lucide-octagon-alert', title: 'Couldn’t delete the file', description: 'It is open elsewhere.', duration: 3000 },
]

for (const mode of ['light', 'dark'] as const) {
  test.describe(`each tone, ${mode}`, () => {
    for (const t of TONES) {
      test(`notify.${t.tone}(): ${t.color}, ${t.icon}, title and description, ${t.duration} ms`, async ({ page }) => {
        await open(page, mode)
        const toast = await raise(page, `[data-notify="${t.tone}"]`)
        await expect(toast.locator('[data-slot="title"]')).toHaveText(t.title)
        await expect(toast.locator('[data-slot="description"]')).toHaveText(t.description)
        await expectIcon(page, toast, t.icon)
        await expect(toast.getByRole('button', { name: 'Close' })).toBeVisible()
        const { got, want } = await ink(toast, t.color)
        expect(got, `the icon is inked in ${t.color}`).toBe(want)
        await expect(live(page)).toHaveText([`${t.color} · ${t.icon} · ${t.duration}`])
      })
    }
  })
}

test('the toast is announced, title and description, in an assertive live region', async ({ page }) => {
  await open(page)
  // Nuxt UI's toaster (reka-ui) announces through a short-lived role="alert" element, gone within a second: record
  // every one that appears rather than race it. A toast is Nuxt UI's default "foreground" type, so it is assertive.
  await page.evaluate(() => {
    const seen: string[] = []
    ;(window as unknown as { announced: string[] }).announced = seen
    new MutationObserver(() => {
      for (const el of document.querySelectorAll('[role="alert"]')) seen.push(`${el.getAttribute('aria-live')}: ${el.textContent?.trim()}`)
    }).observe(document.body, { childList: true, subtree: true, characterData: true })
  })
  await raise(page, '[data-notify="success"]')
  await expect.poll(() => page.evaluate(() => (window as unknown as { announced: string[] }).announced))
    .toContainEqual(expect.stringMatching(/^assertive: .*Project saved.*The Lakeside project is up to date\.$/))
})

test('the icons differ between tones, and the toasts are drawn with them', async ({ page }) => {
  await open(page)
  const drawn = await Promise.all((await page.locator('[data-icon-ref]').all()).map(drawing))
  expect(new Set(drawn).size, 'five distinct icons in the legend').toBe(5)
})

test('the tones differ from each other in color and icon', async ({ page }) => {
  await open(page)
  const inks = new Set<string>()
  for (const [i, tone] of ['success', 'info', 'warning', 'error'].entries()) {
    const toast = await raise(page, `[data-notify="${tone}"]`, i + 1)
    inks.add((await ink(toast, tone)).got)
  }
  expect(inks.size, 'four tones, four colors').toBe(4)
})

test('the close button closes it', async ({ page }) => {
  await open(page)
  const toast = await raise(page, '[data-notify="info"]')
  await toast.getByRole('button', { name: 'Close' }).click()
  await expect(toasts(page)).toHaveCount(0)
})

test('it closes itself after its duration', async ({ page }) => {
  await open(page)
  await raise(page, '[data-notify="success"]')
  await expect(toasts(page)).toHaveCount(0, { timeout: 5000 })
})

const CAUGHT = [
  ['problem', 'The project was changed by someone else.'],
  ['fields', 'Name is required, Budget must be positive'],
  ['list', 'The plan is full, Seats are locked'],
  ['message', 'Upload too large'],
  ['plain', 'Network down'],
  ['product', 'Monthly quota reached'],
  ['empty', 'An error occurred'],
] as const

test.describe('a caught error as the description', () => {
  for (const [id, text] of CAUGHT) {
    test(`${id} → "${text}"`, async ({ page }) => {
      await open(page)
      const toast = await raise(page, `[data-error="${id}"]`)
      await expect(toast.locator('[data-slot="title"]')).toHaveText('Couldn’t save the project')
      await expect(toast.locator('[data-slot="description"]')).toHaveText(text)
      await expect(live(page)).toHaveText(['error · i-lucide-octagon-alert · 3000'])
    })
  }

  test('a real $fetch to a missing route shows the server’s message, not the object', async ({ page }) => {
    await open(page)
    const toast = await raise(page, '[data-error="real"]')
    await expect(toast.locator('[data-slot="title"]')).toHaveText('Couldn’t load the report')
    const description = toast.locator('[data-slot="description"]')
    await expect(description).toContainText('/api/no-such-route')
    await expect(description).not.toContainText('[object Object]')
  })
})

test('errorMessage() on its own, rendered on the server and kept on hydration', async ({ page }) => {
  await open(page)
  for (const [id, text] of CAUGHT) await expect(page.locator(`[data-message="${id}"]`)).toHaveText(text)
})

test('Nuxt UI’s options pass through: an action, and an icon and duration of its own', async ({ page }) => {
  await open(page)
  const archived = await raise(page, '[data-option="action"]')
  await expect(archived.locator('[data-slot="title"]')).toHaveText('Task archived')
  await expect(archived.locator('[data-slot="description"]')).toHaveCount(0)
  await archived.getByRole('button', { name: 'Undo' }).click()
  await expect(region(page).getByText('Task restored')).toBeVisible()

  await page.locator('[data-clear]').click()
  await expect(toasts(page)).toHaveCount(0)
  const own = await raise(page, '[data-option="icon"]')
  await expectIcon(page, own, 'i-lucide-circle-check')
  await expect(live(page)).toHaveText(['info · i-lucide-circle-check · 9000'])
})

test('a title only has no description', async ({ page }) => {
  await open(page)
  const toast = await raise(page, '[data-option="title-only"]')
  await expect(toast.locator('[data-slot="title"]')).toHaveText('Offline')
  await expect(toast.locator('[data-slot="description"]')).toHaveCount(0)
})
