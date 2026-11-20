# ZRepeatingList

```vue
<ZRepeatingList v-model="sources" item-label="referral source" :new-row="() => ({ name: '' })" :row-key="(s) => s.id" :errors="errors">
  <template #row="{ row, errorId }"><UFormField label="Name"><UInput v-model="row.name" :aria-describedby="errorId" /></UFormField></template>
  <template #summary="{ row }">{{ row.name }}</template>
</ZRepeatingList>
```

Generic over the row type (`T extends object`), so `row` in `#row` and `#summary` is the list's own type. Rows are
told apart by `rowKey`, or by object identity for rows without one. `min` rows are always on screen (Remove hides at
it); at `max` Add is disabled and `max-label` says so. `errors` is keyed by row key; a row's message is a
`role="alert"` under it, and its id reaches the slot as `errorId`. With `#summary`, rows present at mount fold to one
line with Edit; new rows and rows with an error are open. `compact` is one line per row with an icon-only Remove.
Focus goes to the first `focus-selector` match in an added or opened row, and to Add after a remove; a polite live
region announces each add and remove. The words are props: `add-label`, `remove-label`, `edit-label`, `max-label`,
`row-title`, `announce`. The list carries `data-testid="repeating-list"` and each row `data-row`, for e2e selectors.

## Reordering

```vue
<ZRepeatingList v-model="steps" item-label="step" reorderable move-to-ends :new-row="(): Step => ({ name: '' })" :row-key="(s) => s.id" :row-title="(s, i) => s.name || `Step ${i + 1}`">
  <template #row="{ row }"><UFormField label="Step"><UInput v-model="row.name" /></UFormField></template>
</ZRepeatingList>
```

`reorderable` (off by default) gives each row Move up and Move down; `move-to-ends` adds Move to top and Move to
bottom. A move with nowhere to go is disabled at that edge. The buttons are named "Move <row title> up", "… down",
"… to the top", "… to the bottom" (`move-label` takes `{ move, title }` to change them), and carry `data-move`
(`up`, `down`, `top`, `bottom`). With anything in a row focused, Alt+ArrowUp / Alt+ArrowDown move it one place, and
Alt+Home / Alt+End (or Alt+Shift+ArrowUp / Alt+Shift+ArrowDown) to the top or bottom. A field that takes the keys
itself keeps them: a select, combobox or ZDateField keeps Alt+ArrowDown, and ZNumberInput keeps Alt+ArrowUp /
Alt+ArrowDown to step its value (from those, Alt+Home / Alt+End and the buttons still move the row). Focus stays on the element that had it, or on the row's first enabled move when that button is now
disabled. Each move is announced politely, "Moved <row title> to position 3 of 5." (`announce-move` takes
`{ title, position, count }`). A move sets `v-model` to a new array of the same row objects, so `row-key`, errors and
folding go with the row; it works with `min`, `max` and `compact`. No drag and drop. The move logic is in
`components/reorder.ts` (`moveTarget`, `moveForKey`, `moved`).
