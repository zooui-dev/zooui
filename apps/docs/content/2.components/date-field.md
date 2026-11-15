---
title: Date field
description: A calendar-day field with typed entry, shortcut keys and a calendar picker, holding a Temporal.PlainDate.
component: ZDateField
preview: DateFieldBasic
---

`ZDateField` holds a calendar day: its model is a `Temporal.PlainDate` or `null`, the same type a Postgres `date` column comes back as, and no JavaScript `Date` is made anywhere, so a due date never slips a day across time zones. Type the day the short way, step it with a key, or pick it from the calendar.

## Typing and shortcut keys

In `MM/DD/YYYY`, `5` or `12` is that day this month, `0512` is May 12, and `051226`, `5/12/26` or `5/12/2026` carry the year. Enter, Tab or leaving the field commits; text that isn't a date clears it. The keys `t` (today), `m` and `h` (first and last of the month), `y` and `r` (first and last of the year), and `+` or `-` (a day either way) move the date, and pressing `m`, `h`, `y` or `r` again keeps walking. Alt+↓ opens the calendar.

::component-example{name="DateFieldBasic"}
::

## Formats and locales

`format` takes `MM`, `DD` and `YYYY` in month-day-year, day-month-year or year-month-day order with one separator. Without it, the field uses the locale's own numeric order: Nuxt UI's locale by default, or the `locale` prop. The calendar speaks the same locale.

::component-example{name="DateFieldFormats"}
::
