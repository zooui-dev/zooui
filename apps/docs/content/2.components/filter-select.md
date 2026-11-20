---
title: Filter select
description: A faceted multi-select filter for list and table toolbars, with search, counts, All and Clear.
component: ZFilterSelect
preview: FilterSelectStatus
---

`ZFilterSelect` is the filter button at the top of a list or table: it names the filter, and chips show what is chosen, one per value up to `max-shown` (two unless you say), then one chip with the count. It opens a panel with a search box, the options as checkboxes (each with an optional count of the records it matches and an optional icon), and All and Clear. `v-model` is an array of the chosen values. It is generic over your option type: `value-key` names the field that is an option's value and `label-key` the one shown, as in Nuxt UI's menus.

## Counts and icons

An option's `count` is shown beside it, grouped for the locale, and its `icon` before it. `count-key` and `icon-key` name other fields. An option with `disabled: true` can't be checked, and All passes over it.

::component-example{name="FilterSelectStatus"}
::

## How much the button names

`max-shown` is how many chosen values the button names, a chip each in the options' order, before it switches to one "3 selected" chip; `0` always shows the count. The chips stay within a capped width and truncate, and a chip cut short shows its whole text on hover. The button keeps Nuxt UI's height for its `size` whatever it holds.

::component-example{name="FilterSelectOptions"}
::

## The All button, icon colors and classes

`:show-select-all="false"` drops the All button; the footer then appears only while there is something for Clear to clear. An option's `iconClass` (or the field `icon-class-key` names) colors its icon, as `text-success` does for Done above; an option without one is dimmed. `ui` takes classes for the parts (`trigger`, `badge`, `content`, `search`, `list`, `item`, `itemIcon`, `itemLabel`, `itemCount`, `footer`), merged over the defaults the way Nuxt UI's own `ui` is.

## Search

What you type is matched literally and without regard to case: `(` or `.` match themselves, never a pattern. The options keep their order, and the part of each label that matched is marked. While you search, All checks the matches and adds them to what was already chosen; Clear always empties the filter. Checking or unchecking an option clears the search, so the next pick starts from the whole list. Closing the panel forgets the search.

## Options by id, and without search

With `value-key`, the model holds that field's values (here, people's ids). Without it, the model holds the options themselves. `:searchable="false"` drops the search box, for a short list. `icon=""` drops the button's icon.

::component-example{name="FilterSelectToolbar"}
::

## Keyboard and screen readers

The list is Nuxt UI's `UListbox`: a `listbox` that allows several choices, named for the filter, with a search box that points at the highlighted option. Focus opens in the search box. The arrow keys, Home and End move through the options, and Enter checks one. Space checks one too while the search box is empty, or right after an arrow key; once you have typed a character, it is a space in the search. Escape closes the panel and puts focus back on the button. Each change is announced politely, as "Status: 2 selected.", and the button's name carries the badge: "Status, 2 selected".
