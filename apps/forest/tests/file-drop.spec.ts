import { expect, test, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// ZFileDropOverlay on Forest (pages/file-drop.vue): the overlay paints in Nuxt UI's semantic tokens as Forest sets
// them, in light and dark, with no conflicting utilities, and a drop sorts the files. The drag behavior is covered on
// the base (apps/base/tests/file-drop.spec.ts); the drag is dispatched the same way here.

const fire = (page: Page, type: 'dragenter' | 'drop', selector: string) => page.evaluate(({ type, selector }) => {
  const dt = new DataTransfer()
  for (const [name, t] of [['lunch.png', 'image/png'], ['setup.exe', 'application/x-msdownload'], ['invoice.pdf', 'application/pdf']]) {
    dt.items.add(new File(['x'], name!, { type: t }))
  }
  document.querySelector(selector)!.dispatchEvent(new DragEvent(type, { dataTransfer: dt, bubbles: true, cancelable: true }))
}, { type, selector })

const resolve = (page: Page, value: string) => page.evaluate((v) => {
  const d = document.createElement('div'); d.style.color = v; document.body.append(d)
  const c = getComputedStyle(d).color; d.remove(); return c
}, value)

const OVERLAY = '[data-file-drop-overlay]'

for (const mode of ['light', 'dark'] as const) {
  test(`Forest's tokens (${mode}): the elevated message, highlighted label, accented border and primary icon; a drop sorts the files`, async ({ page }) => {
    await page.addInitScript((m) => localStorage.setItem('zooui-color-mode', m), mode)
    await page.goto('/file-drop')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('visible')).toHaveText('false')
    if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
    else await expect(page.locator('html')).not.toHaveClass(/dark/)

    await fire(page, 'dragenter', '[data-child="b"]')
    const message = page.locator(`${OVERLAY} [data-file-drop-message]`)
    await expect(message.getByText('Drop receipts to attach them')).toBeVisible()
    await expect(message.locator('[data-file-drop-icon]')).toBeVisible()
    const got = await message.evaluate((m) => ({
      card: getComputedStyle(m).backgroundColor,
      border: getComputedStyle(m).borderTopColor,
      label: getComputedStyle(m.querySelector('p')!).color,
      muted: getComputedStyle(m.querySelectorAll('p')[1]!).color,
      icon: getComputedStyle(m.querySelector('[data-file-drop-icon]')!).color,
    }))
    expect(got).toEqual({
      card: await resolve(page, 'var(--ui-bg-elevated)'),
      border: await resolve(page, 'var(--ui-border-accented)'),
      label: await resolve(page, 'var(--ui-text-highlighted)'),
      muted: await resolve(page, 'var(--ui-text-muted)'),
      icon: await resolve(page, 'var(--ui-primary)'),
    })
    expect(await page.evaluate(findConflicts)).toEqual([])

    await fire(page, 'drop', OVERLAY)
    await expect(page.getByTestId('dropped')).toHaveText('lunch.png, invoice.pdf')
    await expect(page.getByTestId('rejected')).toHaveText('setup.exe accept')
    await expect(page.locator(OVERLAY)).toHaveCount(0)
  })
}
