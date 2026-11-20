import { expect, test, type Page } from '@playwright/test'

// ZFileDropOverlay contained in a ZModal, with ZFileList and a UFileUpload: a transfer dialog's Files field
// (pages/file-drop-dialog.vue) over a page with a window-level overlay of its own, against the production build. Drags
// are dispatched step by step as in file-drop.spec.ts: a DragEvent whose DataTransfer carries Files.

type Carry = { name: string; type: string }[]
const ATTACH: Carry = [{ name: 'report.pdf', type: 'application/pdf' }, { name: 'scan.png', type: 'image/png' }]

/** Dispatch one drag event at the first match of `selector`; answers whether a listener called preventDefault and
 *  the dropEffect it left. */
const fire = (page: Page, type: 'dragenter' | 'dragleave' | 'dragover' | 'drop', selector: string, carry: Carry = ATTACH) =>
  page.evaluate(({ type, selector, carry }) => {
    const dt = new DataTransfer()
    for (const f of carry) dt.items.add(new File(['x'.repeat(1234)], f.name, { type: f.type }))
    let dropEffect = 'unset'
    Object.defineProperty(dt, 'dropEffect', { get: () => dropEffect, set: (v: string) => { dropEffect = v } })
    const el = document.querySelector(selector)
    if (!el) throw new Error(`nothing matches ${selector}`)
    const e = new DragEvent(type, { dataTransfer: dt, bubbles: true, cancelable: true, composed: true })
    el.dispatchEvent(e)
    return { prevented: e.defaultPrevented, dropEffect }
  }, { type, selector, carry })

const DIALOG = '[data-zone="dialog"]'
const FIELD = '[data-zone="field"]'
const UPLOAD = '[data-zone="upload"] [data-slot="base"]'
const PAGE = '[data-zone="page"]'
/** The modal's backdrop: outside the dialog, over the page. */
const BACKDROP = '[data-slot="overlay"]'
const dialogOverlay = (page: Page) => page.locator(`${DIALOG} [data-file-drop-overlay]`)
const pageOverlay = (page: Page) => page.locator('body > [data-file-drop-overlay]')
const rows = (page: Page) => page.locator('[data-file-row]')
const names = (page: Page) => rows(page).evaluateAll((els) => els.map((el) => el.getAttribute('data-file-row')))
const STORED = ['engagement-letter.pdf', '2025-return.pdf']

async function openDialog(page: Page) {
  await page.goto('/file-drop-dialog')
  await page.waitForLoadState('networkidle')
  // Hydrated: the page's overlay is listening.
  await expect.poll(async () => (await fire(page, 'dragover', PAGE)).prevented).toBe(true)
  await page.locator('[data-open-dialog]').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  // The dialog's overlay is listening once it has made the dialog its positioning context.
  await expect(page.locator(DIALOG)).toHaveCSS('position', 'relative')
}

test.beforeEach(async ({ page }) => openDialog(page))

test('dragging over the dialog shows only its own overlay, drawn over the dialog\'s content; a drop adds to the list and the dialog stays open', async ({ page }) => {
  await fire(page, 'dragenter', FIELD)
  await expect(dialogOverlay(page).getByText('Drop files to attach them')).toBeVisible()
  await expect(dialogOverlay(page)).toHaveAttribute('data-contained', '')
  await expect(page.getByRole('dialog').locator('[data-file-drop-overlay]')).toHaveCount(1)
  await expect(pageOverlay(page)).toHaveCount(0)
  // Over the dialog's content, not behind it: hit-tested at its center, the overlay is the topmost thing there.
  const onTop = await page.evaluate((sel) => {
    const o = document.querySelector<HTMLElement>(sel)!
    o.style.pointerEvents = 'auto'
    const r = o.getBoundingClientRect()
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
    o.style.pointerEvents = ''
    return !!hit && o.contains(hit)
  }, `${DIALOG} [data-file-drop-overlay]`)
  expect(onTop).toBe(true)

  expect(await fire(page, 'dragover', FIELD)).toEqual({ prevented: true, dropEffect: 'copy' })
  expect((await fire(page, 'drop', FIELD)).prevented).toBe(true)
  await expect.poll(() => names(page)).toEqual([...STORED, 'report.pdf', 'scan.png'])
  await expect(page.getByTestId('page-dropped')).toHaveText('none')
  await expect(dialogOverlay(page)).toHaveCount(0)
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('while the dialog is open the page takes no drops: over the backdrop nothing shows, nothing is emitted, and the file stays out of the tab', async ({ page }) => {
  await fire(page, 'dragenter', BACKDROP)
  await expect(pageOverlay(page)).toHaveCount(0)
  await expect(dialogOverlay(page)).toHaveCount(0)
  expect(await fire(page, 'dragover', BACKDROP)).toEqual({ prevented: true, dropEffect: 'none' })

  // Into the dialog: entered there, then the backdrop left. The dialog's shows.
  await fire(page, 'dragenter', FIELD)
  await fire(page, 'dragleave', BACKDROP)
  await expect(dialogOverlay(page)).toBeVisible()
  await expect(pageOverlay(page)).toHaveCount(0)
  // Across the dialog's own children, it holds.
  await fire(page, 'dragenter', UPLOAD)
  await fire(page, 'dragleave', FIELD)
  await expect(dialogOverlay(page)).toBeVisible()

  // Back out over the backdrop: neither shows, and a drop there is refused rather than opened.
  await fire(page, 'dragenter', BACKDROP)
  await fire(page, 'dragleave', UPLOAD)
  await expect(dialogOverlay(page)).toHaveCount(0)
  await expect(pageOverlay(page)).toHaveCount(0)
  // Over the page's own content too (aria-hidden behind the modal, but still in the document).
  await fire(page, 'dragenter', PAGE)
  await fire(page, 'dragleave', BACKDROP)
  await expect(pageOverlay(page)).toHaveCount(0)
  expect((await fire(page, 'drop', PAGE)).prevented).toBe(true)
  await expect(page.getByTestId('page-dropped')).toHaveText('none')
  expect(await names(page)).toEqual(STORED)
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('once the dialog closes, the page takes drops again with nothing wired up', async ({ page }) => {
  await page.locator('[data-close-dialog]').click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await fire(page, 'dragenter', PAGE)
  await expect(pageOverlay(page).getByText('Drop on the page')).toBeVisible()
  expect(await fire(page, 'dragover', PAGE)).toEqual({ prevented: true, dropEffect: 'copy' })
  await fire(page, 'drop', PAGE)
  await expect(page.getByTestId('page-dropped')).toHaveText('report.pdf')
  await expect(pageOverlay(page)).toHaveCount(0)
})

test('a file the rule refuses is reported in a toast, and the rest is added', async ({ page }) => {
  const mixed: Carry = [{ name: 'notes.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }, { name: 'ledger.csv', type: 'text/csv' }]
  await fire(page, 'dragenter', FIELD, mixed)
  await fire(page, 'drop', FIELD, mixed)
  await expect.poll(() => names(page)).toEqual([...STORED, 'ledger.csv'])
  await expect(page.getByText('notes.docx: only PDFs, CSVs and images.', { exact: true })).toBeVisible()
})

test('browsing adds to the same list through the same rule', async ({ page }) => {
  await page.locator('[data-zone="upload"] input[type="file"]').setInputFiles([
    { name: 'browsed.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') },
    { name: 'tool.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') },
  ])
  await expect.poll(() => names(page)).toEqual([...STORED, 'browsed.pdf'])
  await expect(page.getByText('tool.exe: only PDFs, CSVs and images.', { exact: true })).toBeVisible()

  await fire(page, 'dragenter', FIELD)
  await fire(page, 'drop', FIELD)
  await expect.poll(() => names(page)).toEqual([...STORED, 'browsed.pdf', 'report.pdf', 'scan.png'])
})

test('a drop on the field\'s own drop zone is added once, whether UFileUpload takes it or leaves it to the overlay', async ({ page }) => {
  // PDF and PNG: UFileUpload's own check takes them, and the dialog's overlay leaves its drop be.
  await fire(page, 'dragenter', UPLOAD)
  expect(await fire(page, 'dragover', UPLOAD)).toEqual({ prevented: true, dropEffect: 'copy' })
  expect((await fire(page, 'drop', UPLOAD)).prevented).toBe(true)
  await expect.poll(() => names(page)).toEqual([...STORED, 'report.pdf', 'scan.png'])

  // A CSV: UFileUpload's check reads only MIME types out of `accept`, so it refuses one; the overlay takes it.
  const csv: Carry = [{ name: 'march.csv', type: 'text/csv' }]
  await fire(page, 'dragenter', UPLOAD, csv)
  await fire(page, 'drop', UPLOAD, csv)
  await expect.poll(() => names(page)).toEqual([...STORED, 'report.pdf', 'scan.png', 'march.csv'])
  await expect(page.getByTestId('page-dropped')).toHaveText('none')
})

test('remove: an added file at once; a stored one through the server, with the row busy until it answers', async ({ page }) => {
  // Sizes in 1024s by default, as Buoy showed them.
  await expect(page.locator('[data-file-row="engagement-letter.pdf"]')).toContainText('239.3 KB')
  await expect(page.locator('[data-file-row="2025-return.pdf"]')).toContainText('1.7 MB')
  await fire(page, 'dragenter', FIELD)
  await fire(page, 'drop', FIELD)
  await expect(page.locator('[data-file-row="report.pdf"]')).toContainText('1.2 KB')
  // Remove is in the error color, as Buoy's was.
  const errorColor = await page.evaluate(() => {
    const d = document.createElement('div'); d.style.color = 'var(--ui-error)'; document.body.append(d)
    const c = getComputedStyle(d).color; d.remove(); return c
  })
  await expect(page.getByRole('button', { name: 'Remove report.pdf' })).toHaveCSS('color', errorColor)
  await page.getByRole('button', { name: 'Remove report.pdf' }).click()
  await expect.poll(() => names(page)).toEqual([...STORED, 'scan.png'])

  const letter = page.locator('[data-file-row="engagement-letter.pdf"]')
  await page.getByRole('button', { name: 'Remove engagement-letter.pdf' }).click()
  await expect(letter).toHaveAttribute('aria-busy', 'true')
  await expect(letter.getByRole('button')).toBeDisabled()
  await page.locator('[data-server-ok]').click()
  await expect(letter).toHaveCount(0)

  const ret = page.locator('[data-file-row="2025-return.pdf"]')
  await page.getByRole('button', { name: 'Remove 2025-return.pdf' }).click()
  await expect(ret).toHaveAttribute('aria-busy', 'true')
  await page.locator('[data-server-fail]').click()
  await expect(page.getByText("Couldn't remove 2025-return.pdf", { exact: true })).toBeVisible()
  await expect(ret).not.toHaveAttribute('aria-busy', 'true')
  await expect(ret.getByRole('button')).toBeEnabled()
  expect(await names(page)).toEqual(['2025-return.pdf', 'scan.png'])
})

test('closing the dialog takes its listeners with it: its element no longer answers, and the page\'s overlay is whole again', async ({ page }) => {
  await page.evaluate((sel) => { (window as unknown as { zone: Element }).zone = document.querySelector(sel)! }, DIALOG)
  await page.locator('[data-close-dialog]').click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const stale = await page.evaluate(() => {
    const zone = (window as unknown as { zone: HTMLElement }).zone
    const dt = new DataTransfer()
    dt.items.add(new File(['x'], 'late.pdf', { type: 'application/pdf' }))
    const e = new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true })
    zone.dispatchEvent(e)
    return { prevented: e.defaultPrevented, position: zone.style.position }
  })
  expect(stale).toEqual({ prevented: false, position: '' })

  await fire(page, 'dragenter', PAGE)
  await expect(pageOverlay(page)).toBeVisible()
  await fire(page, 'dragleave', PAGE)
  await expect(pageOverlay(page)).toHaveCount(0)
})

test('no file twice: a name the list already holds, stored or added, is refused as already attached', async ({ page }) => {
  await fire(page, 'dragenter', FIELD)
  await fire(page, 'drop', FIELD)
  await expect.poll(() => names(page)).toEqual([...STORED, 'report.pdf', 'scan.png'])

  const again: Carry = [{ name: 'report.pdf', type: 'application/pdf' }, { name: 'engagement-letter.pdf', type: 'application/pdf' }, { name: 'ledger.csv', type: 'text/csv' }]
  await fire(page, 'dragenter', FIELD, again)
  await fire(page, 'drop', FIELD, again)
  await expect.poll(() => names(page)).toEqual([...STORED, 'report.pdf', 'scan.png', 'ledger.csv'])
  await expect(page.getByText('report.pdf, engagement-letter.pdf: already attached.', { exact: true })).toBeVisible()

  // Once removed, a name can be attached again.
  await page.getByRole('button', { name: 'Remove report.pdf' }).click()
  await expect.poll(() => names(page)).toEqual([...STORED, 'scan.png', 'ledger.csv'])
  const report: Carry = [{ name: 'report.pdf', type: 'application/pdf' }]
  await fire(page, 'dragenter', FIELD, report)
  await fire(page, 'drop', FIELD, report)
  await expect.poll(() => names(page)).toEqual([...STORED, 'scan.png', 'ledger.csv', 'report.pdf'])
})

test('a file browsed for, removed, and browsed for again is added again: the input is reset before each browse', async ({ page }) => {
  const input = page.locator('[data-zone="upload"] input[type="file"]')
  const zone = page.locator(UPLOAD)
  const pdf = { name: 'again.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') }

  const [first] = await Promise.all([page.waitForEvent('filechooser'), zone.click()])
  await first.setFiles(pdf)
  await expect.poll(() => names(page)).toEqual([...STORED, 'again.pdf'])
  // The input still holds the pick: a browser would send no change for the same file chosen again.
  expect(await input.evaluate((el: HTMLInputElement) => el.value)).toContain('again.pdf')

  await page.getByRole('button', { name: 'Remove again.pdf' }).click()
  await expect.poll(() => names(page)).toEqual(STORED)

  const [second] = await Promise.all([page.waitForEvent('filechooser'), zone.click()])
  // Opened empty, so choosing the same file again is a change.
  expect(await input.evaluate((el: HTMLInputElement) => ({ value: el.value, files: el.files?.length ?? 0 }))).toEqual({ value: '', files: 0 })
  await second.setFiles(pdf)
  await expect.poll(() => names(page)).toEqual([...STORED, 'again.pdf'])
})
