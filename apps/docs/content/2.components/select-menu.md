---
title: Select menu
description: Nuxt UI's USelectMenu with the keyboard of a data-entry form, typeahead on the closed menu, Tab that moves on, and optional open on focus.
component: ZSelectMenu
preview: SelectMenuBasic
---

`ZSelectMenu` is Nuxt UI's `USelectMenu` with the keyboard a form filled in field after field wants. Everything `USelectMenu` takes passes through unchanged: its props (`multiple`, `search-input`, grouped `items`, `value-key`, `label-key`, `by`, `clear`, `create-item` …), its slots, its events, `v-model` and `v-model:open`. It is generic over the item type, so slot props have your item's type. It adds four behaviors, each a prop you can switch.

| Prop | Default | What it does |
| --- | --- | --- |
| `highlight-selected-on-open` | `true` | The menu opens on the selected item, so arrow keys go on from it (with `multiple`, the first selected one). Off, it opens on the first item. |
| `typeahead` | `true` | Typing while the trigger has focus and the menu is closed picks the first item that starts with what you typed, as a native `<select>` does. |
| `close-on-tab` | `true` | Tab and Shift+Tab close the open menu and move focus to the next or previous field. |
| `open-on-focus` | `false` | Focus from the keyboard opens the menu. |

## Typeahead and Tab

Focus the field and type: `b` picks Banana, `b` again Blueberry, and `bl` Blueberry straight away. The search starts over after a second's pause. The pick is announced in a polite live region, since the trigger's name is its label, not its value. Group labels, separators and disabled items are skipped.

Open the menu and Tab out of it, and focus goes to the next field instead of looping inside the menu. **With a search input**, once you have typed in the search or moved the highlight, Tab takes the highlighted item first, as Enter would: type to filter, Tab to take the match and move on. Tab through a menu you haven't touched, and the value stays as it was, even when the menu opened with its first item highlighted. **Without a search input, or with `multiple`**, Tab always leaves the value as it was: the highlight there only shows where the arrow keys are, so taking it would change the field just by passing through it.

::component-example{name="SelectMenuBasic"}
::

## Open on focus, for data entry

`open-on-focus` opens the menu when the field gets focus from the keyboard, so a row of fields can be filled without leaving the keys: Tab in, type to filter, Tab to take the match and land in the next field, already open if it is a menu too. A click opens it once, as it would anyway, and focus coming back from the menu (after Escape or a pick) doesn't open it again.

Use it on forms filled in quickly from the keyboard, like an entry row or a grid of fields. Leave it off where people mostly Tab past a field, or read a form before changing anything: a menu opening on every field you pass over gets in the way.

::component-example{name="SelectMenuEntry"}
::

## With `multiple`

Typing on a closed `multiple` menu never replaces the selection. It opens the menu on the match instead, with the letter in the search input when there is one, so typing goes on filtering there; Enter or a click adds or removes items as usual.
