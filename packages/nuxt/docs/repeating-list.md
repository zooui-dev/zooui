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
