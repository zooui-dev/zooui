---
title: Month field
description: A month-of-a-year field with typed entry, shortcut keys and a calendar of months, holding a Temporal.PlainYearMonth or a CalendarDate.
component: ZMonthField
preview: MonthFieldBasic
---

`ZMonthField` holds a month of a year: a billing period, a reporting month, a release. Its model is a `Temporal.PlainYearMonth`, an `@internationalized/date` `CalendarDate` (the first of the month, the type Nuxt UI's `UCalendar` holds for a month), or `null`. It is a [`ZDateField`](/components/date-field) for a month: the same box, the same keyboard, the same limits, and a calendar of months to pick from.

::component-example{name="MonthFieldBasic"}
::

## Typing and shortcut keys

In `MM/YYYY`, `5/26`, `05/26`, `5/2026`, `05/2026` and `052026` are May 2026, and so is ISO's `2026-05` in any format. `5` or `12` is that month this year, and a year on its own, `2026`, is December 2026, the year's last month. A two-digit year is read as `ZDateField` reads one, and years before 2000 are years. Enter, Tab or leaving the field commits; text that isn't a month clears it.

The keys `t` (this month), `y` and `r` (the same month a year before or after), `m` and `h` (the month before or after) and `-` or `+` (a month either way) move the month. A key steps from the committed month (this month when the field is empty), not from text typed since. Alt+↓ opens the calendar.

## Formats and locales

`format` takes `MM` and `YYYY` in either order with one separator: `MM/YYYY`, `MM.YYYY`, `YYYY-MM`. Without it, the field uses the locale's own date order without the day, so a month field reads the same way as a date field beside it. In `YYYY-MM`, `-` types the dash and `_` is the month before.

::component-example{name="MonthFieldFormats"}
::

## Either type of month

Whatever the model holds is what the field hands back: a `PlainYearMonth` stays a `PlainYearMonth`, a `CalendarDate` comes back as a `CalendarDate` on the first of the month. A model that starts out `null` hands back what `model-type` says, `plain-year-month` by default or `calendar-date`.

## Limits

`min-value` and `max-value`, each a `PlainYearMonth` or a `CalendarDate`, are the first and last months the field takes. The calendar disables the months outside them; a typed month outside them is not committed, the field keeps the month it had and is marked invalid, and `@invalid` carries the reason and an English message ("Choose a month on or before 08/2026.") for the product to show. The shortcut keys stop at the limits.

## A month with no year

A month of the year on its own, 1 to 12, is a `USelect`, not a `ZMonthField`: with no year there is nothing to step past December or page in a calendar, and twelve choices are what a select is for. `monthOfYearItems(locale, { numbered, month })` gives the twelve items, named by `Intl` in the locale and valued 1 to 12; `numbered` writes "1 - January", so a person can type the number.

::component-example{name="MonthOfYearSelect"}
::
