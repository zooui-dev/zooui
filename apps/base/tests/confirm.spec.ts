import { expect, test, type Locator, type Page } from '@playwright/test'
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

/** Wait out the dialog's opening animation, which scales it: measure only once it has settled. */
const settled = (page: Page) => dialog(page).evaluate((el) =>
  Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)).then(() => undefined))

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
  const d = page.getByRole('alertdialog', { name: 'Delete the Lakeside order', exact: true })
  await expect(d).toBeVisible()
  await expect(d).toHaveAccessibleDescription('Are you sure you want to delete the Lakeside order? This action cannot be undone.')
  await expect(d.locator('[data-confirm-details] li')).toHaveText(['Order 1042 · $1,200.00', '2 payments recorded'])
  await expect(page.getByRole('dialog')).toHaveCount(0)
  // the icon is decoration: the name is the question alone
  await expect(d.locator('[data-confirm-icon] svg')).toBeVisible()
})

test("the layout: the badge beside the description in the body, the details beneath it in its column", async ({ page }) => {
  await open(page)
  await ask(page, 'delete')
  const d = dialog(page)
  await settled(page)
  const box = async (sel: string) => (await d.locator(sel).first().boundingBox())!
  // nothing but the question in the title: the badge is in the body
  await expect(d.locator('[data-slot="title"] [data-confirm-icon]')).toHaveCount(0)
  await expect(d.locator('[data-slot="body"] [data-confirm-icon]')).toBeVisible()
  await expect(d.locator('[data-slot="header"] [data-slot="description"]')).toHaveCount(0)
  const badge = await box('[data-confirm-icon]')
  const description = await box('[data-confirm-description]')
  const detail = await box('[data-confirm-details] li')
  expect(badge.width).toBeCloseTo(40, 0)
  expect(description.x).toBeGreaterThanOrEqual(badge.x + badge.width)
  expect(description.y).toBeLessThan(badge.y + badge.height)
  expect(detail.x).toBeCloseTo(description.x, 0)
  expect(detail.y).toBeGreaterThan(description.y)
})

test('a question with no description is not described by an empty element, and shows no body', async ({ page }) => {
  await open(page)
  await ask(page, 'two')
  const d = page.getByRole('alertdialog', { name: 'First question?' })
  await expect(d).toHaveAccessibleDescription('')
  await expect(d.locator('[data-slot="body"]')).toHaveCount(0)
})

test.describe('where focus starts', () => {
  test('a destructive confirm (confirmDelete) starts on Cancel, so Enter cancels', async ({ page }) => {
    await open(page)
    await ask(page, 'delete')
    await expect(dialog(page).getByRole('button', { name: 'Cancel' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(answers(page)).toHaveText(['delete: false'])
  })

  test('confirmDiscard starts on Keep Editing', async ({ page }) => {
    await open(page)
    await ask(page, 'discard')
    await expect(dialog(page).getByRole('button', { name: 'Keep Editing' })).toBeFocused()
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

type Prop = 'color' | 'backgroundColor' | 'borderTopColor'

/** Computed colors inside `scope` (`[selector, property]`, '' for the scope itself), beside the Nuxt UI tokens named,
 *  each resolved inside the scope so a scoped palette applies. */
function colorsIn<K extends string, T extends string>(scope: Locator, picks: Record<K, [string, Prop]>, tokens: T[]) {
  return scope.evaluate((root, [picks, tokens]) => {
    const out: Record<string, string> = {}
    for (const [key, [sel, prop]] of Object.entries(picks)) out[key] = getComputedStyle(sel ? root.querySelector(sel)! : root)[prop]
    for (const name of tokens) {
      const p = document.createElement('div'); p.style.color = `var(--ui-${name})`; root.append(p)
      out[name] = getComputedStyle(p).color; p.remove()
    }
    return out
  }, [picks, tokens] as const) as Promise<Record<K | T, string>>
}

const dialogColors = (page: Page) => colorsIn(dialog(page), {
  edge: ['', 'borderTopColor'],
  badge: ['[data-confirm-icon]', 'color'],
  action: ['[data-confirm-action]', 'backgroundColor'],
}, ['warning', 'error', 'primary'])

test.describe('confirmColor: the confirming button in its own color', () => {
  test('a warning dialog with a primary button keeps the warning edge and badge, and opens on the button', async ({ page }) => {
    await open(page)
    await ask(page, 'mixed')
    const got = await dialogColors(page)
    expect(got.edge).toBe(got.warning)
    expect(got.badge).toBe(got.warning)
    expect(got.action).toBe(got.primary)
    await expect(dialog(page).getByRole('button', { name: 'Publish anyway' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(answers(page)).toHaveText(['mixed: true'])
  })

  test('a red button makes it destructive: focus starts on Cancel, so Enter cancels', async ({ page }) => {
    await open(page)
    await ask(page, 'warn-red')
    const got = await dialogColors(page)
    expect(got.badge).toBe(got.warning)
    expect(got.action).toBe(got.error)
    await expect(dialog(page).getByRole('button', { name: 'Cancel' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(answers(page)).toHaveText(['warn-red: false'])
  })

  test('confirmDiscard: a warning badge with a red Discard', async ({ page }) => {
    await open(page)
    await ask(page, 'discard')
    const got = await dialogColors(page)
    expect(got.badge).toBe(got.warning)
    expect(got.action).toBe(got.error)
  })
})

test.describe('an icon from the color', () => {
  const icon = (page: Page) => dialog(page).locator('[data-confirm-icon]')

  test('error, with no icon given, shows circle-alert; warning shows the triangle; a named icon wins', async ({ page }) => {
    await open(page)
    await ask(page, 'error-icon')
    await expect(icon(page)).toHaveAttribute('data-confirm-icon', 'i-lucide-circle-alert')
    await expect(icon(page).locator('svg')).toBeVisible()
    // decoration only: the dialog is still named by its question alone
    await expect(page.getByRole('alertdialog', { name: 'Revoke the API token?', exact: true })).toBeVisible()
    await leave(page, 'escape')

    await ask(page, 'warn-red')
    await expect(icon(page)).toHaveAttribute('data-confirm-icon', 'i-lucide-triangle-alert')
    await leave(page, 'escape')

    await ask(page, 'delete')
    await expect(icon(page)).toHaveAttribute('data-confirm-icon', 'i-lucide-trash-2')
  })

  test('icon: false shows none, and a question with no color shows none', async ({ page }) => {
    await open(page)
    await ask(page, 'no-icon')
    await expect(icon(page)).toHaveCount(0)
    await leave(page, 'escape')
    await ask(page, 'confirm')
    await expect(icon(page)).toHaveCount(0)
  })
})

test('two-part details: a line break or { title, text } is a heading over its text; a plain line stays one', async ({ page }) => {
  await open(page)
  await ask(page, 'details')
  const items = dialog(page).locator('[data-confirm-details] li')
  await expect(items).toHaveCount(3)
  await settled(page)

  for (const [i, title, text] of [
    [0, 'Time Zone Mismatch', 'This file is in UTC; the workspace reports in Pacific time.'],
    [1, 'Missing people', '3 people in the file aren’t in the team directory.'],
  ] as const) {
    const heading = items.nth(i).locator('[data-confirm-detail-title]')
    await expect(heading).toHaveText(title)
    await expect(heading).toHaveClass(/font-medium/)
    await expect(heading).toHaveClass(/text-highlighted/)
    await expect(items.nth(i).locator('[data-confirm-detail-text]')).toHaveText(text)
    // laid out as two lines, not run together
    const [top, below] = await Promise.all([heading.boundingBox(), items.nth(i).locator('[data-confirm-detail-text]').boundingBox()])
    expect(below!.y).toBeGreaterThanOrEqual(top!.y + top!.height - 1)
  }
  await expect(items.nth(2).locator('[data-confirm-detail-title], [data-confirm-detail-text]')).toHaveCount(0)
  await expect(items.nth(2)).toHaveText('12 tasks will be imported')
  // details but no description: no badge, the details still indented to the description's column
  await expect(dialog(page).locator('[data-confirm-icon]')).toHaveCount(0)
  await expect(dialog(page).locator('[data-confirm-details]')).toHaveCSS('padding-left', '52px')
})

test.describe('dismissible: false', () => {
  test('Escape and a click outside leave it open; the close button and Cancel still cancel', async ({ page }) => {
    await open(page)
    await ask(page, 'sticky')
    await page.keyboard.press('Escape')
    await page.mouse.click(5, 5)
    await page.waitForTimeout(300)
    await expect(dialog(page)).toBeVisible()
    await expect(answers(page)).toHaveCount(0)
    await leave(page, 'close')
    await expect(answers(page)).toHaveText(['sticky: false'])

    await ask(page, 'sticky')
    await leave(page, 'cancel')
    await ask(page, 'sticky')
    await leave(page, 'action', 'Sign')
    await expect(answers(page)).toHaveText(['sticky: false', 'sticky: false', 'sticky: true'])
  })

  test('every other question still closes on Escape and a click outside', async ({ page }) => {
    await open(page)
    await ask(page, 'confirm')
    await expect(async () => {
      await page.mouse.click(5, 5)
      await expect(dialog(page)).toBeHidden({ timeout: 1000 })
    }).toPass()
    await expect(answers(page)).toHaveText(['confirm: false'])
  })
})

test("the footer: Cancel on the left, the answers together on the right", async ({ page }) => {
  await open(page)
  await ask(page, 'choose')
  const box = async (l: Locator) => (await l.boundingBox())!
  const footer = await box(dialog(page).locator('[data-slot="footer"]'))
  const cancel = await box(dialog(page).locator('[data-confirm-cancel]'))
  const discard = await box(dialog(page).getByRole('button', { name: 'Discard' }))
  const save = await box(dialog(page).getByRole('button', { name: 'Save' }))
  const pad = 32
  expect(cancel.x - footer.x).toBeLessThan(pad)
  expect(footer.x + footer.width - (save.x + save.width)).toBeLessThan(pad)
  // Discard sits beside Save, not in the middle
  expect(save.x - (discard.x + discard.width)).toBeLessThan(16)
  expect(discard.x - (cancel.x + cancel.width)).toBeGreaterThan(40)
})

test("size: 'lg' is wider than the default", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await open(page)
  // the computed cap, not the box: the box is scaled while the dialog animates open
  const maxWidth = () => dialog(page).evaluate((el) => getComputedStyle(el).maxWidth)
  await ask(page, 'confirm')
  expect(await maxWidth()).toBe('448px')
  await leave(page, 'escape')
  await ask(page, 'wide')
  expect(await maxWidth()).toBe('768px')
  await expect.poll(async () => (await dialog(page).boundingBox())!.width).toBeGreaterThan(700)
})

test.describe('ZConfirmButton options', () => {
  test('confirm-enabled false: a plain button whose click emits confirm at once; ticked again, it asks', async ({ page }) => {
    await open(page)
    const archive = page.getByRole('button', { name: 'Archive', exact: true })
    const events = page.locator('[data-archive-events]')
    const question = page.getByRole('dialog', { name: 'Archive' })

    await expect(async () => {
      await page.getByRole('checkbox', { name: 'Ask before archiving' }).click()
      await expect(page.getByRole('checkbox', { name: 'Ask before archiving' })).not.toBeChecked({ timeout: 1000 })
    }).toPass()
    await expect(archive).toHaveAttribute('data-button', 'archive')
    await expect(archive).not.toHaveAttribute('aria-haspopup')
    await archive.click()
    await expect(events).toHaveText('confirm')
    await expect(question).toHaveCount(0)
    await archive.click()
    await expect(events).toHaveText('confirm,confirm')

    await page.getByRole('checkbox', { name: 'Ask before archiving' }).click()
    await archive.click()
    await expect(question).toBeVisible()
    await expect(events).toHaveText('confirm,confirm')
    await question.getByRole('button', { name: 'Archive' }).click()
    await expect(events).toHaveText('confirm,confirm,confirm')
  })

  test('confirm-enabled turned off while the question is open: it closes as a cancel and does not come back', async ({ page }) => {
    await open(page)
    const question = page.getByRole('dialog', { name: 'Archive' })
    const events = page.locator('[data-archive-events]')
    const box = page.getByRole('checkbox', { name: 'Ask before archiving' })
    await expect(async () => {
      await page.locator('[data-open-then-stop]').click()
      await expect(question).toBeVisible({ timeout: 1000 })
    }).toPass()
    // the page unticks the box from code 600ms later
    await expect(box).not.toBeChecked()
    await expect(question).toHaveCount(0)
    await expect(events).toHaveText('cancel')
    await expect(page.locator('[data-archive-open]')).toHaveText('false')

    await box.click()
    await expect(box).toBeChecked()
    await page.waitForTimeout(300)
    await expect(question).toHaveCount(0)
    await expect(events).toHaveText('cancel')
  })

  async function openPopover(page: Page, name: string) {
    const question = page.getByRole('dialog', { name })
    await expect(async () => {
      await page.getByRole('button', { name, exact: true }).click()
      await expect(question).toBeVisible({ timeout: 1000 })
    }).toPass()
    return question
  }

  test("the look by default: an outline Yes, the alert icon before the question, an arrow", async ({ page }) => {
    await open(page)
    const question = await openPopover(page, 'Remove row')

    // the icon is decoration: the description is still the question and its line
    const icon = question.locator('[data-confirm-question-icon]')
    await expect(icon).toBeVisible()
    await expect(icon).toHaveAttribute('data-confirm-question-icon', 'i-lucide-circle-alert')
    await expect(icon).toHaveAttribute('aria-hidden', 'true')
    await expect(question).toHaveAccessibleDescription('Remove this row? Its amounts leave the total.')

    const got = await colorsIn(question, {
      background: ['[data-confirm-action]', 'backgroundColor'],
      ink: ['[data-confirm-action]', 'color'],
    }, ['error'])
    // outline: error ink on no fill, where solid would fill it with error
    expect(got.background).toBe('rgba(0, 0, 0, 0)')
    expect(got.ink).toBe(got.error)
    await expect(page.locator('[data-slot="arrow"]')).toBeVisible()
  })

  test('confirm-variant="solid", :question-icon="false" and :arrow="false" turn each off', async ({ page }) => {
    await open(page)
    const question = await openPopover(page, 'Revoke token')
    await expect(question.locator('[data-confirm-question-icon]')).toHaveCount(0)
    await expect(page.locator('[data-slot="arrow"]')).toHaveCount(0)
    const got = await colorsIn(question, { background: ['[data-confirm-action]', 'backgroundColor'] }, ['error'])
    expect(got.background).toBe(got.error)
    await question.getByRole('button', { name: 'Revoke' }).click()
    await expect(page.locator('[data-revoke-events]')).toHaveText('confirm')
  })

  test('question-icon names its own icon', async ({ page }) => {
    await open(page)
    const question = await openPopover(page, 'Archive')
    await expect(question.locator('[data-confirm-question-icon]')).toBeVisible()
    await expect(question.locator('[data-confirm-question-icon]')).toHaveAttribute('data-confirm-question-icon', 'i-lucide-triangle-alert')
  })
})
