# ZSearchInput

A search box for a list or a table toolbar (`components/SearchInput.vue`): a `UInput` with a search icon, a clear
button while it holds text, and its value handed back once typing pauses, so the list is filtered once per pause
rather than once per key.

```vue
<ZSearchInput v-model="query" placeholder="Filter projects…" />
<ZSearchInput v-model="query" :debounce="500" @filter="reload" />
<ZSearchInput placeholder="Find a member…" @filter="(q) => (members = search(q))" />
```

- **The pause.** What is typed is handed back `debounce` ms (default `300`) after the last key, as
  `update:modelValue` and `filter` together, with the same string. Each key starts the pause again. A pause that
  ends on the value it started from (a letter typed and deleted) hands nothing back.
- **`v-model` is the paused value**, not every key: a `computed` or a `watch` on it runs once per pause, which is
  what a filter or a request wants. **`@filter`** is the same moment for a parent that doesn't bind the model, or
  that wants to act (fetch, reset a page) rather than hold a value.
- **Clearing.** The clear button (shown only while there is text) and **Escape** empty the field and hand back `''`
  at once, with no pause, and drop a pause still pending; if nothing had been handed back yet, nothing is. The
  button keeps focus in the field (and moves focus into it when it was elsewhere). It is out of the tab order:
  Escape is the keyboard's way to clear. An Escape with nothing to clear is left alone, so in a `UModal` the first
  Escape clears the field and the second closes the dialog.
- **The parent's value.** Setting the model from the parent shows it and emits nothing, at mount or after, and
  drops a pause still pending: the parent's value wins.
- **The input.** A text input with `role="searchbox"` and `autocomplete="off"`, so the browser offers no history
  over the results. In a `UFormField` the label names it; outside one, give it an `aria-label`.
- **Props.** `placeholder` (default `Filter…`), `icon` (default `i-lucide-search`), `clear-icon` (default
  `i-lucide-x`), `clear-label` (the button's accessible name, default `Clear`) and `ui`, merged over the field's own
  classes. Everything else (`size`, `color`, `variant`, `disabled`, `readonly`, `id`, `name`, `autofocus`, `aria-*`,
  `class`) passes through to the `UInput`; the size reaches both icons, from the prop, a `UFieldGroup` or a
  `UFormField`. A disabled or read-only field shows no clear button.
- **Exposed** `focus()`, `clear()` (as the button does, without moving focus) and `inputRef`, the `<input>`. A
  page's `/` shortcut is `defineShortcuts({ '/': () => search.value?.focus() })`.

Its tests are `apps/base/tests/search-input.spec.ts` (`pages/search-input.vue`) and `apps/forest/tests/search-input.spec.ts`.
