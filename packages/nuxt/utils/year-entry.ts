// What a person types into a year field, turned into a year — and the one-key shortcuts that move it. The parsing
// behind <ZYearField>, on the same rules as ZDateField's (date-entry.ts): a year is a plain number, "today" is handed
// in by the caller, and a two-digit year reads as ZDateField reads one (entryYear).
//
// Framework-free: Nuxt auto-imports it in a product, and `@zooui/nuxt/year-entry` imports it anywhere else.
import type { Temporal } from 'temporal-polyfill/implementation'
import { entryYear } from './date-entry.ts'

type PlainDate = Temporal.PlainDate

/** The years a field can show and read back: four digits, from 1000 (a typed "0026" is far likelier a slip). */
export const FIRST_ENTRY_YEAR = 1000
export const LAST_ENTRY_YEAR = 9999

/**
 * Parse what was typed into a year field: `2026`, or `26` and `6` (within the 100 years ending 20 years from now, as
 * ZDateField reads a two-digit year: in 2026, `46` is 2046 and `47` is 1947). Digits only; anything else, blank text,
 * three digits, a year before 1000 and a year of all zeros are null.
 */
export function parseYearEntry(text: string, today: PlainDate): number | null {
  return entryYear(text.trim(), today)
}

/** The year as the field writes it, four digits. Empty for no year. */
export function formatYearEntry(year: number | null | undefined): string {
  return year == null ? '' : String(year).padStart(4, '0')
}

/**
 * The year a field holds once its text is committed: `current` while the text is still what formatYearEntry drew for
 * it, else what parseYearEntry reads (null for blank or not a year).
 */
export function commitYearEntry(text: string, current: number | null, today: PlainDate): number | null {
  const typed = text.trim()
  if (typed === formatYearEntry(current)) return current
  return typed ? parseYearEntry(typed, today) : null
}

/** The years a field takes: the first and the last. */
export interface YearLimits {
  minValue?: number | null
  maxValue?: number | null
}

const STEP: Record<string, 1 | -1 | 0> = { 't': 0, 'r': 1, '+': 1, '=': 1, 'y': -1, '-': -1, '_': -1 }

/** Whether `key` is one of applyYearShortcut's keys, so a field can take the key even when it has nowhere to go. */
export function isYearShortcut(key: string): boolean {
  return Object.hasOwn(STEP, key.toLowerCase())
}

/**
 * The year a one-key shortcut moves to, or null when `key` isn't a shortcut. `current` is the field's year, or null
 * when it is empty — then the shortcut works from this year.
 *
 * - `t` this year
 * - `y`, `-` or `_` the year before
 * - `r`, `+` or `=` the year after
 *
 * It stops at FIRST_ENTRY_YEAR and LAST_ENTRY_YEAR, and at the limits' `minValue` and `maxValue` (`t` included: this
 * year, or the nearest limit to it). Null when the limits leave no year at all.
 */
export function applyYearShortcut(key: string, current: number | null, today: PlainDate, limits?: YearLimits): number | null {
  const k = key.toLowerCase()
  if (!Object.hasOwn(STEP, k)) return null
  const lo = Math.max(limits?.minValue ?? FIRST_ENTRY_YEAR, FIRST_ENTRY_YEAR)
  const hi = Math.min(limits?.maxValue ?? LAST_ENTRY_YEAR, LAST_ENTRY_YEAR)
  if (lo > hi) return null
  const target = k === 't' ? today.year : (current ?? today.year) + STEP[k]!
  return Math.min(Math.max(target, lo), hi)
}

/** Why the limits refuse a year. */
export type YearLimitReason = 'before-min' | 'after-max'

/** A year the limits refuse: why, the year, and the limit it crossed. */
export interface YearLimitProblem {
  readonly reason: YearLimitReason
  readonly date: number
  readonly limit: number
}

/** Why the limits refuse `year`, or null when they take it. */
export function checkYearLimits(year: number, limits?: YearLimits): YearLimitProblem | null {
  const min = limits?.minValue
  if (min != null && year < min) return { reason: 'before-min', date: year, limit: min }
  const max = limits?.maxValue
  if (max != null && year > max) return { reason: 'after-max', date: year, limit: max }
  return null
}

/** An English sentence for a refused year, as ZDateField words one: "Choose a year on or after 2020.", "Choose a year
 *  on or before 2030." A product in another language builds its own from the problem's `reason` and `limit`. */
export function yearLimitMessage(problem: YearLimitProblem): string {
  return `Choose a year on or ${problem.reason === 'before-min' ? 'after' : 'before'} ${formatYearEntry(problem.limit)}.`
}
