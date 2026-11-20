import { expect, test, type Page } from '@playwright/test'
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

// useConfirm(), <ZConfirmDialog> and <ZConfirmButton> on the theme-free base, in a production build (page:
// app/pages/confirm.vue, host in app.vue). Every helper for every way out — the action, Cancel, Escape, the close
// button —, where focus starts, the alertdialog role and name, a second call waiting for the first, the server
// answering at once, the button emitting only on yes, and the dialog in the product's error color in light and dark.

async function open(page: Page, mode: 'light' | 'dark' = 'light') {
  await page.addInitScript((m) => localStorage.setItem('product-color-mode', m), mode)
  await page.goto('/confirm')
  await page.waitForLoadState('networkidle')
}

const dialog = (page: Page) => page.getByRole('alertdialog')
const answers = (page: Page) => page.locator('[data-answers] li')

/** Click a trigger until its dialog opens: a click before hydration does nothing. */
async function ask(page: Page, which: string) {
  await expect(async () => {
    await page.locator(`[data-ask="${which}"]`).click()
    await expect(dialog(page)).toBeVisible({ timeout: 1000 })
  }).toPass()
}

type Exit = 'action' | 'cancel' | 'escape' | 'close'

async function leave(page: Page, exit: Exit, action?: string) {
  const d = dialog(page)
  if (exit === 'action') await d.getByRole('button', { name: action, exact: true }).click()
  if (exit === 'cancel') await d.locator('[data-confirm-cancel]').click()
  if (exit === 'escape') await page.keyboard.press('Escape')
  if (exit === 'close') await d.getByRole('button', { name: 'Close' }).click()
  await expect(d).toBeHidden()
}

const cases: { which: string, exit: Exit, action?: string, answer: string }[] = [
  { which: 'confirm', exit: 'action', action: 'Publish', answer: 'confirm: true' },
  { which: 'confirm', exit: 'cancel', answer: 'confirm: false' },
  { which: 'confirm', exit: 'escape', answer: 'confirm: false' },
  { which: 'confirm', exit: 'close', answer: 'confirm: false' },
  { which: 'choose', exit: 'action', action: 'Save', answer: 'choose: "save"' },
  { which: 'choose', exit: 'action', action: 'Discard', answer: 'choose: "discard"' },
  { which: 'choose', exit: 'cancel', answer: 'choose: null' },
  { which: 'choose', exit: 'escape', answer: 'choose: null' },
  { which: 'choose', exit: 'close', answer: 'choose: null' },
  { which: 'delete', exit: 'action', action: 'Delete', answer: 'delete: true' },
  { which: 'delete', exit: 'cancel', answer: 'delete: false' },
  { which: 'delete', exit: 'escape', answer: 'delete: false' },
  { which: 'delete', exit: 'close', answer: 'delete: false' },
  { which: 'discard', exit: 'action', action: 'Discard', answer: 'discard: true' },
  { which: 'discard', exit: 'cancel', answer: 'discard: false' },
  { which: 'discard', exit: 'escape', answer: 'discard: false' },
  { which: 'discard', exit: 'close', answer: 'discard: false' },
]

test.describe('each helper resolves for each way out', () => {
  for (const c of cases) {
    test(`${c.which}, by ${c.exit}${c.action ? ` (${c.action})` : ''} → ${c.answer}`, async ({ page }) => {
      await open(page)
      await ask(page, c.which)
      await leave(page, c.exit, c.action)
      await expect(answers(page)).toHaveText([c.answer])
    })
  }
})

test('announced as an alertdialog named by its question and described by its description; details listed', async ({ page }) => {
  await open(page)
  await ask(page, 'delete')
  const d = page.getByRole('alertdialog', { name: 'Delete the Hartwell invoice?' })
  await expect(d).toBeVisible()
  await expect(d).toHaveAccessibleDescription('This can’t be undone.')
  await expect(d.locator('[data-confirm-details] li')).toHaveText(['Invoice 1042 · $1,200.00', '2 payments recorded'])
  await expect(page.getByRole('dialog')).toHaveCount(0)
  // the icon is decoration: the name is the question alone
  await expect(d.locator('[data-confirm-icon] svg')).toBeVisible()
})

test.describe('where focus starts', () => {
  test('a destructive confirm (confirmDelete) starts on Cancel, so Enter cancels', async ({ page }) => {
    await open(page)
    await ask(page, 'delete')
    await expect(dialog(page).getByRole('button', { name: 'Cancel' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(answers(page)).toHaveText(['delete: false'])
  })

  test('confirmDiscard starts on Keep editing', async ({ page }) => {
    await open(page)
    await ask(page, 'discard')
    await expect(dialog(page).getByRole('button', { name: 'Keep editing' })).toBeFocused()
  })

  test('a plain confirm starts on its confirming action, so Enter confirms', async ({ page }) => {
    await open(page)
    await ask(page, 'confirm')
    await expect(dialog(page).getByRole('button', { name: 'Publish' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(answers(page)).toHaveText(['confirm: true'])
  })

  test('choose starts on its last action; focus goes back to the trigger when it closes', async ({ page }) => {
    await open(page)
    await ask(page, 'choose')
    await expect(dialog(page).getByRole('button', { name: 'Save' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-ask="choose"]')).toBeFocused()
  })
})

test('a second call queues: it opens once the first is answered, and each resolves with its own answer', async ({ page }) => {
  await open(page)
  await ask(page, 'two')
  await expect(page.getByRole('alertdialog', { name: 'First question?' })).toBeVisible()
  await expect(page.getByRole('alertdialog')).toHaveCount(1)
  await dialog(page).getByRole('button', { name: 'Confirm' }).click()
  await expect(answers(page)).toHaveText(['first: true'])

  const second = page.getByRole('alertdialog', { name: 'Second question?' })
  await expect(second).toBeVisible()
  await expect(second.getByRole('button', { name: 'Yes' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(second).toBeHidden()
  await expect(answers(page)).toHaveText(['first: true', 'second: false'])
})

test('dismissAll() closes the open dialog and cancels it and the one waiting', async ({ page }) => {
  await open(page)
  await ask(page, 'dismiss-all')
  await expect(page.getByRole('alertdialog', { name: 'First question?' })).toBeVisible()
  await expect(dialog(page)).toBeHidden()
  await expect(answers(page)).toHaveText(['first: false', 'second: false'])
  // nothing is left open or waiting: the next question opens as usual
  await ask(page, 'confirm')
  await expect(page.getByRole('alertdialog', { name: 'Publish the report?' })).toBeVisible()
})

test('on the server, a call resolves at once as a cancel and the page still renders', async ({ page }) => {
  await open(page)
  await expect(page.locator('[data-server-answer]')).toHaveText('false')
})

test.describe('ZConfirmButton', () => {
  const trigger = (page: Page) => page.getByRole('button', { name: 'Remove row' })
  const events = (page: Page) => page.locator('[data-button-events]')
  const question = (page: Page) => page.getByRole('dialog', { name: 'Remove row' })

  async function openQuestion(page: Page) {
    await expect(async () => {
      await trigger(page).click()
      await expect(question(page)).toBeVisible({ timeout: 1000 })
    }).toPass()
  }

  test('UButton props and attributes pass through', async ({ page }) => {
    await open(page)
    await expect(trigger(page)).toHaveAttribute('data-button', 'remove')
    await expect(trigger(page).locator('svg')).toBeVisible()
    await expect(trigger(page)).toHaveClass(/text-error/)
  })

  test('asks in a popover named by the button and described by the question, with focus on the declining button', async ({ page }) => {
    await open(page)
    await openQuestion(page)
    await expect(question(page)).toHaveAccessibleDescription('Remove this row? Its amounts leave the total.')
    await expect(question(page).getByRole('button', { name: 'Keep' })).toBeFocused()
  })

  test('emits confirm only when answered yes; No, Escape and a click outside emit cancel', async ({ page }) => {
    await open(page)
    await openQuestion(page)
    await question(page).getByRole('button', { name: 'Keep' }).click()
    await expect(question(page)).toBeHidden()
    await expect(events(page)).toHaveText('cancel')
    await expect(trigger(page)).toBeFocused()

    await openQuestion(page)
    await page.keyboard.press('Escape')
    await expect(question(page)).toBeHidden()
    await expect(events(page)).toHaveText('cancel,cancel')

    await openQuestion(page)
    // reka listens for an outside pointer a tick after opening: retried, so a click in that tick doesn't fail the test
    await expect(async () => {
      await page.getByRole('heading', { name: 'Zoo UI base' }).click()
      await expect(question(page)).toBeHidden({ timeout: 1000 })
    }).toPass()
    await expect(events(page)).toHaveText('cancel,cancel,cancel')

    await openQuestion(page)
    await question(page).getByRole('button', { name: 'Remove' }).click()
    await expect(question(page)).toBeHidden()
    await expect(events(page)).toHaveText('cancel,cancel,cancel,confirm')
  })

  test('Enter on the opened question declines', async ({ page }) => {
    await open(page)
    await openQuestion(page)
    await page.keyboard.press('Enter')
    await expect(question(page)).toBeHidden()
    await expect(events(page)).toHaveText('cancel')
  })
})

for (const mode of ['light', 'dark'] as const) {
  test(`the product's error color (${mode}): the delete dialog's edge, icon and Delete button; no conflicting utilities`, async ({ page }) => {
    await open(page, mode)
    if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
    await ask(page, 'delete')
    const d = dialog(page)
    const got = await d.evaluate((root) => ({
      edge: getComputedStyle(root).borderTopColor,
      icon: getComputedStyle(root.querySelector('[data-confirm-icon]')!).color,
      action: getComputedStyle(root.querySelector('[data-confirm-action]')!).backgroundColor,
      error: (() => {
        const p = document.createElement('div'); p.style.color = 'var(--ui-error)'; root.append(p)
        const c = getComputedStyle(p).color; p.remove(); return c
      })(),
    }))
    expect(got.edge).toBe(got.error)
    expect(got.icon).toBe(got.error)
    expect(got.action).toBe(got.error)
    expect(await page.evaluate(findConflicts)).toEqual([])
  })
}
