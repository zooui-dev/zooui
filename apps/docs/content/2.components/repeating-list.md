---
title: Repeating list
description: An editor for a list of rows with the same few fields, with Add, Remove, folding, per-row errors and announcements.
component: ZRepeatingList
preview: RepeatingListCompact
---

Forms often ask for "one or more" of something: referral sources, contacts, the parts of a split. `ZRepeatingList` owns the list: adding a row, removing one, folding rows to a summary, showing each row's error, moving focus, and announcing the count to screen readers. The fields are yours, in the `#row` slot, so a row can hold any inputs. It is generic: `row` in each slot has your row's type.

## Folded to a summary

With a `#summary` slot, rows that are already there when the list mounts start folded to one line with an Edit button. New rows, and any row with an error, are open. `row-key` keeps a row's identity while it is edited, for rows that are saved records.

An open row has **Done** and **Cancel**. Done folds it, keeping the edits. Cancel puts back what the row held when it opened, then folds it: the values go back into the same object, nested fields included, so the row keeps its identity and key. A row added in the list and not yet Done has nothing to go back to, so Cancel removes it; at `min`, where it could not be removed, it has no Cancel. <kbd>Esc</kbd> anywhere in an open row is Cancel, unless a field inside handles Escape itself, such as an open select menu or date popover. Done on a row with an error keeps it open with the error showing, and puts focus in its first field; Cancel does the same after putting its values back. After Done or Cancel, focus goes to the row's Edit button. The words are `done-label` and `cancel-label`.

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
