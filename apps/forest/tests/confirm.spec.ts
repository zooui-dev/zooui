import { expect, test, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// useConfirm(), <ZConfirmDialog> and <ZConfirmButton> on Forest (page: app/pages/confirm.vue, host in app.vue). The
// behavior is covered in full on the base (apps/base/tests/confirm.spec.ts); here, that it works on the theme, and
// that on every scheme in light and dark the dialog's and the popover's text clears 4.5:1 and the dialog's icon 3:1.

const SCHEMES = ['teal', 'slate-cobalt', 'graphite-violet', 'paper-olive', 'ink-indigo', 'ember']

async function open(page: Page, baseURL: string, scheme = 'teal', mode: 'light' | 'dark' = 'light') {
  await page.context().addCookies([{ name: 'zooui-scheme', value: scheme, url: baseURL }])
  await page.addInitScript((m) => localStorage.setItem('zooui-color-mode', m), mode)
  await page.goto('/confirm')
  await page.waitForLoadState('networkidle')
  if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
  else await expect(page.locator('html')).not.toHaveClass(/dark/)
}

/** Click a trigger until what it opens is visible: a click before hydration does nothing. */
async function until(page: Page, click: () => Promise<void>, shown: () => Promise<void>) {
  await expect(async () => { await click(); await shown() }).toPass()
}

const askDelete = (page: Page) => until(page,
  () => page.locator('[data-ask="delete"]').click(),
  () => expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 1000 }))

const contrasts = (page: Page, selectors: Record<string, string>) => page.evaluate((list) => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  const rgb = (c: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3) }
  const lum = (c: number[]) => c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i]!, 0)
  // a translucent background (the icon badge's error/10) is laid over the opaque one under it
  const blend = (top: number[], alpha: number, under: number[]) => top.map((v, i) => v * alpha + under[i]! * (1 - alpha))
  const alphaOf = (c: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return ctx.getImageData(0, 0, 1, 1).data[3]! / 255 }
  return Object.fromEntries(Object.entries(list).map(([label, sel]) => {
    const el = document.querySelector(sel)
    if (!el) throw new Error(`contrast: nothing matches ${sel} (${label})`)
    const layers: string[] = []
    let bgEl: Element | null = el
    while (bgEl) {
      const bg = getComputedStyle(bgEl).backgroundColor
      if (!/rgba\(.*, 0\)$|transparent/.test(bg)) { layers.push(bg); if (alphaOf(bg) === 1) break }
      bgEl = bgEl.parentElement
    }
    let bg = rgb(layers.at(-1) ?? '#fff')
    for (const layer of layers.slice(0, -1).reverse()) bg = blend(rgb(layer), alphaOf(layer), bg)
    const [a, b] = [lum(rgb(getComputedStyle(el).color)), lum(bg)]
    return [label, (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)]
  }))
}, selectors)

test('works on the theme: confirmDelete resolves on Delete and on Escape; ZConfirmButton emits only on yes', async ({ page, baseURL }) => {
  await open(page, baseURL!)
  await askDelete(page)
  await expect(page.getByRole('alertdialog', { name: 'Delete the Hartwell invoice?' }).getByRole('button', { name: 'Cancel' })).toBeFocused()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
  await expect(page.locator('[data-answers] li')).toHaveText(['delete: true'])
  await askDelete(page)
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-answers] li')).toHaveText(['delete: true', 'delete: false'])

  const question = page.getByRole('dialog', { name: 'Remove row' })
  await until(page, () => page.getByRole('button', { name: 'Remove row' }).click(), () => expect(question).toBeVisible({ timeout: 1000 }))
  await question.getByRole('button', { name: 'Keep' }).click()
  await page.getByRole('button', { name: 'Remove row' }).click()
  await question.getByRole('button', { name: 'Remove' }).click()
  await expect(page.locator('[data-button-events]')).toHaveText('cancel,confirm')
})

for (const mode of ['light', 'dark'] as const) {
  test.describe(`inks (${mode})`, () => {
    for (const scheme of SCHEMES) {
      test(scheme, async ({ page, baseURL }) => {
        await open(page, baseURL!, scheme, mode)
        await askDelete(page)
        const d = '[role="alertdialog"]'
        const text = await contrasts(page, {
          title: `${d} [data-slot="title"]`,
          description: `${d} [data-slot="description"]`,
          detail: `${d} [data-confirm-details] li`,
          cancel: `${d} [data-confirm-cancel]`,
          delete: `${d} [data-confirm-action]`,
        })
        expect(Object.entries(text).filter(([, r]) => r < 4.5)).toEqual([])
        const icon = await contrasts(page, { icon: `${d} [data-confirm-icon]` })
        expect(Object.entries(icon).filter(([, r]) => r < 3)).toEqual([])
        expect(await page.evaluate(findConflicts)).toEqual([])
        await page.keyboard.press('Escape')
        await expect(page.getByRole('alertdialog')).toBeHidden()

        const question = page.getByRole('dialog', { name: 'Remove row' })
        await until(page, () => page.getByRole('button', { name: 'Remove row' }).click(), () => expect(question).toBeVisible({ timeout: 1000 }))
        const popover = await contrasts(page, {
          question: '[data-confirm-popover] p.font-semibold',
          description: '[data-confirm-popover] p.text-muted',
          keep: '[data-confirm-popover] [data-confirm-cancel]',
          remove: '[data-confirm-popover] [data-confirm-action]',
        })
        expect(Object.entries(popover).filter(([, r]) => r < 4.5)).toEqual([])
      })
    }
  })
}
