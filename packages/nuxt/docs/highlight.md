# ZHighlight

```vue
<ZHighlight :text="person.name" :query="searchTerm" />
<ZHighlight :text="person.email" :query="searchTerm" :ui="{ mark: 'bg-transparent text-primary underline' }" />
```

Text with each match of a search wrapped in `<mark>`: a search result's name, a menu option's label or description.
The search is the one `ZFilterSelect` uses (`utils/filter-match.ts`, `filterSelectSegments`): literal and
case-insensitive, every match marked, left to right, matches not overlapping. What is typed is text, never a pattern,
so `(`, `.` or `\` match themselves and never throw. Case is folded a character at a time, so a match always covers
whole characters of the text (`İstanbul` searched for `i` marks the `İ`).

The text is drawn as Vue text nodes and `<mark>` elements, never through `v-html`: a `<b>` or an
`<img onerror>` in the text, or in the search, reads as those characters. ZHighlight renders no element of its own,
only the runs of text and the marks, so it drops into whatever holds it (a truncating `span`, a menu item's label)
without changing its layout; put classes on that element. `ZFilterSelect` draws its option labels with it.

| Prop | | |
| --- | --- | --- |
| `text` | `string \| number \| null` | The text to draw. A number is drawn as its string; `null` or unset as nothing |
| `query` | `string \| null` | What to find. Empty, `null` or unset: the text with nothing marked |
| `ui` | `{ mark? }` | Classes for the marks, merged over the defaults (`rounded-xs bg-primary/15 font-semibold text-highlighted`) with tailwind-merge, so an override replaces the default it conflicts with |

No emits, slots or exposed methods. The default mark clears 4.5:1 on the page and in a menu item's muted description,
light and dark (`apps/*/tests/highlight.spec.ts`).

## A two-line menu option

A menu option with a name over a second line (an email, a code), the search marked in both, is Nuxt UI's own item
layout: `UInputMenu` and `USelectMenu` draw an item's `description-key` field under its label, and their
`#item-label` and `#item-description` slots take a ZHighlight each. Filter the items yourself with `ignore-filter`
when the search should match the second line too; the menus' own filter looks at labels only.

```vue
<script setup lang="ts">
const searchTerm = ref('')
const people = computed(() => everyone.filter((p) =>
  filterSelectMatches(p.name, searchTerm.value) || filterSelectMatches(p.email, searchTerm.value)))
</script>

<template>
  <UInputMenu v-model="person" v-model:search-term="searchTerm" :items="people" label-key="name" description-key="email" ignore-filter>
    <template #item-label="{ item }"><ZHighlight :text="item.name" :query="searchTerm" /></template>
    <template #item-description="{ item }"><ZHighlight :text="item.email" :query="searchTerm" /></template>
  </UInputMenu>
</template>
```

This is a recipe rather than a component because the menus already lay the two lines out: a wrapping option
component in `#item` would replace their leading icon or avatar, the selected check and the description's styling,
and would have to keep its own height in step with the menus' virtualized item sizes.
