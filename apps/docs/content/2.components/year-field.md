---
title: Year field
description: A year field with typed entry, shortcut keys and a calendar of years, holding the year as a number.
component: ZYearField
preview: YearFieldBasic
---

`ZYearField` holds a year as a plain number: a fiscal year, a tax year, a model year. It is a [`ZDateField`](/components/date-field) for a year: the same box, the same keyboard and the same limits, and a calendar of years to pick from.

::component-example{name="YearFieldBasic"}
::

## Typing and shortcut keys

`2026` is 2026, and a one- or two-digit year is read as `ZDateField` reads one: in 2026, `26` is 2026 and `47` is 1947. Enter, Tab or leaving the field commits; text that isn't a year clears it, so the model is always a number or `null`, never the text. The keys `t` (this year), `y` or `-` (the year before) and `r` or `+` (the year after) move it, from the committed year. Alt+↓ opens the calendar.

## Limits

`min-value` and `max-value` are the first and last years the field takes. The calendar disables the years outside them, the shortcut keys stop at them, and a typed year outside them is refused: the field keeps the year it had, is marked invalid, and `@invalid` carries an English message for the product to show.

::component-example{name="YearFieldLimits"}
::

For a month and a year side by side with no day, see [a month with no year](/components/month-field#a-month-with-no-year).
