# ZMonthField and ZYearField

A month of a year (`components/MonthField.vue`, parser `utils/month-entry.ts`) and a year (`components/YearField.vue`,
parser `utils/year-entry.ts`). Both are [ZDateField](date-field.md) for a coarser value: the field under all three is
the same (`components/internal/EntryField.vue`, not a component of its own), so they type, commit, refuse, clear and
announce exactly as ZDateField does. What differs is how the text is read and the calendar: Nuxt UI's `UCalendar` with
`type="month"` or `type="year"`. **No JavaScript `Date` is made anywhere.**

```vue
<UFormField label="Period"><ZMonthField v-model="form.period" clearable class="w-full" /></UFormField>
<ZMonthField v-model="release" format="YYYY-MM" :min-value="opened" :max-value="closes" />
<UFormField label="Fiscal year"><ZYearField v-model="form.year" class="w-28" /></UFormField>
<ZYearField v-model="budgetYear" :min-value="2020" :max-value="2030" @invalid="(p) => (error = p?.message)" />
```

## What they share with ZDateField

- **The commit rules.** Enter, Tab or leaving commits what was typed; text that names no month or year clears the
  field (the box never shows a value the form isn't holding); untouched text keeps its value. A shortcut steps from the
  **committed** value (today's month or year when the field is empty), never from text typed since.
- **`@date-update`** fires once per settle (picked, cleared, a shortcut, Enter, or focus leaving for somewhere other
  than the field's own calendar) and carries the value just settled: the moment an inline editor should save. The name
  is ZDateField's on purpose, so one handler serves a table whose cells are dates, months and years.
- **Limits**: **`min-value`** and **`max-value`**. The calendar disables the months or years outside them; the shortcut
  keys stop at them (`t` included: today's, or the nearest limit); a typed value outside them is not committed — the
  field keeps the value it had and draws it back, and is marked invalid (`aria-invalid="true"`, Nuxt UI's error color,
  a message the input's `aria-describedby` names, and inside a `UFormField` its error) until the next edit, pick,
  shortcut or clear. **`@invalid`** carries `{ reason, date, limit, message }` (`reason` `'before-min'` or
  `'after-max'`; `message` "Choose a month on or after 03/2026." or "Choose a year on or before 2030.") and `null` once
  the mark is gone.
- **The rest of the field**: `clearable` (a clear button that empties the field, keeps focus and emits **`@clear`**),
  `disabled`, `placeholder`, `size`, `highlight`, `ui`, `portal`, a leading **`icon`** whose click emits
  **`@icon-click`** (a **`#leading`** slot takes its place), `calendar-icon`, `clear-label` and `choose-label` (the
  buttons' names: "Clear month", "Choose a month", "Clear year", "Choose a year"), Alt+↓ to open the calendar, and an
  exposed `focus()`. Attributes go to the input, as on ZDateField.

## ZMonthField

- **The model** is a `Temporal.PlainYearMonth` (`temporal-polyfill`'s `/implementation`, as ZDateField's PlainDate), an
  `@internationalized/date` `CalendarDate` (the type `UCalendar` holds for a month: read as the month it falls in,
  handed back as the first of it, with the caller's own class), or `null`. Whatever the model holds is what comes back,
  in `update:modelValue`, `@date-update` and `@invalid` alike; a model that starts out `null` hands back what
  **`model-type`** says, `'plain-year-month'` (the default) or `'calendar-date'`. Only a Gregorian `CalendarDate` is
  taken.
- **Typing**, in `MM/YYYY`: `5/26`, `05/26`, `5/2026`, `05/2026` and `052026` are May 2026. A four-digit part is the
  year wherever it is written, so `2026/5` is May 2026 too, and ISO's `2026-05` reads in every format. `5` or `12` is
  that month this year. **A year alone, `2026`, is December 2026**, the year's last month. A one- or two-digit year
  reads as ZDateField reads one (within 20 years ahead and 79 behind); a four-digit one must be 1000 or later. Month 0
  or 13, three-digit years and a year of all zeros are not a month.
- **Shortcut keys**: `t` this month; `y` and `r` the same month a year before or after; `m` and `h` the month before
  or after; `-` and `+` a month either way (`_` and `=` too). The format's separator is never a shortcut, so in
  `YYYY-MM`, `-` types a dash and `_` is the month before. Keys work in either case.
- **Format and locale.** `format` is `MM` and `YYYY` in either order with one separator: `MM/YYYY`, `MM.YYYY`,
  `YYYY-MM` … Unset, it is the locale's date order without the day (`monthEntryFormatFor`: `en` → `MM/YYYY`, `de` →
  `MM.YYYY`, `sv` → `YYYY-MM`), so a month field reads like a date field beside it. `locale` is the calendar's
  language; Nuxt UI's by default. The placeholder is the pattern.
- **The calendar** is `UCalendar type="month"`: a year of months, its heading paging to a grid of years.

## ZYearField

- **The model** is the year as a number, or `null`. Never a string: what is typed is only the model once it commits.
- **Typing**: `2026`, or `26` and `6` read as ZDateField reads a two-digit year (in 2026: 2026, 2006; `47` is 1947).
  Anything else — letters, three digits, a year before 1000 — clears the field when it commits.
- **Shortcut keys**: `t` this year; `y` or `-` the year before; `r` or `+` the year after (`_` and `=` too).
- **The calendar** is `UCalendar type="year"`. `locale` is its language; the placeholder is `YYYY`.

## A month of the year, with no year

A month on its own, 1 to 12, is **a `USelect` recipe, not a ZMonthField mode**. With no year there is nothing a date
field does: no year to step past December or page in a calendar, no limits in order, no "this month" that means one
month rather than every year's. What it needs is twelve fixed choices, which is a select, with Nuxt UI's own keyboard
(type a letter to jump to the month). `monthOfYearItems(locale?, { month?, numbered? })` (`utils/month-entry.ts`) gives
the items: `{ label, value }`, named by `Intl` in the locale (`en` by default; `month: 'short'` for "Jan"), valued 1 to
12, and with `numbered`, labelled "1 - January" so the number can be typed too.

```vue
<UFormField label="Month"><USelect v-model="form.month" :items="monthOfYearItems('en', { numbered: true })" /></UFormField>
<UFormField label="Year"><ZYearField v-model="form.year" /></UFormField>
```

## The parsers

Framework-free TypeScript, auto-imported in a product and importable anywhere as `@zooui/nuxt/month-entry` and
`@zooui/nuxt/year-entry`. Months: `parseMonthEntry`, `formatMonthEntry`, `commitMonthEntry`, `applyMonthShortcut`,
`isMonthShortcut`, `monthEntryFormat`, `monthEntryFormatFor`, `US_MONTH_ENTRY`, `FIRST_ENTRY_MONTH`, `LAST_ENTRY_MONTH`,
`checkMonthLimits`, `monthLimitMessage`, `monthModelTypeOf`, `toPlainYearMonth`, `fromPlainYearMonth`,
`monthOfYearItems`. Years: `parseYearEntry`, `formatYearEntry`, `commitYearEntry`, `applyYearShortcut`,
`isYearShortcut`, `checkYearLimits`, `yearLimitMessage`, `FIRST_ENTRY_YEAR`, `LAST_ENTRY_YEAR`. Each takes "today" from
its caller. All three fields read a typed year with date-entry's `entryYear`. Tests: `scripts/month-entry.test.mjs` and
`scripts/year-entry.test.mjs` (`node:test`); the components in `apps/base/tests/month-year-field.spec.ts` and
`apps/forest/tests/month-year-field.spec.ts`.
