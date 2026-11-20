---
title: Order list
description: A compact list with one selected row and a toolbar that adds, removes and reorders it, for the list half of a master-detail editor.
component: ZOrderList
preview: OrderListEditor
---

Settings screens often edit a short, ordered list of records one at a time: statuses, milestones, groups, custom fields, email templates. `ZOrderList` is the list half of that screen. It shows the records as a compact list with one selected row, and a toolbar beside it adds, removes and moves that row. The selected record's form sits next to the list, in your own markup, and editing it updates the row.

`v-model` is the array, and `v-model:selection` is the selected item's key, which `row-key` gives. A move hands back a new array of the same items in the new order, and the selection follows the moved item. Add and Remove ask you: `@add` is where you create the item (and select it), and `@remove` hands you the item to take out, so a server call can come first. Remove is a `ZConfirmButton`: it asks first, with `remove-question`, `remove-description`, `remove-confirm-label` and `remove-cancel-label` as its words, unless `:confirm-remove="false"`.

::component-example{name="OrderListEditor"}
::

## The keyboard

The list is one tab stop, a `listbox`. Selection follows focus: Up and Down select the next row, so the form beside the list follows the keyboard. Home and End select the first and last rows. Typing a row's first letters selects it. Alt+Up and Alt+Down move the selected row one place, and Alt+Home and Alt+End move it to the top or bottom. Each move is announced to screen readers: "Moved Review to position 3 of 5."

Moved rows slide to their new place in 180 ms, and jump straight there under `prefers-reduced-motion`. After a move the row stays selected and scrolls into view.

## Long lists

`max-height` sets where the list starts to scroll, and `striped` tints every other row.

::component-example{name="OrderListStriped"}
::

## Order list or repeating list

- **`ZRepeatingList`** is for editing rows in place: every row's fields are part of the form, and rows are added and removed. Use it for "one or more" of something short: referral sources, the parts of a split.
- **`ZOrderList`** is for picking and ordering a list beside an editor: rows are a line each, one is selected, and the selected record's form sits next to the list. It is Zoo UI's one reorderable list, so use it whenever the user arranges the order.
