---
title: Filter select
description: A faceted multi-select filter for list and table toolbars, with search, counts, All and Clear.
component: ZFilterSelect
preview: FilterSelectStatus
---

`ZFilterSelect` is the filter button at the top of a list or table: it names the filter, and a badge shows what is chosen, the value itself when it is one and the number when it is more. It opens a panel with a search box, the options as checkboxes (each with an optional count of the records it matches and an optional icon), and All and Clear. `v-model` is an array of the chosen values. It is generic over your option type: `value-key` names the field that is an option's value and `label-key` the one shown, as in Nuxt UI's menus.

## Counts and icons

An option's `count` is shown beside it, grouped for the locale, and its `icon` before it. `count-key` and `icon-key` name other fields. An option with `disabled: true` can't be checked, and All passes over it.

::component-example{name="FilterSelectStatus"}
::

## Search

What you type is matched literally and without regard to case: `(` or `.` match themselves, never a pattern. The options keep their order, and the part of each label that matched is marked. While you search, All checks the matches and adds them to what was already chosen; Clear always empties the filter. Closing the panel forgets the search.

## Options by id, and without search

With `value-key`, the model holds that field's values (here, people's ids). Without it, the model holds the options themselves. `:searchable="false"` drops the search box, for a short list. `icon=""` drops the button's icon.

::component-example{name="FilterSelectToolbar"}
::

## Keyboard and screen readers

The list is Nuxt UI's `UListbox`: a `listbox` that allows several choices, named for the filter, with a search box that points at the highlighted option. Focus opens in the search box. The arrow keys, Home and End move through the options, and Enter checks one. Space checks one too while the search box is empty, or right after an arrow key; once you have typed a character, it is a space in the search. Escape closes the panel and puts focus back on the button. Each change is announced politely, as "Status: 2 selected.", and the button's name carries the badge: "Status, 2 selected".
