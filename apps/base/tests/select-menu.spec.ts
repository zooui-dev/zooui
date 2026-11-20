import { expect, test, type Locator, type Page } from '@playwright/test'

// ZSelectMenu (pages/select-menu.vue) on the theme-free base: its four keyboard behaviors — the selected item
// highlighted on open, typeahead on the closed menu (from the top of the list, telling a UForm), open on focus, close
// on Tab — and its focus ring on any focus, with a search input, without one,
// with `multiple` and with grouped items; each switched off; and the same props, slots and events on a plain
// USelectMenu and a ZSelectMenu, which must behave and paint alike in light and dark. The matching rules themselves
// are unit-tested in scripts/select-typeahead.test.mjs.

const hydrated = (page: Page) => page.waitForFunction(() => !!(document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__)

async function open(page: Page, mode: 'light' | 'dark' = 'light') {
  await page.addInitScript((m) => localStorage.setItem('product-color-mode', m), mode)
  await page.goto('/select-menu')
  await page.waitForLoadState('networkidle')
  await hydrated(page)
}

const section = (page: Page, name: string) => page.locator(`[data-specimen="${name}"]`)
const menu = (page: Page, name: string) => section(page, name).locator('[data-menu]')
const value = (page: Page, name: string) => section(page, name).locator('[data-value]')
const before = (page: Page, name: string) => section(page, name).locator('[data-before]')
const after = (page: Page, name: string) => section(page, name).locator('[data-after]')
// The open menu (the content is the listbox itself); a closing one stays in the DOM through its exit animation.
const listbox = (page: Page) => page.locator('[role="listbox"][data-state="open"]')
const highlighted = (page: Page) => listbox(page).locator('[role="option"][data-highlighted]')
const search = (page: Page) => listbox(page).locator('input')
const focused = (l: Locator) => expect(l).toBeFocused()

test.beforeEach(async ({ page }) => open(page))
// A clicked option leaves the pointer where the reopened menu puts an item, which it then highlights on hover.
const pointerAway = (page: Page) => page.mouse.move(0, 0)

test.describe('the selected item is highlighted on open', () => {
  test('with a search input: arrow keys go on from it', async ({ page }) => {
    await menu(page, 'plain').focus()
    await page.keyboard.press('ArrowDown')
    await expect(highlighted(page)).toHaveText('Cherry')
    await expect(listbox(page).getByRole('option', { name: 'Cherry' })).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('ArrowDown')
    await expect(highlighted(page)).toHaveText('Date')
  })

  test('opened with a click, too', async ({ page }) => {
    await menu(page, 'plain').click()
    await expect(highlighted(page)).toHaveText('Cherry')
  })

  test('without a search input, on objects by value-key', async ({ page }) => {
    await menu(page, 'no-search').focus()
    await page.keyboard.press('Enter')
    await expect(highlighted(page)).toHaveText('Grace Hopper')
    await page.keyboard.press('ArrowDown')
    await expect(highlighted(page)).toHaveText('Katherine Johnson')
  })

  test('with multiple: the first selected item', async ({ page }) => {
    await menu(page, 'multiple').focus()
    await page.keyboard.press('ArrowDown')
    await expect(highlighted(page)).toHaveText('Cherry')
    await page.keyboard.press('ArrowDown')
    await expect(highlighted(page)).toHaveText('Date')
  })

  test('with grouped items: the selected one, across the groups', async ({ page }) => {
    await menu(page, 'grouped').click()
    await listbox(page).getByRole('option', { name: 'Asparagus' }).click()
    await expect(value(page, 'grouped')).toHaveText('Asparagus')
    await expect(page.getByRole('listbox')).toHaveCount(0) // closed, past its exit animation
    await pointerAway(page)
    await menu(page, 'grouped').press('ArrowDown')
    await expect(highlighted(page)).toHaveText('Asparagus')
    await page.keyboard.press('ArrowDown')
    await expect(highlighted(page)).toHaveText('Carrot')
  })

  test('switched off: the first item, whatever is selected', async ({ page }) => {
    await menu(page, 'off').focus()
    await page.keyboard.press('ArrowDown')
    await expect(highlighted(page)).toHaveText('Apple')
    await expect(listbox(page).getByRole('option', { name: 'Cherry' })).toHaveAttribute('aria-selected', 'true')
  })
})

test.describe('typeahead on the closed menu', () => {
  test('picks the first item that starts with what was typed, without opening, and announces it', async ({ page }) => {
    await menu(page, 'plain').focus()
    await page.keyboard.type('bl')
    await expect(value(page, 'plain')).toHaveText('Blueberry')
    await expect(menu(page, 'plain')).toHaveText('Blueberry')
    await expect(menu(page, 'plain')).toHaveAttribute('aria-expanded', 'false')
    await expect(listbox(page)).toHaveCount(0)
    const live = section(page, 'plain').locator('[data-select-menu-announce]')
    await expect(live).toHaveAttribute('aria-live', 'polite')
    await expect(live).toHaveText('Blueberry')
  })

  test('one letter again and again cycles through the items that start with it', async ({ page }) => {
    await menu(page, 'plain').focus()
    await page.keyboard.press('b')
    await expect(value(page, 'plain')).toHaveText('Banana')
    await page.keyboard.press('b')
    await expect(value(page, 'plain')).toHaveText('Blueberry')
    await page.keyboard.press('b')
    await expect(value(page, 'plain')).toHaveText('Banana')
  })

  test('searches from the top of the list, though the value sits lower; a repeated letter cycles on from it', async ({ page }) => {
    await menu(page, 'states').focus()
    await expect(value(page, 'states')).toHaveText('Colorado')
    await page.keyboard.press('c')
    await expect(value(page, 'states')).toHaveText('California')
    await page.keyboard.press('c')
    await expect(value(page, 'states')).toHaveText('Colorado')
    await page.keyboard.press('c')
    await expect(value(page, 'states')).toHaveText('Connecticut')
    await page.keyboard.press('c')
    await expect(value(page, 'states')).toHaveText('California')
  })

  test('a longer search from the top: "con" from Colorado lands on Connecticut, "co" stays', async ({ page }) => {
    await menu(page, 'states').focus()
    await page.keyboard.type('co')
    await expect(value(page, 'states')).toHaveText('Colorado')
    await page.keyboard.press('n')
    await expect(value(page, 'states')).toHaveText('Connecticut')
  })

  test('a pick tells a surrounding UForm, which validates on change', async ({ page }) => {
    const form = section(page, 'form')
    await menu(page, 'form').focus()
    await page.keyboard.press('b')
    await expect(value(page, 'form')).toHaveText('Banana')
    await expect(form.getByText('Bananas are out of season')).toBeVisible()
    await expect(menu(page, 'form')).toHaveAttribute('aria-invalid', 'true')
    await page.keyboard.press('b')
    await expect(value(page, 'form')).toHaveText('Blueberry')
    await expect(form.getByText('Bananas are out of season')).toHaveCount(0)
    await expect(menu(page, 'form')).toHaveAttribute('aria-invalid', 'false')
  })

  test('v-model\'s modifiers apply to a pick: .number writes a number', async ({ page }) => {
    await menu(page, 'number').focus()
    await page.keyboard.press('2')
    await expect(value(page, 'number')).toHaveText('20')
    await expect(section(page, 'number').locator('[data-type]')).toHaveText('number')
  })

  test('reads label-key and hands back value-key, without a search input', async ({ page }) => {
    await menu(page, 'no-search').focus()
    await page.keyboard.press('a')
    await expect(value(page, 'no-search')).toHaveText('1')
    await page.keyboard.press('a')
    await expect(value(page, 'no-search')).toHaveText('2')
    await expect(menu(page, 'no-search')).toHaveText('Alan Turing')
  })

  test('skips group labels, separators and disabled items', async ({ page }) => {
    await menu(page, 'grouped').focus()
    await page.keyboard.press('a')
    await expect(value(page, 'grouped')).toHaveText('Apple')
    await page.keyboard.press('a') // Avocado is disabled
    await expect(value(page, 'grouped')).toHaveText('Asparagus')
    await page.keyboard.press('f') // "Fruit" is a group label
    await expect(value(page, 'grouped')).toHaveText('Asparagus')
  })

  test('with multiple and a search input: opens with the letter in the search, and keeps the selection', async ({ page }) => {
    await menu(page, 'multiple').focus()
    await page.keyboard.press('g')
    await expect(search(page)).toBeFocused()
    await expect(search(page)).toHaveValue('g')
    await expect(value(page, 'multiple')).toHaveText('Cherry,Fig')
    await page.keyboard.press('r') // typing carries on in the search
    await expect(listbox(page).getByRole('option')).toHaveText(['Grape'])
    await expect(highlighted(page)).toHaveText('Grape')
    await page.keyboard.press('Enter')
    await expect(value(page, 'multiple')).toHaveText('Cherry,Fig,Grape')
  })

  test('with multiple and no search input: opens on the match, and keeps the selection', async ({ page }) => {
    await menu(page, 'multiple-no-search').focus()
    await page.keyboard.press('g')
    await expect(highlighted(page)).toHaveText('Grape')
    await expect(value(page, 'multiple-no-search')).toHaveText('Date')
  })

  test('Space still opens the menu', async ({ page }) => {
    await menu(page, 'plain').focus()
    await page.keyboard.press(' ')
    await expect(listbox(page)).toBeVisible()
    await expect(value(page, 'plain')).toHaveText('Cherry')
  })

  test('switched off: typing does nothing', async ({ page }) => {
    await menu(page, 'off').focus()
    await page.keyboard.type('ap')
    await expect(listbox(page)).toHaveCount(0)
    await expect(value(page, 'off')).toHaveText('Cherry')
  })
})

test.describe('the focus ring shows on any focus', () => {
  const ringNative = (page: Page) => section(page, 'ring').locator('[data-ring-native]')
  const ringWrapped = (page: Page) => section(page, 'ring').locator('[data-ring-wrapped]')
  const textField = (page: Page) => section(page, 'ring').getByPlaceholder('Text field')
  // The focus look: the ring (a box-shadow) and the halo (the outline), colors included.
  const look = (l: Locator) => l.evaluate((el) => {
    const c = getComputedStyle(el)
    return { ring: c.boxShadow, outline: `${c.outlineStyle} ${c.outlineWidth} ${c.outlineColor}`, offset: c.outlineOffset }
  })
  // A focused UInput's look, the one a focused menu must match: Nuxt UI's 1px ring and its 3px translucent halo.
  const inputFocused = async (page: Page) => {
    await textField(page).click()
    await expect(textField(page)).toBeFocused()
    const focused = await look(textField(page))
    expect(focused.outline).toMatch(/^solid 3px /)
    return focused
  }
  test.beforeEach(async ({ page }) => {
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important }' })
  })

  // A pick with the mouse closes the menu and hands focus back to the trigger, with no key pressed.
  const mousePick = async (page: Page, trigger: Locator, item: string) => {
    await trigger.click()
    await listbox(page).getByRole('option', { name: item }).click()
    await expect(listbox(page)).toHaveCount(0)
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveText(item)
  }

  test('mouse focus: ZSelectMenu looks like a focused UInput, stock shows nothing; it goes when focus leaves', async ({ page }) => {
    const unfocused = await look(ringWrapped(page))
    const stockUnfocused = await look(ringNative(page))
    const expected = await inputFocused(page)
    expect(unfocused).not.toEqual(expected)
    await mousePick(page, ringNative(page), 'Date')
    expect(await look(ringNative(page))).toEqual(stockUnfocused)
    await mousePick(page, ringWrapped(page), 'Date')
    await expect.poll(() => look(ringWrapped(page))).toEqual(expected)
    await section(page, 'ring').locator('[data-before]').click()
    await expect.poll(() => look(ringWrapped(page))).toEqual(unfocused)
  })

  test('keyboard focus: stock and ZSelectMenu both look like a focused UInput', async ({ page }) => {
    const expected = await inputFocused(page)
    await section(page, 'ring').locator('[data-before]').focus()
    await page.keyboard.press('Tab')
    await expect(ringNative(page)).toBeFocused()
    await expect.poll(() => look(ringNative(page))).toEqual(expected)
    await page.keyboard.press('Tab')
    await expect(ringWrapped(page)).toBeFocused()
    await expect.poll(() => look(ringWrapped(page))).toEqual(expected)
  })
})

test.describe('Tab closes the menu and moves on', () => {
  test('with a search input: commits the highlighted item and focuses the next field', async ({ page }) => {
    await menu(page, 'plain').focus()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await expect(highlighted(page)).toHaveText('Date')
    await page.keyboard.press('Tab')
    await focused(after(page, 'plain'))
    await expect(listbox(page)).toHaveCount(0)
    await expect(value(page, 'plain')).toHaveText('Date')
  })

  test('with a search input: type to filter, Tab takes the match', async ({ page }) => {
    await menu(page, 'plain').focus()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.type('fi')
    await expect(highlighted(page)).toHaveText('Fig')
    await page.keyboard.press('Tab')
    await focused(after(page, 'plain'))
    await expect(value(page, 'plain')).toHaveText('Fig')
  })

  test('with a search input, untouched: the value stays', async ({ page }) => {
    await menu(page, 'plain').focus()
    await page.keyboard.press('ArrowDown')
    await expect(highlighted(page)).toHaveText('Cherry')
    await page.keyboard.press('Tab')
    await focused(after(page, 'plain'))
    await expect(value(page, 'plain')).toHaveText('Cherry')
  })

  test('Shift+Tab commits too and focuses the field before', async ({ page }) => {
    await menu(page, 'plain').focus()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('Shift+Tab')
    await focused(before(page, 'plain'))
    await expect(listbox(page)).toHaveCount(0)
    await expect(value(page, 'plain')).toHaveText('Blueberry')
  })

  test('without a search input: arrowed to, Tab takes the highlighted item', async ({ page }) => {
    await menu(page, 'no-search').focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('ArrowDown')
    await expect(highlighted(page)).toHaveText('Katherine Johnson')
    await page.keyboard.press('Tab')
    await focused(after(page, 'no-search'))
    await expect(listbox(page)).toHaveCount(0)
    await expect(value(page, 'no-search')).toHaveText('4')
  })

  test('without a search input, untouched: the value stays', async ({ page }) => {
    await menu(page, 'no-search').focus()
    await page.keyboard.press('Enter')
    await expect(highlighted(page)).toHaveText('Grace Hopper')
    await page.keyboard.press('Tab')
    await focused(after(page, 'no-search'))
    await expect(value(page, 'no-search')).toHaveText('3')
  })

  test('without a search input: a letter in the open list moves the highlight, and Tab takes it', async ({ page }) => {
    await menu(page, 'no-search').focus()
    await page.keyboard.press('Enter')
    await expect(highlighted(page)).toHaveText('Grace Hopper')
    await page.keyboard.press('k')
    await expect(highlighted(page)).toHaveText('Katherine Johnson')
    await page.keyboard.press('Tab')
    await focused(after(page, 'no-search'))
    await expect(value(page, 'no-search')).toHaveText('4')
  })

  test('a hovered item counts as moving the highlight: Tab takes it', async ({ page }) => {
    await menu(page, 'no-search').focus()
    await page.keyboard.press('Enter')
    await expect(highlighted(page)).toHaveText('Grace Hopper')
    await listbox(page).getByRole('option', { name: 'Alan Turing' }).hover()
    await expect(highlighted(page)).toHaveText('Alan Turing')
    await page.keyboard.press('Tab')
    await focused(after(page, 'no-search'))
    await expect(value(page, 'no-search')).toHaveText('2')
  })

  test('with multiple: the selection stays as it was', async ({ page }) => {
    await menu(page, 'multiple').focus()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await expect(highlighted(page)).toHaveText('Date')
    await page.keyboard.press('Tab')
    await focused(after(page, 'multiple'))
    await expect(listbox(page)).toHaveCount(0)
    await expect(value(page, 'multiple')).toHaveText('Cherry,Fig')
  })

  test('with multiple and no search input: Shift+Tab, the selection stays', async ({ page }) => {
    await menu(page, 'multiple-no-search').focus()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Shift+Tab')
    await focused(before(page, 'multiple-no-search'))
    await expect(value(page, 'multiple-no-search')).toHaveText('Date')
  })

  test('with grouped items: filter across the groups, Tab takes the match', async ({ page }) => {
    await menu(page, 'grouped').focus()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.type('carr')
    await expect(highlighted(page)).toHaveText('Carrot')
    await page.keyboard.press('Tab')
    await focused(after(page, 'grouped'))
    await expect(value(page, 'grouped')).toHaveText('Carrot')
  })

  test('from the last field on the page: Tab off the end closes the menu too', async ({ page }) => {
    await page.goto('/select-menu-last')
    await page.waitForLoadState('networkidle')
    await hydrated(page)
    const last = page.locator('[data-menu]')
    await last.focus()
    await page.keyboard.press('Enter')
    await expect(highlighted(page)).toHaveText('Cherry')
    await page.keyboard.press('Tab')
    await expect(listbox(page)).toHaveCount(0)
    await expect(last).toHaveAttribute('aria-expanded', 'false')
  })

  test('a menu opened from code through v-model:open closes on Tab too', async ({ page }) => {
    const root = page.locator('[data-side="wrapped"]')
    await root.locator('[data-open-from-code]').click()
    await expect(root.locator('[data-value]')).toHaveText('value: —, open: true, changes: 0')
    await expect(search(page)).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(listbox(page)).toHaveCount(0)
    await expect(root.locator('[data-value]')).toHaveText('value: —, open: false, changes: 0')
    await expect(search(page)).toHaveCount(0)
  })

  test('switched off: Tab stays in the open menu', async ({ page }) => {
    await menu(page, 'off').focus()
    await page.keyboard.press('ArrowDown')
    await expect(search(page)).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(listbox(page)).toBeVisible()
    await expect(after(page, 'off')).not.toBeFocused()
    await expect(value(page, 'off')).toHaveText('Cherry')
  })
})

test.describe('open on focus', () => {
  test('Tab into the field opens it; type, Tab, and the next one opens', async ({ page }) => {
    const next = section(page, 'entry').locator('[data-menu-next]')
    await before(page, 'entry').focus()
    await page.keyboard.press('Tab')
    await expect(search(page)).toBeFocused()
    await expect(menu(page, 'entry')).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.type('gr')
    await page.keyboard.press('Tab')
    await expect(value(page, 'entry')).toHaveText('first: Grape, second: —')
    await expect(next).toHaveAttribute('aria-expanded', 'true')
    await expect(search(page)).toBeFocused()
    await page.keyboard.type('ap')
    await page.keyboard.press('Tab')
    await expect(value(page, 'entry')).toHaveText('first: Grape, second: Apple')
    await focused(after(page, 'entry'))
    await expect(listbox(page)).toHaveCount(0)
  })

  test('Tab in and straight out of an empty field leaves it empty, though its first item is highlighted', async ({ page }) => {
    const next = section(page, 'entry').locator('[data-menu-next]')
    await before(page, 'entry').focus()
    await page.keyboard.press('Tab')
    await expect(highlighted(page)).toHaveText('Apple')
    await page.keyboard.press('Tab')
    await expect(next).toHaveAttribute('aria-expanded', 'true')
    await expect(highlighted(page)).toHaveText('Apple')
    await page.keyboard.press('Tab')
    await focused(after(page, 'entry'))
    await expect(value(page, 'entry')).toHaveText('first: —, second: —')
  })

  test('Escape closes it, and the focus coming back does not open it again', async ({ page }) => {
    await before(page, 'entry').focus()
    await page.keyboard.press('Tab')
    await expect(listbox(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await focused(menu(page, 'entry'))
    await expect(listbox(page)).toHaveCount(0)
    await page.waitForTimeout(300) // past the close animation, when reka-ui hands focus back
    await expect(listbox(page)).toHaveCount(0)
    await focused(menu(page, 'entry'))
  })

  test('a click opens it once, rather than opening and closing it', async ({ page }) => {
    await menu(page, 'entry').click()
    await expect(listbox(page)).toBeVisible()
    await page.waitForTimeout(200)
    await expect(listbox(page)).toBeVisible()
  })

  test('off by default: Tab into a plain menu leaves it closed', async ({ page }) => {
    await before(page, 'plain').focus()
    await page.keyboard.press('Tab')
    await focused(menu(page, 'plain'))
    await page.waitForTimeout(200)
    await expect(listbox(page)).toHaveCount(0)
  })
})

test.describe('everything else passes through unchanged', () => {
  const side = (page: Page, s: 'native' | 'wrapped') => page.locator(`[data-side="${s}"]`)

  for (const s of ['native', 'wrapped'] as const) {
    test(`${s}: placeholder, slots, value-key, v-model:open, @change and clear`, async ({ page }) => {
      const root = side(page, s)
      const trigger = root.locator('[data-menu]')
      await expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
      await expect(trigger).toHaveText('@Choose someone')
      await trigger.click()
      await expect(root.locator('[data-value]')).toHaveText('value: —, open: true, changes: 0')
      await expect(listbox(page).locator('[data-item-label]')).toHaveText(['ADA LOVELACE', 'ALAN TURING', 'GRACE HOPPER', 'KATHERINE JOHNSON'])
      await listbox(page).getByRole('option', { name: 'ALAN TURING' }).click()
      await expect(root.locator('[data-value]')).toHaveText('value: 2, open: false, changes: 1')
      await expect(trigger).toHaveText('@Alan Turing')
      await trigger.locator('[data-slot="trailingClear"]').click()
      await expect(root.locator('[data-value]')).toHaveText(/^value: —, open: false, /)
      await expect(trigger).toHaveText('@Choose someone')
    })
  }

  test('the trigger renders the same markup as USelectMenu\'s', async ({ page }) => {
    const markup = (s: 'native' | 'wrapped') => side(page, s).locator('[data-menu]').evaluate((el) =>
      el.outerHTML.replace(/ (id|aria-label|aria-controls|aria-describedby)="[^"]*"/g, '').replace(/<!--[^>]*-->/g, ''))
    expect(await markup('wrapped')).toBe(await markup('native'))
  })

  for (const mode of ['light', 'dark'] as const) {
    test(`it paints as USelectMenu does (${mode}): trigger and open menu`, async ({ page }) => {
      await open(page, mode)
      await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important }' })
      if (mode === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)
      const paint = async (s: 'native' | 'wrapped') => {
        const trigger = side(page, s).locator('[data-menu]')
        const css = (el: Element) => {
          const c = getComputedStyle(el)
          return { color: c.color, background: c.backgroundColor, ring: c.boxShadow, radius: c.borderRadius }
        }
        const closed = await trigger.evaluate(css)
        await trigger.click()
        const opened = await listbox(page).evaluate(css)
        const option = await highlighted(page).or(listbox(page).getByRole('option').first()).first().evaluate(css)
        await page.keyboard.press('Escape')
        await expect(listbox(page)).toHaveCount(0)
        return { closed, opened, option }
      }
      expect(await paint('wrapped')).toEqual(await paint('native'))
    })
  }
})
