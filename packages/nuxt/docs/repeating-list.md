# ZRepeatingList

```vue
<ZRepeatingList v-model="sources" item-label="contact" :new-row="() => ({ name: '' })" :row-key="(s) => s.id" :errors="errors">
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

## Done and Cancel

With `#summary`, an open row has Done and Cancel (`data-done`, `data-cancel`; words `done-label`, `cancel-label`,
named like Edit: "Done Part 3"). Done folds the row, keeping its edits. Cancel puts back what the row held when it
opened (by Edit, or by an error opening it) and folds it: the row is copied then, and the copy is written back into the
same object, nested plain objects and arrays in place, so the row keeps its identity and key (other values, such as a
Date or a Temporal.PlainDate, are kept by reference). A row added in the list and not yet Done has nothing to go back
to: Cancel removes it, and focus goes to Add; where Remove could not (at `min`) it has no Cancel. Escape anywhere in an
open row is Cancel, unless a field took it first (an open select menu or date popover calls `preventDefault`) or the
focused element has `aria-expanded="true"`. Done on a row with an error leaves it open, the error showing, with focus in
its first field; so does Cancel, after putting its values back. Done folds it once the error is gone. After Done or Cancel, focus goes to the row's Edit button.
