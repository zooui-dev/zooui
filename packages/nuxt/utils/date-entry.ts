// What a person types into a date field, turned into a calendar day — and the one-key shortcuts that move it. The
// parsing behind <ZDateField>, with the field order and
// separator made a parameter: MM/DD/YYYY is one format among several, and the default for every function
// here.
//
// NO JAVASCRIPT `Date` HERE, and no clock. A `Date` is an instant, not a day: turning one into "the 12th" goes
// through a time zone, and every place that happens is a chance for a due date to land on the 11th. Everything
// below is Temporal.PlainDate arithmetic, and "today" is always handed in by the caller (the browser's own day,
// see composables/useToday.ts), so these functions give the same answer on any machine at any hour and are
// testable with a fixed today.
//
// Framework-free: Nuxt auto-imports it in a product, and `@zooui/nuxt/date-entry` imports it anywhere else (a
// server route, a domain package). Temporal is the polyfill's own `/implementation`, never the bare entry, which
// resolves to `globalThis.Temporal` where an engine has one: one class wherever this runs, the same one
// a database client or serializer in the product hands out.
import { Temporal } from 'temporal-polyfill/implementation'

type PlainDate = Temporal.PlainDate

/** The order a format writes a day's fields in: month-day-year (US), day-month-year, or year-month-day (ISO). */
export type DateEntryOrder = 'MDY' | 'DMY' | 'YMD'

/** How a field writes a day and reads one back. Make one with dateEntryFormat('DD.MM.YYYY'); every function here
 *  also takes the pattern string itself. */
export interface DateEntryFormat {
  /** The pattern it was made from, `MM/DD/YYYY` — what the field shows as its placeholder. */
  readonly pattern: string
  readonly order: DateEntryOrder
  /** The one character between the fields. */
  readonly separator: string
}

const ORDERS: readonly DateEntryOrder[] = ['MDY', 'DMY', 'YMD']
const TOKEN = { MM: 'M', DD: 'D', YYYY: 'Y' } as const
const PATTERN = /^(MM|DD|YYYY)(.)(MM|DD|YYYY)\2(MM|DD|YYYY)$/u
const formats = new Map<string, DateEntryFormat>()

/**
 * A format from its pattern: `MM`, `DD` and `YYYY` in month-day-year, day-month-year or year-month-day order, with
 * one separator between them that isn't a letter, a digit or a space — `MM/DD/YYYY`, `DD/MM/YYYY`, `DD.MM.YYYY`,
 * `YYYY-MM-DD`. Throws a RangeError for anything else.
 */
export function dateEntryFormat(pattern: string): DateEntryFormat {
  const cached = formats.get(pattern)
  if (cached) return cached
  const match = PATTERN.exec(pattern)
  const order = match && [match[1], match[3], match[4]].map((t) => TOKEN[t as keyof typeof TOKEN]).join('')
  const separator = match?.[2] ?? ''
  if (!match || !ORDERS.includes(order as DateEntryOrder) || /[\p{L}\p{N}\s]/u.test(separator)) {
    throw new RangeError(`Not a date entry format: "${pattern}". Use MM, DD and YYYY in MDY, DMY or YMD order with one separator between them, such as "MM/DD/YYYY", "DD.MM.YYYY" or "YYYY-MM-DD".`)
  }
  const format = Object.freeze({ pattern, order: order as DateEntryOrder, separator })
  formats.set(pattern, format)
  return format
}

/** The US format, and the default wherever a format is optional: MM/DD/YYYY. */
export const US_DATE_ENTRY = dateEntryFormat('MM/DD/YYYY')

const formatOf = (f: DateEntryFormat | string) => (typeof f === 'string' ? dateEntryFormat(f) : f)

/**
 * The format a locale writes a numeric date in, from Intl: `en` and `en-US` MM/DD/YYYY, `en-GB` and `fr`
 * DD/MM/YYYY, `de` DD.MM.YYYY, `nl` DD-MM-YYYY, `sv` and `en-CA` YYYY-MM-DD, `ja` YYYY/MM/DD. Only the order of the
 * fields and the first separator are taken (spaces and direction marks dropped: `ko` writes "2026. 11. 13.", which
 * reads as YYYY.MM.DD); a locale whose separator isn't one character gets `/`, and one whose order isn't MDY, DMY
 * or YMD gets MM/DD/YYYY.
 */
export function dateEntryFormatFor(locale: string): DateEntryFormat {
  // Intl formats an instant, so it is handed the number 0 in UTC rather than a Date: only the parts' order and the
  // text between them are read, never the day they name.
  const parts = new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' }).formatToParts(0)
  const order = parts.flatMap((p) => (p.type === 'year' ? 'Y' : p.type === 'month' ? 'M' : p.type === 'day' ? 'D' : [])).join('')
  if (!ORDERS.includes(order as DateEntryOrder)) return US_DATE_ENTRY
  const literal = parts.find((p) => p.type === 'literal')?.value.replace(/[\s‎‏؜]/gu, '') ?? ''
  const separator = [...literal].length === 1 && !/[\p{L}\p{N}]/u.test(literal) ? literal : '/'
  const token = { M: 'MM', D: 'DD', Y: 'YYYY' } as const
  return dateEntryFormat([...order].map((c) => token[c as keyof typeof token]).join(separator))
}

// A calendar day from parts, or null when there is no such day (month 13, Feb 30, Apr 31).
function dayOf(year: number, month: number, day: number): PlainDate | null {
  if (!Number.isInteger(year) || year < 1 || year > 9999) return null
  if (!Number.isInteger(month) || month < 1 || month > 12) return null
  const first = Temporal.PlainDate.from({ year, month, day: 1 })
  if (!Number.isInteger(day) || day < 1 || day > first.daysInMonth) return null
  return first.with({ day })
}

// A one- or two-digit year lands within the 100 years ending 20 years from now: in 2026, "46" is 2046 and "47"
// is 1947. Far enough ahead for a loan's maturity date, near enough back for a building's year. A year of all
// zeros ("0", "00", "0000") is no year at all: never 2000.
function fullYear(digits: string, today: PlainDate): number | null {
  if (/^0+$/.test(digits)) return null
  if (digits.length === 4) return Number(digits) >= 1000 ? Number(digits) : null
  if (digits.length > 2) return null
  const century = Math.floor(today.year / 100) * 100
  const year = century + Number(digits)
  if (year > today.year + 20) return year - 100
  if (year <= today.year - 80) return year + 100
  return year
}

const DIGITS = /^\d{1,2}$/

// The day named by `parts`, written in the format's order: three parts with the year, or two without it (then
// the year is today's, wherever the format puts it — so in YYYY-MM-DD, "5-12" is May 12).
function dayFromParts(order: DateEntryOrder, parts: string[], today: PlainDate): PlainDate | null {
  const fields = parts.length === 2 ? order.replace('Y', '') : order
  if (parts.length !== fields.length) return null
  const part = (field: 'M' | 'D' | 'Y') => parts[fields.indexOf(field)] ?? ''
  const month = part('M')
  const day = part('D')
  if (!DIGITS.test(month) || !DIGITS.test(day)) return null
  if (parts.length === 2) return dayOf(today.year, Number(month), Number(day))
  if (!/^\d+$/.test(part('Y'))) return null
  const year = fullYear(part('Y'), today)
  return year === null ? null : dayOf(year, Number(month), Number(day))
}

/**
 * Parse what was typed into a date field. Digits and the format's separator only; anything else is not a date.
 * In MM/DD/YYYY (the default):
 *
 * - `5`, `12` (up to 31) — that day of today's month
 * - `0512` — May 12 this year; `051226` — May 12, 2026
 * - `5/12` — this year; `5/12/26`, `5/12/2026`
 *
 * Other formats read the same shapes in their own order: in DD/MM/YYYY `1205` and `12/5` are May 12, and
 * `120526` is May 12, 2026; in YYYY-MM-DD `0512` and `5-12` are May 12 and `260512` and `2026-5-12` carry the year.
 * A bare day of the month reads the same in all of them. Returns null for anything that doesn't name a real day,
 * including blank text and a year of all zeros (`5/12/0`, `5/12/00`, `051200`).
 */
export function parseDateEntry(text: string, today: PlainDate, format: DateEntryFormat | string = US_DATE_ENTRY): PlainDate | null {
  const { order, separator } = formatOf(format)
  const value = text.trim()
  if (!value || [...value].some((c) => c !== separator && !/\d/.test(c))) return null

  if (value.includes(separator)) return dayFromParts(order, value.split(separator), today)

  if (Number(value) === 0) return null
  if (value.length === 1 || (value.length === 2 && Number(value) <= 31))
    return dayOf(today.year, today.month, Number(value))
  if (value.length === 4) return dayFromParts(order, [value.slice(0, 2), value.slice(2, 4)], today)
  if (value.length === 6) return dayFromParts(order, [value.slice(0, 2), value.slice(2, 4), value.slice(4, 6)], today)
  return null
}

// The days a field can show and read back. formatDateEntry writes a four-digit year and parseDateEntry only reads
// four-digit years from 1000 (a typed "0026" is far likelier a slip than the year 26), so a date outside these
// would be shown, then cleared on blur as not a date.
export const FIRST_ENTRY_DATE = Temporal.PlainDate.from({ year: 1000, month: 1, day: 1 })
export const LAST_ENTRY_DATE = Temporal.PlainDate.from({ year: 9999, month: 12, day: 31 })

/**
 * An ISO day as it may be stored from outside a date field (an import): the day as `YYYY-MM-DD` when a field can show
 * and read it back, else null. Text that names no day (`05/12/2026`, `2026-02-30`) is null too, so one bad cell
 * doesn't abort an import; what Temporal does read (`20260512`, `2026-05-12T10:00`) comes back in the canonical form. A
 * year before 1000 in a file is far likelier a slip than a real date, and stored, it would sit in a field that couldn't
 * be edited back to it.
 */
export function entryDay(iso: string | null | undefined): string | null {
  if (!iso) return null
  let day: PlainDate
  try {
    day = Temporal.PlainDate.from(iso)
  } catch (e) {
    if (e instanceof RangeError) return null
    throw e
  }
  return Temporal.PlainDate.compare(day, FIRST_ENTRY_DATE) < 0 || Temporal.PlainDate.compare(day, LAST_ENTRY_DATE) > 0
    ? null
    : day.toString()
}

/** The day in the format (MM/DD/YYYY by default), zero-padded — the form parseDateEntry reads back. Empty for no date. */
export function formatDateEntry(d: PlainDate | null | undefined, format: DateEntryFormat | string = US_DATE_ENTRY): string {
  if (!d) return ''
  const { order, separator } = formatOf(format)
  const pad = (n: number, w: number) => String(n).padStart(w, '0')
  const field = { M: pad(d.month, 2), D: pad(d.day, 2), Y: pad(d.year, 4) }
  return [...order].map((c) => field[c as keyof typeof field]).join(separator)
}

/**
 * The date a field holds once its text is committed: `current` while the text is still what formatDateEntry drew
 * for it, else what parseDateEntry reads (null for blank or not a date). Passing through a field without editing
 * never changes its date, even one parseDateEntry can't read back, such as a stored year before 1000.
 */
export function commitDateEntry(text: string, current: PlainDate | null, today: PlainDate, format: DateEntryFormat | string = US_DATE_ENTRY): PlainDate | null {
  const typed = text.trim()
  if (typed === formatDateEntry(current, format)) return current
  return typed ? parseDateEntry(typed, today, format) : null
}

/**
 * The date a one-key shortcut moves to, or null when `key` isn't a shortcut (so the key types as usual).
 * `current` is the field's date, or null when it is empty — then the shortcut works from today.
 *
 * - `t` today
 * - `m` first of the month; on the 1st already, the first of the month before
 * - `h` last of the month; on the last already, the last of the month after
 * - `y` January 1; on Jan 1 already, the year before's
 * - `r` December 31; on Dec 31 already, the year after's
 * - `+` or `=` next day, `-` or `_` previous day
 *
 * The format's separator is never a shortcut, so it can be typed: in YYYY-MM-DD, `-` writes a dash and `_` is the
 * previous day.
 *
 * Pressing m, h, y or r again keeps walking, so "hhh" is the end of the month after next. The walk stops at
 * FIRST_ENTRY_DATE and LAST_ENTRY_DATE, so a shortcut never lands on a day the field can't read back.
 */
export function applyDateShortcut(key: string, current: PlainDate | null, today: PlainDate, format: DateEntryFormat | string = US_DATE_ENTRY): PlainDate | null {
  if (key === formatOf(format).separator) return null
  const next = shortcutTarget(key, current ?? today, today)
  if (!next) return null
  if (Temporal.PlainDate.compare(next, FIRST_ENTRY_DATE) < 0) return FIRST_ENTRY_DATE
  if (Temporal.PlainDate.compare(next, LAST_ENTRY_DATE) > 0) return LAST_ENTRY_DATE
  return next
}

function shortcutTarget(key: string, base: PlainDate, today: PlainDate): PlainDate | null {
  switch (key.toLowerCase()) {
    case 't':
      return today
    case 'm':
      return (base.day === 1 ? base.subtract({ days: 1 }) : base).with({ day: 1 })
    case 'h': {
      const month = base.day === base.daysInMonth ? base.add({ days: 1 }) : base
      return month.with({ day: month.daysInMonth })
    }
    case 'y':
      return (base.month === 1 && base.day === 1 ? base.subtract({ days: 1 }) : base).with({ month: 1, day: 1 })
    case 'r':
      return (base.month === 12 && base.day === 31 ? base.add({ days: 1 }) : base).with({ month: 12, day: 31 })
    case '+':
    case '=':
      return base.add({ days: 1 })
    case '-':
    case '_':
      return base.subtract({ days: 1 })
    default:
      return null
  }
}
