// What a person types into a month field, turned into a month of a year — and the one-key shortcuts that move it. The
// parsing behind <ZMonthField>, on ZDateField's rules (date-entry.ts): no JavaScript `Date`, "today" handed in by the
// caller, a two-digit year read as ZDateField reads one (entryYear), and the field order and separator a parameter.
//
// A month is a Temporal.PlainYearMonth. A field may also hold an @internationalized/date CalendarDate (the type Nuxt
// UI's UCalendar uses for a month too), read as the month it falls in and handed back as the first of it.
//
// Framework-free: Nuxt auto-imports it in a product, and `@zooui/nuxt/month-entry` imports it anywhere else.
import { CalendarDate } from '@internationalized/date'
import { Temporal } from 'temporal-polyfill/implementation'
import { dateEntryFormatFor, dateModelTypeOf, entryYear, toPlainDate, type CalendarDateLike } from './date-entry.ts'

type PlainDate = Temporal.PlainDate
type PlainYearMonth = Temporal.PlainYearMonth

/** The order a format writes a month's fields in: month then year, or year then month (ISO). */
export type MonthEntryOrder = 'MY' | 'YM'

/** How a field writes a month and reads one back. Make one with monthEntryFormat('MM/YYYY'); every function here also
 *  takes the pattern string itself. */
export interface MonthEntryFormat {
  /** The pattern it was made from, `MM/YYYY` — what the field shows as its placeholder. */
  readonly pattern: string
  readonly order: MonthEntryOrder
  /** The one character between the fields. */
  readonly separator: string
}

const MONTH_PATTERN = /^(MM|YYYY)(.)(MM|YYYY)$/u
const monthFormats = new Map<string, MonthEntryFormat>()

/**
 * A format from its pattern: `MM` and `YYYY` in either order with one separator between them that isn't a letter, a
 * digit or a space — `MM/YYYY`, `MM.YYYY`, `YYYY-MM`. Throws a RangeError for anything else.
 */
export function monthEntryFormat(pattern: string): MonthEntryFormat {
  const cached = monthFormats.get(pattern)
  if (cached) return cached
  const match = MONTH_PATTERN.exec(pattern)
  const separator = match?.[2] ?? ''
  if (!match || match[1] === match[3] || /[\p{L}\p{N}\s]/u.test(separator)) {
    throw new RangeError(`Not a month entry format: "${pattern}". Use MM and YYYY in either order with one separator between them, such as "MM/YYYY", "MM.YYYY" or "YYYY-MM".`)
  }
  const format = Object.freeze({ pattern, order: (match[1] === 'MM' ? 'MY' : 'YM') as MonthEntryOrder, separator })
  monthFormats.set(pattern, format)
  return format
}

/** The US format, and the default wherever a format is optional: MM/YYYY. */
export const US_MONTH_ENTRY = monthEntryFormat('MM/YYYY')

const formatOf = (f: MonthEntryFormat | string) => (typeof f === 'string' ? monthEntryFormat(f) : f)

/**
 * The format a locale writes a month in: its numeric date format (dateEntryFormatFor) without the day, so a month
 * field reads the same way as a date field beside it. `en` MM/YYYY, `en-GB` and `fr` MM/YYYY, `de` MM.YYYY, `sv` and
 * `en-CA` YYYY-MM, `ja` YYYY/MM.
 */
export function monthEntryFormatFor(locale: string): MonthEntryFormat {
  const { order, separator } = dateEntryFormatFor(locale)
  return monthEntryFormat(order === 'YMD' ? `YYYY${separator}MM` : `MM${separator}YYYY`)
}

// A month from parts, or null when there is no such month.
function monthOf(year: number | null, month: number): PlainYearMonth | null {
  if (year === null || !Number.isInteger(year) || year < 1000 || year > 9999) return null
  if (!Number.isInteger(month) || month < 1 || month > 12) return null
  return Temporal.PlainYearMonth.from({ year, month })
}

const MONTH_DIGITS = /^\d{1,2}$/

// Two parts, a month and a year. A part of four digits can only be the year, so it is wherever it is written; two
// short parts are read in the format's order.
function monthFromParts(order: MonthEntryOrder, a: string, b: string, today: PlainDate): PlainYearMonth | null {
  if (!/^\d+$/.test(a) || !/^\d+$/.test(b)) return null
  const yearFirst = a.length > 2 || (b.length <= 2 && order === 'YM')
  const [year, month] = yearFirst ? [a, b] : [b, a]
  if (!MONTH_DIGITS.test(month)) return null
  return monthOf(entryYear(year, today), Number(month))
}

/**
 * Parse what was typed into a month field. Digits and the format's separator only (and ISO's `-` between a four-digit
 * year and a month); anything else is not a month. In MM/YYYY (the default):
 *
 * - `5/26`, `05/26`, `5/2026`, `05/2026` — May 2026 (a two-digit year as ZDateField reads one)
 * - `2026/5` and `2026-05` — May 2026 too: a four-digit part is the year, wherever it is written
 * - `052026` — May 2026
 * - `5`, `12` — that month this year
 * - `2026` — a year alone is December of that year, the year's last month
 *
 * In YYYY-MM, two short parts read year first (`26-5` is May 2026) and six digits are YYYYMM; the rest reads the same.
 * Returns null for anything that doesn't name a real month: blank text, month 0 or 13, three digits, a year before 1000
 * or of all zeros.
 */
export function parseMonthEntry(text: string, today: PlainDate, format: MonthEntryFormat | string = US_MONTH_ENTRY): PlainYearMonth | null {
  const { order, separator } = formatOf(format)
  const value = text.trim()
  if (!value) return null
  const iso = /^(\d{4})-(\d{1,2})$/.exec(value)
  if (iso) return monthFromParts('YM', iso[1]!, iso[2]!, today)
  if ([...value].some((c) => c !== separator && !/\d/.test(c))) return null

  if (value.includes(separator)) {
    const parts = value.split(separator)
    return parts.length === 2 ? monthFromParts(order, parts[0]!, parts[1]!, today) : null
  }
  if (value.length <= 2) return monthOf(today.year, Number(value))
  if (value.length === 4) return monthOf(entryYear(value, today), 12)
  if (value.length === 6) {
    return order === 'MY' ? monthFromParts('MY', value.slice(0, 2), value.slice(2), today) : monthFromParts('YM', value.slice(0, 4), value.slice(4), today)
  }
  return null
}

/** The month in the format (MM/YYYY by default), zero-padded — the form parseMonthEntry reads back. Empty for none. */
export function formatMonthEntry(m: PlainYearMonth | null | undefined, format: MonthEntryFormat | string = US_MONTH_ENTRY): string {
  if (!m) return ''
  const { order, separator } = formatOf(format)
  const month = String(m.month).padStart(2, '0')
  const year = String(m.year).padStart(4, '0')
  return order === 'MY' ? `${month}${separator}${year}` : `${year}${separator}${month}`
}

/**
 * The month a field holds once its text is committed: `current` while the text is still what formatMonthEntry drew
 * for it, else what parseMonthEntry reads (null for blank or not a month).
 */
export function commitMonthEntry(text: string, current: PlainYearMonth | null, today: PlainDate, format: MonthEntryFormat | string = US_MONTH_ENTRY): PlainYearMonth | null {
  const typed = text.trim()
  if (typed === formatMonthEntry(current, format)) return current
  return typed ? parseMonthEntry(typed, today, format) : null
}

// The months a field can show and read back: a four-digit year, from 1000.
export const FIRST_ENTRY_MONTH = Temporal.PlainYearMonth.from({ year: 1000, month: 1 })
export const LAST_ENTRY_MONTH = Temporal.PlainYearMonth.from({ year: 9999, month: 12 })

// Months each key moves by; `t` is this month.
const MONTH_STEP: Record<string, number> = { 't': 0, 'y': -12, 'r': 12, 'm': -1, '-': -1, '_': -1, 'h': 1, '+': 1, '=': 1 }

/** Whether `key` is one of applyMonthShortcut's keys in this format (its separator never is), so a field can take the
 *  key even when the shortcut has nowhere to go. */
export function isMonthShortcut(key: string, format: MonthEntryFormat | string = US_MONTH_ENTRY): boolean {
  return key !== formatOf(format).separator && Object.hasOwn(MONTH_STEP, key.toLowerCase())
}

/**
 * The month a one-key shortcut moves to, or null when `key` isn't a shortcut (so the key types as usual). `current`
 * is the field's month, or null when it is empty — then the shortcut works from this month.
 *
 * - `t` this month
 * - `y` the same month a year before, `r` a year after
 * - `m`, `-` or `_` the month before; `h`, `+` or `=` the month after
 *
 * The format's separator is never a shortcut, so it can be typed: in YYYY-MM, `-` writes a dash and `_` is the month
 * before. It stops at FIRST_ENTRY_MONTH and LAST_ENTRY_MONTH, and at the limits' `minValue` and `maxValue` (`t`
 * included: this month, or the nearest limit to it). Null when the limits leave no month at all.
 */
export function applyMonthShortcut(
  key: string,
  current: PlainYearMonth | null,
  today: PlainDate,
  format: MonthEntryFormat | string = US_MONTH_ENTRY,
  limits?: MonthLimits,
): PlainYearMonth | null {
  if (!isMonthShortcut(key, format)) return null
  const k = key.toLowerCase()
  const lo = laterMonth(toPlainYearMonth(limits?.minValue) ?? FIRST_ENTRY_MONTH, FIRST_ENTRY_MONTH)
  const hi = earlierMonth(toPlainYearMonth(limits?.maxValue) ?? LAST_ENTRY_MONTH, LAST_ENTRY_MONTH)
  if (Temporal.PlainYearMonth.compare(lo, hi) > 0) return null
  const now = today.toPlainYearMonth()
  const base = k === 't' ? now : (current ?? now)
  // Stepped by month count, so it never throws past year 9999 or before year 1: the clamp below pulls it in.
  const index = base.year * 12 + (base.month - 1) + MONTH_STEP[k]!
  const target = Temporal.PlainYearMonth.from({ year: Math.floor(index / 12), month: (index % 12) + 1 })
  return laterMonth(lo, earlierMonth(target, hi))
}

const earlierMonth = (a: PlainYearMonth, b: PlainYearMonth) => (Temporal.PlainYearMonth.compare(a, b) <= 0 ? a : b)
const laterMonth = (a: PlainYearMonth, b: PlainYearMonth) => (Temporal.PlainYearMonth.compare(a, b) >= 0 ? a : b)

// ── The two month types ─────────────────────────────────────────────────────────────────────────────────────────

/** What a month field holds and hands back: a Temporal.PlainYearMonth, or an @internationalized/date CalendarDate
 *  (the first of the month). */
export type MonthModelType = 'plain-year-month' | 'calendar-date'

/** A month in either type. */
export type EntryMonth = PlainYearMonth | CalendarDateLike

/** Which of the two types `value` is, or null for anything else (null included). */
export function monthModelTypeOf(value: unknown): MonthModelType | null {
  if (value instanceof Temporal.PlainYearMonth) return 'plain-year-month'
  return dateModelTypeOf(value) === 'calendar-date' ? 'calendar-date' : null
}

/**
 * The month as a PlainYearMonth: a PlainYearMonth as it is, a Gregorian CalendarDate as the month it falls in (its
 * day is ignored), null for null. A CalendarDate in another calendar system throws a RangeError, as toPlainDate does.
 */
export function toPlainYearMonth(value: EntryMonth | null | undefined): PlainYearMonth | null {
  if (value == null) return null
  if (value instanceof Temporal.PlainYearMonth) return value
  if (monthModelTypeOf(value) !== 'calendar-date') throw new TypeError(`Not a month: expected a Temporal.PlainYearMonth or an @internationalized/date CalendarDate, got ${String(value)}.`)
  return toPlainDate(value)!.toPlainYearMonth()
}

type CalendarDateClass = new (year: number, month: number, day: number) => CalendarDateLike

/**
 * The month in the type asked for: the PlainYearMonth itself, or a CalendarDate on the first of the month. `like`, a
 * CalendarDate the caller already holds, names the class to build with, as for fromPlainDate.
 */
export function fromPlainYearMonth(m: PlainYearMonth, type: 'plain-year-month', like?: CalendarDateLike | null): PlainYearMonth
export function fromPlainYearMonth(m: PlainYearMonth, type: 'calendar-date', like?: CalendarDateLike | null): CalendarDate
export function fromPlainYearMonth(m: PlainYearMonth, type: MonthModelType, like?: CalendarDateLike | null): EntryMonth
export function fromPlainYearMonth(m: PlainYearMonth | null, type: MonthModelType, like?: CalendarDateLike | null): EntryMonth | null
export function fromPlainYearMonth(m: PlainYearMonth | null, type: MonthModelType, like?: CalendarDateLike | null): EntryMonth | null {
  if (!m || type === 'plain-year-month') return m
  const Class = (like?.constructor ?? CalendarDate) as CalendarDateClass
  return new Class(m.year, m.month, 1)
}

// ── Limits ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** The months a field takes, as Nuxt UI's UCalendar names them: the first and the last, either type of month. */
export interface MonthLimits {
  minValue?: EntryMonth | null
  maxValue?: EntryMonth | null
}

/** Why the limits refuse a month. */
export type MonthLimitReason = 'before-min' | 'after-max'

/** A month the limits refuse: why, the month, and the limit it crossed. A PlainYearMonth here; ZMonthField's
 *  `invalid` hands it back in the model's own type. */
export interface MonthLimitProblem<M = PlainYearMonth> {
  readonly reason: MonthLimitReason
  readonly date: M
  readonly limit: M
}

/** Why the limits refuse `month`, or null when they take it. */
export function checkMonthLimits(month: PlainYearMonth, limits?: MonthLimits): MonthLimitProblem | null {
  const min = toPlainYearMonth(limits?.minValue)
  if (min && Temporal.PlainYearMonth.compare(month, min) < 0) return { reason: 'before-min', date: month, limit: min }
  const max = toPlainYearMonth(limits?.maxValue)
  if (max && Temporal.PlainYearMonth.compare(month, max) > 0) return { reason: 'after-max', date: month, limit: max }
  return null
}

/** An English sentence for a refused month, in the field's format: "Choose a month on or after 03/2026.", "Choose a
 *  month on or before 08/2026." A product in another language builds its own from `reason` and `limit`. */
export function monthLimitMessage(problem: MonthLimitProblem, format: MonthEntryFormat | string = US_MONTH_ENTRY): string {
  return `Choose a month on or ${problem.reason === 'before-min' ? 'after' : 'before'} ${formatMonthEntry(problem.limit, format)}.`
}

// ── A month of the year, with no year ───────────────────────────────────────────────────────────────────────────

/** One month of the year for a USelect: `value` 1 (January) to 12, `label` its name in the locale. */
export interface MonthOfYearItem {
  label: string
  value: number
}

/**
 * The twelve months as USelect items, named by Intl in `locale` (`en` by default): "January" … "December". `month`
 * picks the name's length (`'long'`, `'short'`); `numbered` puts the month's number first, "1 - January", so a
 * person can type it.
 *
 *   <USelect v-model="month" :items="monthOfYearItems('en', { numbered: true })" />
 */
export function monthOfYearItems(locale = 'en', options: { month?: 'long' | 'short', numbered?: boolean } = {}): MonthOfYearItem[] {
  // Intl names a month of an instant, so it is handed a number of milliseconds in UTC (the 15th of each month of 2001),
  // never a Date: only the month's name is read.
  const name = new Intl.DateTimeFormat(locale, { month: options.month ?? 'long', timeZone: 'UTC' })
  return Array.from({ length: 12 }, (_, i) => {
    const label = name.format(Date.UTC(2001, i, 15))
    return { label: options.numbered ? `${i + 1} - ${label}` : label, value: i + 1 }
  })
}
