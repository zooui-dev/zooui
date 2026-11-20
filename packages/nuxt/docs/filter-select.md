# ZFilterSelect

```vue
<ZFilterSelect v-model="statuses" label="Status" :options="statusOptions" value-key="value" />
<ZFilterSelect v-model="owners" label="Owner" :options="people" value-key="id" label-key="name" count-key="open" />
```

A faceted filter for a list or table toolbar: a `UButton` naming the filter, with a `UBadge` for what is chosen (the
value's label when it is one, the number when it is more), opening a `UPopover` with Nuxt UI's `UListbox` (`multiple`,
its search box) and All and Clear under it. Generic over the option type (`T extends object`); `v-model` is an array of
`T[valueKey]`, or of `T` itself without `value-key` (then compared by identity, through `toRaw`, so a model held in
`ref()` still matches). Values the options no longer hold are kept. Written on Nuxt UI's tokens: the checkbox
`border-accented` / `bg-primary text-inverted`, counts `text-muted`, matches `bg-primary/15 text-highlighted`.

| Prop | | |
| --- | --- | --- |
| `modelValue` | `T[VK][]` (`T[]` without `valueKey`) | The chosen values. Default `[]` |
| `label` | `string` | Required. The button's text, the listbox's accessible name, and the announcement's subject |
| `options` | `T[]` | Required, listed in this order. An option with `disabled: true` can't be checked, and All passes over it |
| `valueKey` | `keyof T` | The field that is an option's value. Unset: the option itself |
| `labelKey`, `countKey`, `iconKey` | `keyof T` | The fields shown as its label, its count (a number, grouped for Nuxt UI's locale) and its icon. Unset: `label`, `count`, `icon`. An option's own icons are the product's to bundle |
| `icon` | `string` | The button's leading icon, `i-lucide-list-filter`; `''` for none |
| `searchable` | `boolean` | `true`. `false`: no search box; focus opens in the list |
| `searchPlaceholder` | `string` | `Search`. The box is named `Search <label>` |
| `size` | `xs \| sm \| md \| lg \| xl` | The button's, `sm` |
| `disabled` | `boolean` | Disables the button |
| `portal` | `boolean \| string` | UPopover's, `true` |
| `allLabel`, `clearLabel`, `emptyLabel` | `string` | `All`, `Clear`, `No matches` |
| `announce` | `({ label, count }) => string` | What a screen reader hears on a change; `Status: 2 selected.` / `Status: none selected.` |

Emits `update:modelValue`. Slot `#option-label="{ option, segments, selected }"` replaces an option's highlighted
label (`segments` are the matched and unmatched runs). Nothing is exposed. Other attributes go to the wrapper, which
carries `data-filter-select`; the button is `data-trigger`, the badge `data-badge`, the portaled panel
`data-filter-panel`, the search `data-search`, the live region `data-announce`, All `data-all` and Clear `data-clear`,
for e2e selectors.

**Search** is literal and case-insensitive (`utils/filter-match.ts`, auto-imported as `filterSelectMatches` and
`filterSelectSegments`): the text is never a regular expression, so `(`, `.` or `\` match themselves. Case is folded a
character at a time, so a match maps back onto whole characters even where lowercasing changes a length (`İ`). The
options keep their order (Nuxt UI's own filter reorders by score and ignores accents, so `UListbox` gets
`ignore-filter`), and each label is drawn as segments with the matches in `<mark>`, never `v-html`. All checks every
option on screen (the matches, while searching), added to the model; Clear empties it. After either, focus goes back to
the search box. A closed panel forgets its search. Tested by `scripts/filter-match.test.mjs`.

**Keyboard.** Focus opens in the search box, which carries `aria-activedescendant` (reka-ui's Listbox) and
`aria-controls` to the list. Arrows, Home and End move the highlight; Enter checks. Space checks too while the box is
empty or straight after an arrow key; after a typed character it is part of the search, so "In progress" can be typed.
Escape closes the panel and focus returns to the button. Without `searchable`, the options take focus themselves and
Space is reka-ui's. **Screen readers:** the list is `role="listbox"` with `aria-multiselectable`, named for `label`;
each option is `role="option"` with `aria-selected` (the drawn checkbox is `aria-hidden`). The button's name includes
the badge ("Status, 2 selected"), and a polite live region beside it, outside the portaled panel, announces each
change. Tested on both apps: `apps/forest/tests/filter-select.spec.ts` (behavior, and 4.5:1 inks on every scheme in
light and dark) and `apps/base/tests/filter-select.spec.ts` (the product's palette, in both modes, in a production
build).
