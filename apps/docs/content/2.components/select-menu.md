---
title: Select menu
description: Nuxt UI's USelectMenu with the keyboard of a data-entry form, typeahead on the closed menu, Tab that moves on, a focus ring on any focus, and optional open on focus.
component: ZSelectMenu
preview: SelectMenuBasic
---

`ZSelectMenu` is Nuxt UI's `USelectMenu` with the keyboard a form filled in field after field wants. Everything `USelectMenu` takes passes through unchanged: its props (`multiple`, `search-input`, grouped `items`, `value-key`, `label-key`, `by`, `clear`, `create-item` …), its slots, its events, `v-model` and `v-model:open`. It is generic over the item type, so slot props have your item's type. It adds four behaviors, each a prop you can switch.

| Prop | Default | What it does |
| --- | --- | --- |
| `highlight-selected-on-open` | `true` | The menu opens on the selected item, so arrow keys go on from it (with `multiple`, the first selected one). Off, it opens on the first item. |
| `typeahead` | `true` | Typing while the trigger has focus and the menu is closed picks the first item, from the top of the list, that starts with what you typed. |
| `close-on-tab` | `true` | Tab and Shift+Tab close the open menu and move focus to the next or previous field. |
| `open-on-focus` | `false` | Focus from the keyboard opens the menu. |

## Typeahead and Tab

Focus the field and type: `b` picks Banana, `b` again Blueberry, and `bl` Blueberry straight away. The search always starts from the top of the list, whatever is selected, so with Colorado selected in a list of states, `c` picks California, the first C (a native `<select>` would search on from Colorado, to Connecticut). Pressing one letter again and again cycles through the items that start with it, onward from the current one. The search starts over after a second's pause. The pick is announced in a polite live region, since the trigger's name is its label, not its value, and a surrounding `UForm` hears of it as it would a pick from the open menu, so validation on change and dirty tracking see it. `v-model`'s modifiers apply to it too. Group labels, separators and disabled items are skipped.

Open the menu and Tab out of it, and focus goes to the next field instead of looping inside the menu. Once you have moved the highlight (with the arrow keys, by typing in the search or, without a search input, a letter in the list, or by hovering an item), Tab takes the highlighted item first, as Enter would: type or arrow to an item, Tab to take it and move on. Tab through a menu you haven't touched, and the value stays as it was, even when the menu opened with its first item highlighted. **With `multiple`**, Tab always leaves the selection as it was: toggling the highlighted item would add or remove one just by leaving the field, and Enter or a click already does that.

::component-example{name="SelectMenuBasic"}
::

## Focus ring

The trigger shows its focus ring whenever it has focus, after a click as well as from the keyboard, and for as long as the menu is open. Nuxt UI's `USelectMenu` shows it on keyboard focus only, so after a pick with the mouse nothing shows where focus is. `ZSelectMenu` draws Nuxt UI's own keyboard-focus look on any focus, the 1px ring and soft outer halo a focused `UInput` shows, in the menu's `color` (red in a field with an error), so your palette and dark mode carry through.

## Open on focus, for data entry

`open-on-focus` opens the menu when the field gets focus from the keyboard, so a row of fields can be filled without leaving the keys: Tab in, type to filter, Tab to take the match and land in the next field, already open if it is a menu too. A click opens it once, as it would anyway, and focus coming back from the menu (after Escape or a pick) doesn't open it again.

Use it on forms filled in quickly from the keyboard, like an entry row or a grid of fields. Leave it off where people mostly Tab past a field, or read a form before changing anything: a menu opening on every field you pass over gets in the way.

::component-example{name="SelectMenuEntry"}
::

## With `multiple`

Typing on a closed `multiple` menu never replaces the selection. It opens the menu on the match instead, with the letter in the search input when there is one, so typing goes on filtering there; Enter or a click adds or removes items as usual.
