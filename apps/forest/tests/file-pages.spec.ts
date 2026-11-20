import { expect, test, type Page } from '@playwright/test'

// Smoke tests for the file demo pages on Forest (pages/file-drop.vue, file-drop-region.vue, file-drop-dialog.vue,
// file-list.vue): each renders, and its key behavior works under the theme. The behavior itself is covered in depth on
// the base (apps/base/tests/file-drop.spec.ts, file-drop-dialog.spec.ts, file-list.spec.ts); drags are dispatched the
// same way here, as DragEvents whose DataTransfer carries Files.

type Carry = { name: string; type: string; bytes?: number }[]

/** Dispatch one drag event at the first match of `selector`; answers whether a listener called preventDefault. */
const fire = (page: Page, type: 'dragenter' | 'dragover' | 'drop', selector: string, carry: Carry) =>
  page.evaluate(({ type, selector, carry }) => {
    const dt = new DataTransfer()
    for (const f of carry) dt.items.add(new File(['x'.repeat(f.bytes ?? 1)], f.name, { type: f.type }))
    const el = document.querySelector(selector)
    if (!el) throw new Error(`nothing matches ${selector}`)
    const e = new DragEvent(type, { dataTransfer: dt, bubbles: true, cancelable: true, composed: true })
    el.dispatchEvent(e)
    return e.defaultPrevented
  }, { type, selector, carry })

const drop = async (page: Page, selector: string, carry: Carry) => {
  await fire(page, 'dragenter', selector, carry)
  await fire(page, 'drop', selector, carry)
}
const heading = (page: Page, name: string) => page.getByRole('heading', { level: 2, name })
const rows = (page: Page) => page.locator('[data-file-row]').evaluateAll((els) => els.map((el) => el.getAttribute('data-file-row')))

test('/file-drop renders, and its filter refuses an empty file with the page\'s message', async ({ page }) => {
  await page.goto('/file-drop')
  await page.waitForLoadState('networkidle')
  await expect(heading(page, 'ZFileDropOverlay, over the window')).toBeVisible()
  await expect(page.getByTestId('visible')).toHaveText('false')

  await drop(page, '[data-child="b"]', [{ name: 'blank.pdf', type: 'application/pdf', bytes: 0 }, { name: 'lunch.png', type: 'image/png' }])
  await expect(page.getByTestId('dropped')).toHaveText('lunch.png')
  await expect(page.getByTestId('rejected')).toHaveText('blank.pdf filter: is empty')
})

test('/file-drop-region renders, and only the region takes a drop: one CSV', async ({ page }) => {
  await page.goto('/file-drop-region')
  await page.waitForLoadState('networkidle')
  await expect(heading(page, 'ZFileDropOverlay, contained in a region')).toBeVisible()

  const CSVS: Carry = [{ name: 'march.csv', type: 'text/csv' }, { name: 'photo.png', type: 'image/png' }, { name: 'april.csv', type: 'text/csv' }]
  // The ref arrives after the first render: the region takes drops once the client has it.
  await expect.poll(() => fire(page, 'dragover', '[data-child="inside"]', CSVS)).toBe(true)
  expect(await fire(page, 'dragover', '[data-zone="outside"]', CSVS)).toBe(false)

  await fire(page, 'dragenter', '[data-child="inside"]', CSVS)
  await expect(page.locator('[data-zone="region"] [data-file-drop-overlay]').getByText('Drop a CSV to import it')).toBeVisible()
  await fire(page, 'drop', '[data-child="inside"]', CSVS)
  await expect(page.getByTestId('dropped')).toHaveText('march.csv')
  await expect(page.getByTestId('rejected')).toHaveText('photo.png accept, april.csv multiple')
})

test('/file-drop-dialog renders; a drop on the dialog joins the list in 1024s with a red Remove, and the same name again is refused', async ({ page }) => {
  await page.goto('/file-drop-dialog')
  await page.waitForLoadState('networkidle')
  await expect(heading(page, 'ZFileDropOverlay in a dialog, with ZFileList')).toBeVisible()
  await expect.poll(() => fire(page, 'dragover', '[data-zone="page"]', [{ name: 'a.pdf', type: 'application/pdf' }])).toBe(true)
  await page.locator('[data-open-dialog]').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('[data-zone="dialog"]')).toHaveCSS('position', 'relative')

  const REPORT: Carry = [{ name: 'report.pdf', type: 'application/pdf', bytes: 1234 }]
  await drop(page, '[data-zone="field"]', REPORT)
  await expect.poll(() => rows(page)).toEqual(['engagement-letter.pdf', '2025-return.pdf', 'report.pdf'])
  await expect(page.locator('[data-file-row="report.pdf"]')).toContainText('1.2 KB')
  const errorColor = await page.evaluate(() => {
    const d = document.createElement('div'); d.style.color = 'var(--ui-error)'; document.body.append(d)
    const c = getComputedStyle(d).color; d.remove(); return c
  })
  await expect(page.getByRole('button', { name: 'Remove report.pdf' })).toHaveCSS('color', errorColor)

  await drop(page, '[data-zone="field"]', REPORT)
  await expect(page.getByText('report.pdf: already attached.', { exact: true })).toBeVisible()
  expect(await rows(page)).toEqual(['engagement-letter.pdf', '2025-return.pdf', 'report.pdf'])
})

test('/file-list renders with its row slots; Thumbnails shows the pictures and Binary sizes off switches to decimal', async ({ page }) => {
  await page.goto('/file-list')
  await page.waitForLoadState('networkidle')
  await expect(heading(page, 'ZFileList: thumbnails, sizes and row slots')).toBeVisible()
  // Hydrated: the client's Files are in the list.
  await expect.poll(() => rows(page)).toEqual(['site-photo.png', '2025-return.pdf', 'photo-1.png', 'invoice.pdf'])
  await expect(page.getByRole('checkbox', { name: 'Include site-photo.png' })).toBeChecked()
  await expect(page.locator('[data-file-row="photo-1.png"] [data-badge]')).toHaveText('New')

  const photo = page.locator('[data-file-row="photo-1.png"] [data-file-thumbnail]')
  await expect(photo).toHaveCount(0)
  await page.locator('[data-toggle="preview"]').click()
  await expect(photo).toHaveAttribute('src', /^blob:/)
  await expect(page.locator('[data-file-row="site-photo.png"] [data-file-thumbnail]')).toHaveAttribute('src', /^data:image\/png/)

  await expect(page.locator('[data-file-row="site-photo.png"]')).toContainText('239.3 KB')
  await page.locator('[data-toggle="binary"]').click()
  await expect(page.locator('[data-file-row="site-photo.png"]')).toContainText('245 kB')
})
