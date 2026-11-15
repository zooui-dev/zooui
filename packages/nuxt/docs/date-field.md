# ZDateField

The date field (`components/DateField.vue`), with its parser (`utils/date-entry.ts`) and `useToday()`. The model is
a `Temporal.PlainDate` or `null`, the same type a `date` column comes back as, and **no JavaScript `Date` is made
anywhere**: a `Date` is an instant, and every conversion to a day goes through a time zone. The calendar's `CalendarDate`
is converted by its fields alone.

```vue
<UFormField label="Ends"><ZDateField v-model="form.endDate" clearable class="w-full" /></UFormField>
<ZDateField v-model="due" locale="de" />                <!-- DD.MM.YYYY, a German calendar -->
<ZDateField v-model="due" format="YYYY-MM-DD" />
```

- **Typing**, in MM/DD/YYYY: `5` or `12` is that day this month, `0512` May 12, `051226`, `5/12/26` and `5/12/2026`
  carry the year (a two-digit year lands within 20 years ahead and 79 behind; a four-digit one must be 1000 or later).
  A year of all zeros is not a date: `5/12/0`, `5/12/00` and `051200` clear the field rather
  than land on 2000. Other formats read the same shapes in their own order. Enter, Tab or leaving commits; text that
  isn't a date clears the field; untouched text keeps its date, even one it couldn't read back (a stored year before
  1000).
- **Shortcut keys**: `t` today; `m`/`h` first and last of the month, `y`/`r` of the year (again to keep walking); `+`
  or `=` the next day, `-` or `_` the day before. The format's separator is never a shortcut, so in `YYYY-MM-DD`, `-`
  types a dash and `_` is the day before. Alt+↓ opens the calendar. Shortcuts stop at 1000-01-01 and 9999-12-31.
- **Format and locale.** `format` is a pattern of `MM`, `DD` and `YYYY` in month-day-year, day-month-year or
  year-month-day order with one separator: `MM/DD/YYYY`, `DD/MM/YYYY`, `DD.MM.YYYY`, `YYYY-MM-DD` …
  `locale` is the calendar's language. **By default** the locale is Nuxt UI's (`<UApp :locale>`,
  `en` unless set) and the format is that locale's own numeric order (`dateEntryFormatFor`: `en` → `MM/DD/YYYY`,
  `en-GB` → `DD/MM/YYYY`, `de` → `DD.MM.YYYY`, `sv` → `YYYY-MM-DD`), so a product on `en` gets `MM/DD/YYYY` with
  no props. The placeholder is the pattern. The two buttons are named by `clear-label` and `choose-label` (English
  by default) for a product in another language.
- **`@date-update`** fires once per settle (picked, cleared, a shortcut, Enter, or focus leaving for somewhere other
  than its own calendar) and always carries the date just settled, even before a parent-owned v-model has caught up:
  the moment an inline editor should save.
- **Icons.** `icon` puts a leading icon in the field, and a click on it emits
  **`@icon-click`** with the `MouseEvent` (the field's own handling is untouched: the click still blurs the input, so
  a typed date settles first). `calendar-icon` replaces the calendar button's icon (`i-lucide-calendar` by default).
  The layer bundles only its default; an icon a product passes is the product's to bundle (its `icon.clientBundle`) or
  to serve from its icon endpoint.
- **The calendar** heads its columns with the locale's narrow weekdays (`S M T W T F S` in `en`, `M D M D F S S` in
  `de`).
- **Today** is `useToday()`: the browser's day, in the browser's time zone, client-only (it throws on the server,
  where the zone is the server's). Server code that needs the business's today wants
  `Temporal.Now.plainDateISO(companyZone)` instead.
- **Look.** Nuxt UI's `UInput` and `UCalendar` in the product's colors; while the calendar is open the field takes
  Nuxt UI's `highlight` ring. The placeholder keeps the input's own ink: a product that wants it darker (its own
  placeholder color token) passes `:ui="{ base: 'placeholder:…' }"` or sets it on `ui.input` in `app.config`.

**The parser** is framework-free TypeScript, auto-imported in a product and importable anywhere as
`@zooui/nuxt/date-entry` (a server route, a domain package): `parseDateEntry`, `formatDateEntry`, `commitDateEntry`,
`applyDateShortcut`, `dateEntryFormat`, `dateEntryFormatFor`, `entryDay`, `US_DATE_ENTRY`, `FIRST_ENTRY_DATE`,
`LAST_ENTRY_DATE`. Each takes "today" from its caller and the format last (default `MM/DD/YYYY`), so a call that
relies on the default reads the same. Its tests are `scripts/date-entry.test.mjs` (`node:test`, every format).

**Temporal** is `temporal-polyfill`'s `/implementation` entry (^1.0.5), never the bare entry, which becomes the
engine's own `Temporal` where one exists. A product builds its `PlainDate`s from the same subpath, so there is one
class; a product that already installs `temporal-polyfill` imports from that subpath too, and one that doesn't adds
it.
