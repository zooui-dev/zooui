---
title: Date field
description: A calendar-day field with typed entry, shortcut keys and a calendar picker, holding a Temporal.PlainDate or a CalendarDate.
component: ZDateField
preview: DateFieldBasic
---

`ZDateField` holds a calendar day: its model is a `Temporal.PlainDate` (the same type a Postgres `date` column comes back as), an `@internationalized/date` `CalendarDate` (the type Nuxt UI's `UCalendar` and `UInputDate` use), or `null`. No JavaScript `Date` is made anywhere, so a due date never slips a day across time zones. Type the day the short way, step it with a key, or pick it from the calendar.

## Typing and shortcut keys

In `MM/DD/YYYY`, `5` or `12` is that day this month, `0512` is May 12, and `051226`, `5/12/26` or `5/12/2026` carry the year. Enter, Tab or leaving the field commits; text that isn't a date clears it. The keys `t` (today), `m` and `h` (first and last of the month), `y` and `r` (first and last of the year), and `+` or `-` (a day either way) move the date, and pressing `m`, `h`, `y` or `r` again keeps walking. Alt+↓ opens the calendar.

::component-example{name="DateFieldBasic"}
::

## Formats and locales

`format` takes `MM`, `DD` and `YYYY` in month-day-year, day-month-year or year-month-day order with one separator. Without it, the field uses the locale's own numeric order: Nuxt UI's locale by default, or the `locale` prop. The calendar speaks the same locale.

::component-example{name="DateFieldFormats"}
::

## Either type of day

Whatever the model holds is what the field hands back, in `update:modelValue` and `@date-update` alike: a `PlainDate` stays a `PlainDate`, a `CalendarDate` stays a `CalendarDate`. A model that starts out `null` hands back what `model-type` says, `plain-date` by default or `calendar-date`; one that held a day and was cleared keeps its type. Only a Gregorian `CalendarDate` is taken: one in another calendar system throws an error naming it rather than land on a different day. Keep a `CalendarDate` in a `shallowRef`, as Nuxt UI's docs do.

```vue
<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'

const starts = shallowRef<CalendarDate | null>(null)
</script>

<template>
  <ZDateField v-model="starts" model-type="calendar-date" />
</template>
```

## Limits

`min-value`, `max-value` and `is-date-unavailable` are Nuxt UI's props for `UCalendar`, and take either type of day; `is-date-unavailable` is called with a day of the model's type.

- **The calendar** disables the days outside the limits and the unavailable ones.
- **A typed date** they refuse is not committed. The field keeps the date it had and shows it again, as it never shows a day the form isn't holding (text that isn't a date still clears the field). It is marked invalid, with `aria-invalid` and Nuxt UI's error color, until the next edit. `@invalid` carries the reason, the date, the limit and an English message, then `null` when the mark is gone, so the product can show it, for example as its `UFormField`'s `error`.
- **The shortcut keys** stop at the limits and skip unavailable days. `t` goes to today, or to the nearest allowed day when today is outside the limits or unavailable.

```vue
<UFormField label="Starts" :error="error">
  <ZDateField
    v-model="starts"
    :min-value="opened"
    :max-value="closes"
    :is-date-unavailable="isHoliday"
    @invalid="(problem) => (error = problem?.message)"
  />
</UFormField>
```

## Compared with UInputDate

`ZDateField` works with code written for Nuxt UI's `UInputDate` and `UCalendar`: the same `CalendarDate`, the same limit props. It is not a replacement for `UInputDate`, which does three things this field doesn't:

- **Range**: `UInputDate` can hold a start and an end; a `ZDateField` holds one day.
- **Time**: `UInputDate`'s `granularity` reaches hours, minutes and seconds; a `ZDateField` is always a whole day.
- **Segments**: `UInputDate` edits the month, day and year as separate segments; a `ZDateField` is one text box with typed shortcuts.
