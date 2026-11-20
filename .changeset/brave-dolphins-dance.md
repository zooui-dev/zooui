---
type: feat
"@zooui/nuxt"
---

New `ZMonthField` and `ZYearField`: a month of a year and a year, typed, stepped with a key or picked from a calendar, behaving just like `ZDateField`.

- `ZMonthField` holds a `Temporal.PlainYearMonth` (or a `CalendarDate`); type `5/26`, `05/2026` or `2026-05`, in the locale's order or a `format` of your own.
- `ZYearField` holds the year as a number; type `2026` or `26`.
- Shortcut keys: `t` for today's month or year, `y`/`r` and `m`/`h` to step a year or a month, `-` and `+` to step.
- `min-value` and `max-value` limit both; a typed value outside them is refused and reported through `@invalid`.
- For a month of the year with no year, `monthOfYearItems()` gives `USelect` items named in the locale.
