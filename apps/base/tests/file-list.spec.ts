import { expect, test, type Page } from '@playwright/test'

// ZFileList's options (pages/file-list.vue), against the production build: thumbnails through object URLs and their
// release, binary and decimal sizes, and the #leading and #trailing row slots with `removing`.

const row = (page: Page, name: string) => page.locator(`[data-file-row="${name}"]`)
const names = (page: Page) => page.locator('[data-file-row]').evaluateAll((els) => els.map((el) => el.getAttribute('data-file-row')))
const ROWS = ['site-photo.png', '2025-return.pdf', 'photo-1.png', 'invoice.pdf']

/** Every object URL made and revoked, recorded before the page's own code runs. */
const recordObjectUrls = (page: Page) => page.addInitScript(() => {
  const w = window as unknown as { made: string[]; revoked: string[] }
  w.made = []
  w.revoked = []
  const create = URL.createObjectURL.bind(URL)
  const revoke = URL.revokeObjectURL.bind(URL)
  URL.createObjectURL = (obj: Blob | MediaSource) => { const url = create(obj); w.made.push(url); return url }
  URL.revokeObjectURL = (url: string) => { w.revoked.push(url); revoke(url) }
})
const objectUrls = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { made: string[]; revoked: string[] }
  return { made: [...w.made], revoked: [...w.revoked] }
})
const thumbnailOf = (page: Page, name: string) => row(page, name).locator('[data-file-thumbnail]')

async function open(page: Page) {
  await recordObjectUrls(page)
  await page.goto('/file-list')
  await page.waitForLoadState('networkidle')
  // Hydrated: the client's Files are in the list.
  await expect.poll(() => names(page)).toEqual(ROWS)
}

test.beforeEach(async ({ page }) => open(page))

test('preview is off by default: every row has its icon and no object URL is made', async ({ page }) => {
  await expect(page.locator('[data-file-thumbnail]')).toHaveCount(0)
  expect((await objectUrls(page)).made).toEqual([])
})

test('preview: an image File shows its own picture and a stored file its thumbnail URL; other files keep their icon', async ({ page }) => {
  await page.locator('[data-toggle="preview"]').click()
  await expect(thumbnailOf(page, 'photo-1.png')).toHaveAttribute('src', /^blob:/)
  await expect(thumbnailOf(page, 'site-photo.png')).toHaveAttribute('src', /^data:image\/png/)
  await expect(thumbnailOf(page, 'invoice.pdf')).toHaveCount(0)
  await expect(thumbnailOf(page, '2025-return.pdf')).toHaveCount(0)
  // The pictures load, and say nothing to a screen reader: the name beside them does.
  for (const name of ['photo-1.png', 'site-photo.png']) {
    await expect.poll(() => thumbnailOf(page, name).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBe(2)
    await expect(thumbnailOf(page, name)).toHaveAttribute('alt', '')
  }
  // One object URL, for the one image File.
  expect((await objectUrls(page)).made).toHaveLength(1)
})

test('preview: removing an image File revokes its object URL, and only its', async ({ page }) => {
  await page.locator('[data-add-photo]').click()
  await page.locator('[data-toggle="preview"]').click()
  await expect(thumbnailOf(page, 'photo-2.png')).toHaveAttribute('src', /^blob:/)
  const one = await thumbnailOf(page, 'photo-1.png').getAttribute('src')
  const two = await thumbnailOf(page, 'photo-2.png').getAttribute('src')
  expect((await objectUrls(page)).revoked).toEqual([])

  await page.getByRole('button', { name: 'Remove photo-1.png' }).click()
  await expect(row(page, 'photo-1.png')).toHaveCount(0)
  await expect.poll(async () => (await objectUrls(page)).revoked).toEqual([one])
  // Released: the URL no longer resolves. The other photo's still does.
  const resolves = (url: string | null) => page.evaluate((u) => fetch(u!).then(() => true, () => false), url)
  expect(await resolves(one)).toBe(false)
  expect(await resolves(two)).toBe(true)
})

test('preview: unmounting the list, or turning preview off, revokes every object URL it made', async ({ page }) => {
  await page.locator('[data-toggle="preview"]').click()
  await expect(thumbnailOf(page, 'photo-1.png')).toHaveAttribute('src', /^blob:/)
  await page.locator('[data-toggle="preview"]').click()
  await expect(page.locator('[data-file-thumbnail]')).toHaveCount(0)
  await expect.poll(async () => { const u = await objectUrls(page); return u.revoked.length === 1 && u.revoked[0] === u.made[0] }).toBe(true)

  await page.locator('[data-toggle="preview"]').click()
  await expect(thumbnailOf(page, 'photo-1.png')).toHaveAttribute('src', /^blob:/)
  await page.locator('[data-toggle="mounted"]').click()
  await expect(page.locator('[data-file-list]')).toHaveCount(0)
  const { made, revoked } = await objectUrls(page)
  expect(made).toHaveLength(2)
  expect(revoked).toEqual(made)
})

test('sizes are in 1024s by default; binary off, in decimal units', async ({ page }) => {
  await expect(row(page, 'site-photo.png')).toContainText('239.3 KB')
  await expect(row(page, '2025-return.pdf')).toContainText('1.7 MB')
  await page.locator('[data-toggle="binary"]').click()
  await expect(row(page, 'site-photo.png')).toContainText('245 kB')
  await expect(row(page, '2025-return.pdf')).toContainText('1.8 MB')
})

test('#leading and #trailing: a checkbox before the icon and a badge before Remove, with the row\'s item, index and removing', async ({ page }) => {
  const photo = row(page, 'site-photo.png')
  // Left to right: the slot's checkbox, the icon, the name, the size, the slot's badge, Remove.
  const x = async (sel: string) => (await photo.locator(sel).first().boundingBox())!.x
  const xs = [await x('[role="checkbox"]'), await x('.text-dimmed'), await x('text=site-photo.png'), await x('text=239.3 KB'), await x('[data-badge]'), await x('button[aria-label^="Remove"]')]
  expect(xs).toEqual([...xs].sort((p, q) => p - q))
  await expect(photo.locator('[data-badge="0"]')).toHaveText('Stored')
  await expect(row(page, 'photo-1.png').locator('[data-badge="2"]')).toHaveText('New')

  await expect(page.getByRole('checkbox', { name: 'Include site-photo.png' })).toBeChecked()
  await page.getByRole('checkbox', { name: 'Include invoice.pdf' }).click()
  await expect(page.getByTestId('included')).toHaveText('site-photo.png, invoice.pdf')

  // While a stored row's delete is pending, the slot sees removing: the page disables that row's checkbox.
  await page.getByRole('button', { name: 'Remove 2025-return.pdf' }).click()
  await expect(page.getByRole('checkbox', { name: 'Include 2025-return.pdf' })).toBeDisabled()
  await expect(page.getByRole('checkbox', { name: 'Include site-photo.png' })).toBeEnabled()
  await page.locator('[data-server-fail]').click()
  await expect(page.getByRole('checkbox', { name: 'Include 2025-return.pdf' })).toBeEnabled()
})
