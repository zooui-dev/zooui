import { expect, test, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// ZFileDropOverlay (pages/file-drop.vue over the window, pages/file-drop-region.vue scoped to a region), against the
// production build. A real drag from the desktop can't be made headless, so each step of one is dispatched as the
// browser sends it: a DragEvent whose DataTransfer carries Files (or only text), dragenter on the element entered
// BEFORE dragleave on the one left. Every assertion below is on what that sequence does to the overlay, the live
// region and the emits.

type Carry = { name: string; type: string; bytes?: number }[] | 'text'
const RECEIPTS: Carry = [{ name: 'lunch.png', type: 'image/png' }, { name: 'setup.exe', type: 'application/x-msdownload' }, { name: 'invoice.pdf', type: 'application/pdf' }]

/** Dispatch one drag event at the first match of `selector`; answers whether a listener called preventDefault and
 *  the dropEffect it left. */
const fire = (page: Page, type: 'dragenter' | 'dragleave' | 'dragover' | 'drop', selector: string, carry: Carry = RECEIPTS) =>
  page.evaluate(({ type, selector, carry }) => {
    const dt = new DataTransfer()
    if (carry === 'text') dt.setData('text/plain', 'a sentence dragged within the page')
    else for (const f of carry) dt.items.add(new File(['x'.repeat(f.bytes ?? 1)], f.name, { type: f.type }))
    // Outside a real drag Chrome ignores writes to dropEffect, so what the listener sets is kept here.
    let dropEffect = 'unset'
    Object.defineProperty(dt, 'dropEffect', { get: () => dropEffect, set: (v: string) => { dropEffect = v } })
    const el = document.querySelector(selector)
    if (!el) throw new Error(`nothing matches ${selector}`)
    const e = new DragEvent(type, { dataTransfer: dt, bubbles: true, cancelable: true, composed: true })
    el.dispatchEvent(e)
    return { prevented: e.defaultPrevented, dropEffect }
  }, { type, selector, carry })

const OVERLAY = '[data-file-drop-overlay]'
const overlay = (page: Page) => page.locator(OVERLAY)
const announce = (page: Page) => page.locator('[data-file-drop-announce]')
const shown = async (page: Page) => {
  await expect(overlay(page)).toHaveCount(1)
  await expect(overlay(page).getByText('Drop receipts to attach them')).toBeVisible()
}

/** Counts every time an overlay is put into the page: a flicker is a second mount. */
const countMounts = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { mounts: number }
  w.mounts = 0
  new MutationObserver((records) => {
    for (const r of records) for (const n of r.addedNodes) if (n instanceof Element && n.matches('[data-file-drop-overlay]')) w.mounts++
  }).observe(document.body, { childList: true, subtree: true })
})
const mounts = (page: Page) => page.evaluate(() => (window as unknown as { mounts: number }).mounts)

/** Hydrated: the page reads the overlay's exposed `visible` through a template ref, which is set on the client only. */
async function open(page: Page, path = '/file-drop') {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('visible')).toHaveText('false')
}

test.describe('over the window', () => {
  test.beforeEach(async ({ page }) => open(page))

  test('appears while files are dragged over the page, announces itself, and hides when the drag leaves the window', async ({ page }) => {
    await expect(overlay(page)).toHaveCount(0)
    await expect(announce(page)).toHaveText('')
    await fire(page, 'dragenter', '[data-child="b"]')
    await shown(page)
    await expect(page.getByTestId('visible')).toHaveText('true')
    await expect(page.getByRole('status').filter({ hasText: 'Drop receipts to attach them' })).toHaveCount(1)
    // The overlay is only a picture (pointer-events: none): the drag's events stay on the page's own elements.
    await expect(overlay(page)).toHaveCSS('pointer-events', 'none')
    await fire(page, 'dragenter', '[data-child="a"]')
    await fire(page, 'dragleave', '[data-child="b"]')
    await shown(page)
    // Out of the window: the last element is left for nothing.
    await fire(page, 'dragleave', '[data-child="a"]')
    await expect(overlay(page)).toHaveCount(0)
    await expect(announce(page)).toHaveText('')
    await expect(page.getByTestId('visible')).toHaveText('false')
  })

  test('does not flicker as the drag crosses nested children: one mount, shown at every step', async ({ page }) => {
    await countMounts(page)
    const steps: [string, string][] = [
      ['dragenter', '[data-zone="cards"]'],
      ['dragenter', '[data-child="a"]'], ['dragleave', '[data-zone="cards"]'],
      ['dragenter', '[data-child="b"]'], ['dragleave', '[data-child="a"]'],
      ['dragenter', '[data-child="c"]'], ['dragleave', '[data-child="b"]'],
      ['dragenter', '[data-child="b"]'], ['dragleave', '[data-child="c"]'],
    ]
    for (const [type, sel] of steps) {
      await fire(page, type as 'dragenter' | 'dragleave', sel)
      await expect(overlay(page), `${type} ${sel}`).toHaveCount(1)
    }
    await fire(page, 'dragleave', '[data-child="b"]')
    await expect(overlay(page)).toHaveCount(0)
    expect(await mounts(page)).toBe(1)
  })

  test('a drop hands back the accepted files in @drop and the rest in @rejected, and is kept from opening in the tab', async ({ page }) => {
    await fire(page, 'dragenter', '[data-child="b"]')
    await shown(page)
    expect(await fire(page, 'dragover', '[data-child="b"]')).toEqual({ prevented: true, dropEffect: 'copy' })
    expect((await fire(page, 'drop', '[data-child="b"]')).prevented).toBe(true)
    await expect(page.getByTestId('dropped')).toHaveText('lunch.png, invoice.pdf')
    await expect(page.getByTestId('rejected')).toHaveText('setup.exe accept')
    await expect(overlay(page)).toHaveCount(0)

    // The next drag starts from zero.
    await fire(page, 'dragenter', '[data-child="a"]')
    await shown(page)
    await fire(page, 'dragleave', '[data-child="a"]')
    await expect(overlay(page)).toHaveCount(0)
  })

  test('filter: a file the page\'s own rule refuses goes to @rejected as filter, with its message, and the rest is taken', async ({ page }) => {
    const carry: Carry = [{ name: 'blank.pdf', type: 'application/pdf', bytes: 0 }, { name: 'lunch.png', type: 'image/png' }, { name: 'setup.exe', type: 'application/x-msdownload', bytes: 0 }]
    await fire(page, 'dragenter', '[data-child="b"]', carry)
    await fire(page, 'drop', '[data-child="b"]', carry)
    await expect(page.getByTestId('dropped')).toHaveText('lunch.png')
    // The empty .exe is refused for accept first: filter runs only on files accept takes.
    await expect(page.getByTestId('rejected')).toHaveText('blank.pdf filter: is empty, setup.exe accept')
  })

  test('a drop whose dataTransfer.files is empty is read from dataTransfer.items instead', async ({ page }) => {
    await fire(page, 'dragenter', '[data-child="b"]')
    const prevented = await page.evaluate(() => {
      const dt = new DataTransfer()
      dt.items.add(new File(['x'], 'lunch.png', { type: 'image/png' }))
      dt.items.add(new File(['x'], 'setup.exe', { type: 'application/x-msdownload' }))
      // As some browsers hand a drop over: the files in its items, its FileList empty.
      Object.defineProperty(dt, 'files', { get: () => new DataTransfer().files })
      const e = new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })
      document.querySelector('[data-child="b"]')!.dispatchEvent(e)
      return e.defaultPrevented
    })
    expect(prevented).toBe(true)
    await expect(page.getByTestId('dropped')).toHaveText('lunch.png')
    await expect(page.getByTestId('rejected')).toHaveText('setup.exe accept')
  })

  test('text and links dragged within the page are ignored', async ({ page }) => {
    expect((await fire(page, 'dragenter', '[data-child="b"]', 'text')).prevented).toBe(false)
    expect((await fire(page, 'dragover', '[data-child="b"]', 'text')).prevented).toBe(false)
    await expect(overlay(page)).toHaveCount(0)
    expect((await fire(page, 'drop', '[data-child="b"]', 'text')).prevented).toBe(false)
    // And a stray text dragleave doesn't push the count below zero: the next file drag still shows and hides.
    await fire(page, 'dragleave', '[data-child="b"]', 'text')
    await fire(page, 'dragenter', '[data-child="b"]')
    await shown(page)
    await fire(page, 'dragleave', '[data-child="b"]')
    await expect(overlay(page)).toHaveCount(0)
    await expect(page.getByTestId('dropped')).toHaveText('none')
  })

  test('Escape hides it for the rest of the drag, a drop then takes nothing, and the next drag shows it again', async ({ page }) => {
    await fire(page, 'dragenter', '[data-child="b"]')
    await shown(page)
    await page.keyboard.press('Escape')
    await expect(overlay(page)).toHaveCount(0)
    await expect(announce(page)).toHaveText('')
    // Still dragging: crossing the page does not bring it back.
    await fire(page, 'dragenter', '[data-child="a"]')
    await fire(page, 'dragleave', '[data-child="b"]')
    await expect(overlay(page)).toHaveCount(0)
    await expect(page.getByTestId('visible')).toHaveText('false')
    expect(await fire(page, 'dragover', '[data-child="a"]')).toEqual({ prevented: true, dropEffect: 'none' })
    expect((await fire(page, 'drop', '[data-child="a"]')).prevented).toBe(true)
    await expect(page.getByTestId('dropped')).toHaveText('none')
    await expect(overlay(page)).toHaveCount(0)

    await fire(page, 'dragenter', '[data-child="a"]')
    await shown(page)
  })

  test('does not take focus or trap it: the field keeps focus and Tab still moves through the page', async ({ page }) => {
    const field = page.getByPlaceholder('Holds focus')
    await field.focus()
    await fire(page, 'dragenter', '[data-child="b"]')
    await shown(page)
    await expect(field).toBeFocused()
    await expect(overlay(page)).toHaveAttribute('aria-hidden', 'true')
    expect(await overlay(page).locator('a, button, input, select, textarea, [tabindex]').count()).toBe(0)
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-toggle="mounted"]')).toBeFocused()
  })

  test('disabled: no overlay and no emit, but a file dropped is still kept from opening in the tab', async ({ page }) => {
    await page.locator('[data-toggle="disabled"]').click()
    await fire(page, 'dragenter', '[data-child="b"]')
    await expect(page.getByTestId('visible')).toHaveText('false')
    await expect(overlay(page)).toHaveCount(0)
    await expect(announce(page)).toHaveText('')
    expect(await fire(page, 'dragover', '[data-child="b"]')).toEqual({ prevented: true, dropEffect: 'none' })
    expect((await fire(page, 'drop', '[data-child="b"]')).prevented).toBe(true)
    await expect(page.getByTestId('dropped')).toHaveText('none')
    await expect(page.getByTestId('rejected')).toHaveText('none')
  })

  test('disabled, a drop zone of the page\'s own (UFileUpload) still takes the drop: its dropEffect is left alone', async ({ page }) => {
    const zone = '[data-zone="upload"] [data-slot="base"]'
    await page.locator('[data-toggle="disabled"]').click()
    await fire(page, 'dragenter', zone)
    await expect(overlay(page)).toHaveCount(0)
    expect(await fire(page, 'dragover', zone)).toEqual({ prevented: true, dropEffect: 'copy' })
    expect((await fire(page, 'drop', zone)).prevented).toBe(true)
    await expect(page.getByTestId('uploaded')).toHaveText('lunch.png, setup.exe, invoice.pdf')
    await expect(page.getByTestId('dropped')).toHaveText('none')
    await expect(overlay(page)).toHaveCount(0)
  })

  test('unmounted, it leaves no listener behind: drags do nothing and the page\'s own defaults come back', async ({ page }) => {
    expect((await fire(page, 'dragover', '[data-child="b"]')).prevented).toBe(true)
    await page.locator('[data-toggle="mounted"]').click()
    await expect(page.getByTestId('visible')).toHaveText('unmounted')
    expect((await fire(page, 'dragenter', '[data-child="b"]')).prevented).toBe(false)
    expect((await fire(page, 'dragover', '[data-child="b"]')).prevented).toBe(false)
    expect((await fire(page, 'drop', '[data-child="b"]')).prevented).toBe(false)
    await expect(overlay(page)).toHaveCount(0)
    await expect(announce(page)).toHaveCount(0)
  })
})

/** Dispatch one drag step and read the overlay as Vue first patches it, before its enter or leave transition runs. */
const firstFrame = (page: Page, type: 'dragenter' | 'dragleave') => page.evaluate(async (type) => {
  const dt = new DataTransfer()
  dt.items.add(new File(['x'], 'lunch.png', { type: 'image/png' }))
  document.querySelector('[data-child="b"]')!.dispatchEvent(new DragEvent(type, { dataTransfer: dt, bubbles: true, cancelable: true }))
  await new Promise((resolve) => setTimeout(resolve, 0))
  const o = document.querySelector<HTMLElement>('[data-file-drop-overlay]')
  const m = o?.querySelector<HTMLElement>('[data-file-drop-message]')
  if (!o || !m) return null
  return {
    overlay: { opacity: getComputedStyle(o).opacity, duration: getComputedStyle(o).transitionDuration },
    message: { duration: getComputedStyle(m).transitionDuration, scaled: getComputedStyle(m).scale !== 'none' || getComputedStyle(m).transform !== 'none' },
  }
}, type)

// Vue's <Transition> holds the element for its transition-duration, so the durations read here are what the overlay's
// enter and leave take.
test.describe('enter and leave', () => {
  test('the overlay fades in with its message growing into place, and fades out on leave', async ({ page }) => {
    await open(page)
    expect(await firstFrame(page, 'dragenter')).toEqual({ overlay: { opacity: '0', duration: '0.15s' }, message: { duration: '0.15s', scaled: true } })
    await expect(overlay(page)).toHaveCSS('opacity', '1')
    await expect(overlay(page).locator('[data-file-drop-message]')).toHaveCSS('transition-duration', '0s')
    // On leave it stays in the page for its fade, then goes.
    const leaving = await firstFrame(page, 'dragleave')
    expect(leaving?.overlay.duration).toBe('0.1s')
    expect(leaving?.message.duration).toBe('0.1s')
    await expect(overlay(page)).toHaveCount(0)
  })

  test('with reduced motion, it appears and goes with no transition', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await open(page)
    const entering = await firstFrame(page, 'dragenter')
    expect(entering?.overlay.duration).toBe('0s')
    expect(entering?.message.duration).toBe('0s')
    await expect(overlay(page)).toHaveCSS('opacity', '1')
    const leaving = await firstFrame(page, 'dragleave')
    // Gone already, or leaving with nothing to wait for.
    if (leaving) expect([leaving.overlay.duration, leaving.message.duration]).toEqual(['0s', '0s'])
    await expect(overlay(page)).toHaveCount(0)
  })
})

test('a navigation takes its listeners with it: on the next page, a drag outside that page\'s own region is left alone', async ({ page }) => {
  await open(page)
  await page.locator('[data-leave]').click()
  await expect(page).toHaveURL(/\/file-drop-region$/)
  await expect(page.locator('[data-zone="region"]')).toBeVisible()
  expect((await fire(page, 'dragenter', '[data-zone="outside"]')).prevented).toBe(false)
  expect((await fire(page, 'dragover', '[data-zone="outside"]')).prevented).toBe(false)
  await expect(overlay(page)).toHaveCount(0)
})

test.describe('scoped to a region', () => {
  const CSVS: Carry = [{ name: 'march.csv', type: 'text/csv' }, { name: 'photo.png', type: 'image/png' }, { name: 'april.csv', type: '' }]

  test.beforeEach(async ({ page }) => {
    await page.goto('/file-drop-region')
    await page.waitForLoadState('networkidle')
  })

  test('only drags over the region count; the overlay covers the region, and one CSV is taken', async ({ page }) => {
    // The ref arrives after the first render: the region takes drops once the client has it.
    await expect.poll(async () => (await fire(page, 'dragover', '[data-child="inside"]', CSVS)).prevented).toBe(true)

    expect((await fire(page, 'dragenter', '[data-zone="outside"]', CSVS)).prevented).toBe(false)
    expect((await fire(page, 'dragover', '[data-zone="outside"]', CSVS)).prevented).toBe(false)
    await expect(overlay(page)).toHaveCount(0)

    await fire(page, 'dragenter', '[data-child="inside"]', CSVS)
    // Contained: drawn inside the region itself, over its padding box (inside its 1px border), with no measuring.
    const region = page.locator('[data-zone="region"]')
    await expect(region.locator(OVERLAY)).toHaveAttribute('data-contained', '')
    await expect(overlay(page).getByText('Drop a CSV to import it')).toBeVisible()
    await expect(region).toHaveCSS('position', 'relative')
    const [outer, cover] = await Promise.all([region.boundingBox(), overlay(page).boundingBox()])
    for (const k of ['x', 'y'] as const) expect(Math.abs(outer![k] + 1 - cover![k]), k).toBeLessThan(0.5)
    for (const k of ['width', 'height'] as const) expect(Math.abs(outer![k] - 2 - cover![k]), k).toBeLessThan(0.5)

    // Crossing the region's children holds it.
    await fire(page, 'dragenter', '[data-zone="region"]', CSVS)
    await fire(page, 'dragleave', '[data-child="inside"]', CSVS)
    await expect(region.locator(OVERLAY)).toHaveCount(1)
    expect((await fire(page, 'drop', '[data-zone="region"]', CSVS)).prevented).toBe(true)
    await expect(page.getByTestId('dropped')).toHaveText('march.csv')
    await expect(page.getByTestId('rejected')).toHaveText('photo.png accept, april.csv multiple')
    await expect(overlay(page)).toHaveCount(0)
  })

  test('leaving the region hides it', async ({ page }) => {
    await expect.poll(async () => (await fire(page, 'dragover', '[data-child="inside"]', CSVS)).prevented).toBe(true)
    await fire(page, 'dragenter', '[data-child="inside"]', CSVS)
    await fire(page, 'dragenter', '[data-zone="region"]', CSVS)
    await fire(page, 'dragleave', '[data-child="inside"]', CSVS)
    await expect(overlay(page)).toHaveCount(1)
    // Out of the region onto the page: entered outside (no listener there), then the region left.
    await fire(page, 'dragenter', '[data-zone="outside"]', CSVS)
    await fire(page, 'dragleave', '[data-zone="region"]', CSVS)
    await expect(overlay(page)).toHaveCount(0)
  })
})

/** Tailwind's palette values the product's colors resolve to (app.config.ts: neutral slate, primary sky). */
const TW = {
  'white': '#fff', 'slate-100': 'oklch(96.8% 0.007 247.896)', 'slate-800': 'oklch(27.9% 0.041 260.031)',
  'slate-900': 'oklch(20.8% 0.042 265.755)', 'slate-300': 'oklch(86.9% 0.022 252.894)', 'slate-700': 'oklch(37.2% 0.044 257.287)',
  'sky-400': 'oklch(74.6% 0.16 232.661)', 'sky-500': 'oklch(68.5% 0.169 237.323)',
} as const
const resolve = (page: Page, value: string) => page.evaluate((v) => {
  const d = document.createElement('div'); d.style.color = v; document.body.append(d)
  const c = getComputedStyle(d).color; d.remove(); return c
}, value)
const COLORS = {
  light: { card: 'slate-100', label: 'slate-900', border: 'slate-300', icon: 'sky-500' },
  dark: { card: 'slate-800', label: 'white', border: 'slate-700', icon: 'sky-400' },
} as const

for (const mode of ['light', 'dark'] as const) {
  test(`the product's colors (${mode}): the message on the elevated surface, a primary icon from the bundle; no conflicting utilities`, async ({ page }) => {
    const icons: string[] = []
    page.on('request', (r) => { if (/_nuxt_icon|iconify/.test(r.url())) icons.push(r.url()) })
    await page.addInitScript((m) => localStorage.setItem('product-color-mode', m), mode)
    await open(page)
    if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
    await fire(page, 'dragenter', '[data-child="b"]')
    await shown(page)
    const message = overlay(page).locator('[data-file-drop-message]')
    await expect(message.locator('[data-file-drop-icon]')).toBeVisible()
    const got = await message.evaluate((m) => ({
      card: getComputedStyle(m).backgroundColor,
      border: getComputedStyle(m).borderTopColor,
      label: getComputedStyle(m.querySelector('p')!).color,
      icon: getComputedStyle(m.querySelector('[data-file-drop-icon]')!).color,
    }))
    const want = COLORS[mode]
    expect(got).toEqual({
      card: await resolve(page, TW[want.card]),
      border: await resolve(page, TW[want.border]),
      label: await resolve(page, TW[want.label]),
      icon: await resolve(page, TW[want.icon]),
    })
    expect(await page.evaluate(findConflicts)).toEqual([])
    expect(icons).toEqual([])
  })
}
