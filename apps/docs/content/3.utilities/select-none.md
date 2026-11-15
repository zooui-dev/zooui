---
title: Select none
description: A value for a select's "none" option, which reka-ui won't let be the empty string, and the helpers that translate it back.
---

Nuxt UI's `USelect` and `USelectMenu` are built on reka-ui, which throws during render if an item has `value=""`: it reserves the empty string for "no selection, show the placeholder". So an explicit "No project" option can't use it. The throw aborts the patch, and what you see is not an error but a modal that won't close and a field that seems to reset itself.

The option holds `SELECT_NONE` (`'__none__'`) instead, and the value is translated back where it leaves the form. All four are auto-imported from `@zooui/nuxt`.

::component-example{name="SelectNoneBasic"}
::

| | |
| --- | --- |
| `SELECT_NONE` | The value for the "none" option. |
| `selectNoneToUndefined(v)` | What to send when the option is chosen, or the value is empty: `undefined`, so a create leaves the field out. |
| `selectNoneToNull(v)` | The same for an update, where clearing a field means an explicit `null`. |
| `emptyToSelectNone(v)` | What to put in the select for a value that may be absent, so a record with no project shows "No project". |
