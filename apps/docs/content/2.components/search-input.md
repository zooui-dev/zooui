---
title: Search input
description: A search box for a list or a table toolbar. Its value is handed back once typing pauses, with a clear button and Escape to empty it.
component: ZSearchInput
preview: SearchInputBasic
---

`ZSearchInput` is a `UInput` with a search icon and a clear button. What is typed is handed back once typing pauses, 300 ms by default, so a list is filtered once per pause rather than once per key.

::component-example{name="SearchInputBasic"}
::

## The pause

`v-model` follows the typing after the pause, and the `filter` event fires at the same moment with the same value. Bind the model to hold the search, or listen to `@filter` to act on it, such as fetching results. Each key starts the pause again, and `debounce` sets its length in milliseconds:

```vue
<ZSearchInput v-model="query" :debounce="500" @filter="reload" />
```

Setting the model from the parent shows the value and emits nothing.

## Clearing

The clear button appears while the field holds text. It and Escape empty the field and hand back `''` at once, with no pause, and focus stays in the field. When the field is already empty, Escape is left alone, so in a modal the first Escape clears the search and the second closes the modal.

## Everything else

`placeholder`, `icon`, `clear-icon` and `clear-label` set the text and icons, and `ui` is merged over the field's own classes. `size`, `disabled`, `readonly` and the rest pass through to the `UInput`. The field is a `searchbox` with `autocomplete="off"`. It exposes `focus()`, `clear()` and `inputRef`, for a `/` shortcut:

```ts
const search = useTemplateRef('search')
defineShortcuts({ '/': () => search.value?.focus() })
```
