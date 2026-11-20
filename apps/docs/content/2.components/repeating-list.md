---
title: Repeating list
description: An editor for a list of rows with the same few fields, with Add, Remove, reordering, folding, per-row errors and announcements.
component: ZRepeatingList
preview: RepeatingListCompact
---

Forms often ask for "one or more" of something: referral sources, contacts, the parts of a split. `ZRepeatingList` owns the list: adding a row, removing one, moving one, folding rows to a summary, showing each row's error, moving focus, and announcing the count to screen readers. The fields are yours, in the `#row` slot, so a row can hold any inputs. It is generic: `row` in each slot has your row's type.

## Folded to a summary

With a `#summary` slot, rows that are already there when the list mounts start folded to one line with an Edit button. New rows, and any row with an error, are open. `row-key` keeps a row's identity while it is edited, for rows that are saved records.

::component-example{name="RepeatingListSources"}
::

## Compact, with a minimum and maximum

`compact` puts each row on one line with no heading or card, for rows of a single short field. `min` keeps that many rows on screen and hides Remove at it; `max` disables Add at it and says why.

::component-example{name="RepeatingListCompact"}
::

## Errors per row

`errors` maps a row's key to its message, shown under the row. The `#row` slot gets the message's `errorId` to put on the input's `aria-describedby`.

::component-example{name="RepeatingListErrors"}
::

## Reorderable

`reorderable` gives each row Move up and Move down buttons, and `move-to-ends` adds Move to top and Move to bottom. A move that has nowhere to go is disabled: up at the first row, down at the last. Each button is named for what moves where: "Move Reconcile accounts up". It is off by default.

The keys work on anything focused in a row, a field or a button:

| Keys | Moves the row |
| --- | --- |
| <kbd>Alt</kbd>+<kbd>↑</kbd> / <kbd>Alt</kbd>+<kbd>↓</kbd> | up or down one place |
| <kbd>Alt</kbd>+<kbd>Home</kbd> / <kbd>Alt</kbd>+<kbd>End</kbd> | to the top or bottom |
| <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>↑</kbd> / <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>↓</kbd> | to the top or bottom, for keyboards without Home and End |

A field that uses those keys itself keeps them: a select or combobox keeps <kbd>Alt</kbd>+<kbd>↓</kbd>, which opens its list, `ZDateField` keeps it for its calendar, and `ZNumberInput` keeps <kbd>Alt</kbd>+<kbd>↑</kbd> and <kbd>Alt</kbd>+<kbd>↓</kbd> to step its value. From those fields, <kbd>Alt</kbd>+<kbd>Home</kbd> and <kbd>Alt</kbd>+<kbd>End</kbd> still move the row, and the row's buttons always do. Focus stays with the moved row: on the field or button that had it, or, when that button is now disabled at the edge, on the row's first move still enabled. Each move is announced in the same polite live region as Add and Remove: "Moved Reconcile accounts to position 1 of 3."

A move hands `v-model` a new array of the same row objects, so a row keeps its `row-key`, its error and whether it is folded. Moves work with `min`, `max` and `compact` (icon-only, beside Remove). The words are props: `move-label` names the buttons and `announce-move` says the move. The default row title counts rows ("Step 2"), so it changes as a row moves; a `row-title` from the row's own content reads better in a reorderable list. There is no drag and drop.

::component-example{name="RepeatingListReorder"}
::
