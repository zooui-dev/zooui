# ZSelectMenu

Nuxt UI's `USelectMenu` (`components/SelectMenu.vue`) with the keyboard of a data-entry form; the typeahead's matching
rules are `components/select-typeahead.ts`. It wraps `USelectMenu` and drives it only through its public surface (the
trigger, the menu's DOM, and the keys reka-ui already handles), with no fork and no Nuxt UI internals.

```vue
<ZSelectMenu v-model="fruit" :items="fruits" />                                  <!-- type "bl" on the closed menu -->
<ZSelectMenu v-model="state" :items="states" value-key="code" label-key="name" open-on-focus />
<ZSelectMenu v-model="tags" :items="allTags" multiple :close-on-tab="false" />
```

**Everything else passes through unchanged**: every `USelectMenu` prop (`multiple`, `search-input`, grouped `items`,
`value-key`, `label-key`, `by`, `clear`, `create-item`, `virtualize` …), every slot, every event (`@change`,
`@update:open`, `@create` …), `v-model` with its modifiers and `v-model:open`. It is generic over the item type
(`T extends SelectMenuItem`) and the model (`V`), as `ZRepeatingList` is over its row. Its tests put a plain
`USelectMenu` and a `ZSelectMenu` with the same props, slots and events side by side and check they behave, render
and paint alike in light and dark, on the base and on every Forest scheme.

## The four behaviors

| Prop | Default | |
| --- | --- | --- |
| `highlight-selected-on-open` | `true` | The menu opens on the selected item, so arrow keys go on from it; with `multiple`, the first selected one. reka-ui already does this, and it is kept (and tested); off, the menu opens on the first item. |
| `typeahead` | `true` | Printable keys on the closed trigger pick the first item, from the top of the list, whose label starts with what was typed. |
| `close-on-tab` | `true` | Tab and Shift+Tab close the open menu and move to the next or previous field. |
| `open-on-focus` | `false` | Keyboard focus opens the menu. |

- **Typeahead** searches from the top of the list, whatever is selected (unlike a native `<select>`, which searches
  on from the current item): a search matches the first item whose label (by `label-key`, dotted paths included)
  starts with it, ignoring case. One letter pressed again and again cycles through the items that start with it,
  onward from the current one and round to the first: with Colorado selected, `c` picks California, `c` again
  Colorado, then Connecticut, then California. The current item (compared by `by`, as `USelectMenu` compares values)
  stays when it is the match. The search resets after a second. Group labels, separators and disabled items are
  skipped. Space opens the menu, unless a search is under way ("new y"). Keys a handler has already
  `preventDefault`ed and keys typed during IME composition are left alone. The pick sets `v-model` (the item's
  `value-key` field, or the item, with `v-model`'s modifiers applied as `USelectMenu` applies them: `number`, `trim`,
  `nullable`, `optional`), fires `@change`, **tells a surrounding `UForm`** (its change and input events, so
  `validate-on` and dirty tracking see the pick, as they see one made in the open menu), and is announced in a polite
  live region beside the trigger, because the trigger's accessible name is its label, not its value. **With `multiple`** typing never replaces the
  selection: it opens the menu, with the letter in the search input (which filters and highlights the first match,
  and keeps the typing) or, without one, on the match by reka-ui's own typeahead.
- **Close on Tab.** reka-ui otherwise loops focus inside the open menu. **A single-select menu commits the
  highlighted item first**, as Enter would, whenever the person moved the highlight in this opening: arrow keys
  (Home, End, Page Up and Down too), typing in the search or, without one, a letter in the list, or hovering an item
  (a pointer moving onto one). Type or arrow to an item, Tab to take it and move on, with or without a search input. **An
  untouched menu leaves the value as it was**, though its highlight may be the first item (reka-ui's choice when
  nothing is selected): Tabbing through an empty open-on-focus field doesn't fill it in. **With `multiple`, Tab leaves
  the selection as it was**: toggling the highlighted item would add or remove one just by leaving the field, and
  Enter or a click already toggles it. The closing menu is made `inert`, so nothing in it can take
  focus back as it animates out (the search input's `UInput` focuses itself on a timer after it mounts).
- **Open on focus** is for data entry: Tab in, type, Tab to take the match and land in the next field, already open
  if it is a menu too. Only focus from the keyboard opens it (`:focus-visible`), since a click opens the menu
  anyway, and focus coming back from the menu (Escape, a pick) does not reopen it. Leave it off where people mostly
  Tab past a field or read the form first: a menu opening on every field passed over is in the way.

## Focus ring

The trigger shows its focus ring whenever it has focus, from a click as much as from the keyboard, and for as long as
the menu is open, while focus is in the menu's search or list. Stock
`USelectMenu` shows it on keyboard focus only (`focus-visible`: a 1px ring and a translucent outline), so after a mouse
pick, with focus back on the trigger, nothing shows where focus is. `ZSelectMenu` draws stock's keyboard-focus look on
any focus, so a focused menu looks exactly like a focused `UInput`: it passes `USelectMenu` its own `highlight` (the
1px ring in the menu's `color`, `error` in a field with an error) and adds `outline-3` to `ui.base`, the width
stock's `focus-visible:outline-3` gives the translucent `outline-<color>/25` halo the theme already sets. The `none`
variant, which has no halo in the theme, gets the ring alone. It is Nuxt UI's own focus style on Nuxt UI's tokens, so a
product's palette and dark mode carry through; a `highlight` or `ui.base` you pass is kept.

## API

- **Props**: the four above, and `USelectMenu`'s own. `items`, `label-key`, `value-key`, `multiple` and
  `search-input` are declared (typed, and read for typeahead and Tab) and passed on as given.
- **Emits**: `update:modelValue` and `change` (also fired by a typeahead pick, with a surrounding `UForm` told too);
  every other `USelectMenu` event passes through.
- **Slots**: all of `USelectMenu`'s, passed through.
- **Exposed**: `triggerRef` (the trigger button) and `viewportRef` (the open menu's list), as `USelectMenu` exposes
  them.
- **Markup**: the trigger is `USelectMenu`'s own, `$attrs` (`class`, `aria-label`, `data-*`) included; beside it is
  the live region, `<span class="sr-only" aria-live="polite" data-select-menu-announce>`. The component therefore has
  two root nodes: reach the trigger by `triggerRef`, not `$el`.

## Tests

`scripts/select-typeahead.test.mjs` (the matching rules), `apps/base/tests/select-menu.spec.ts` (each behavior with
a search input, without one, with `multiple` and with grouped items, each switched off; typeahead from the top of the
list; a `UForm` validating on change after a typeahead pick; the focus ring on mouse and keyboard focus beside a plain
`USelectMenu`; and the pass-through and paint against a plain `USelectMenu`) and `apps/forest/tests/select-menu.spec.ts` (a data-entry row from the keyboard;
a smoke test each of typeahead from the top, the focus ring after a mouse pick and a `UForm` validating a typeahead
pick; and the paint on every scheme in light and dark).
