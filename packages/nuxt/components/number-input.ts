/**
 * ZNumberInput's arithmetic and labels, apart from the component so the rules read in one place. The product's choices are options: the
 * default step per unit and the currency and locale come from the product's app.config (`zooui.numberInput`) or the
 * component's props, falling back to the neutral defaults below.
 *
 * The arithmetic is decimal.js, so a nudge never shows binary float noise (0.1 + 0.2 stays 0.3). The text itself (live
 * formatting, the caret, commits, the caller's kind of value) is number-format.ts; calc is number-calc.ts.
 */
import { clamp, D, type Dec, type Places, type Symbols } from './number-format.ts'

export type NumberUnit = 'money' | 'percent' | 'count' | 'hours'

/** What a product sets once, in its app.config under `zooui.numberInput`; a prop on the component wins over it. */
export interface NumberInputConfig {
  /** The step for each unit, when the component is given none. */
  steps?: Partial<Record<NumberUnit, number>>
  /** ISO 4217 code for `unit="money"`: its symbol is the leading mark. */
  currency?: string
  /** BCP 47 locale for the currency symbol, the grouping and decimal marks, and the chevrons' labels. Fixed by
   *  default, so the server and the browser render the same text (a browser-default locale would mismatch on
   *  hydration). */
  locale?: string
  /** Decimal places for each unit: `min` written on commit, `max` rounded to (none: as typed). */
  fractionDigits?: Partial<Record<NumberUnit, Partial<Places>>>
}

/** Neutral defaults: a product's own (say, money by 5,000) go in its app.config. */
export const DEFAULTS = {
  steps: { money: 1, percent: 1, count: 1, hours: 0.5 } satisfies Record<NumberUnit, number>,
  /** Money in cents; every other unit as typed. */
  places: { money: { min: 2, max: 2 }, percent: { min: 0 }, count: { min: 0 }, hours: { min: 0 } } as Record<NumberUnit, Places>,
  currency: 'USD',
  locale: 'en-US',
}

/** The mark after the value. Kept the same width when empty (money, count), so values line up in a column. */
export const SUFFIX: Record<NumberUnit, string> = { money: '', percent: '%', count: '', hours: 'hrs' }

/** The currency's own short symbol ($, €, £, CHF), or the code itself if Intl doesn't know it. */
export function currencySymbol(locale: string, currency: string): string {
  try {
    const parts = new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).formatToParts(0)
    return parts.find((p) => p.type === 'currency')?.value ?? currency
  } catch {
    return currency
  }
}

/** The step as the chevrons name it: "Add $5,000", "Subtract 0.5 hours". */
export function stepLabel(unit: NumberUnit, step: number, locale: string, currency: string): string {
  const plain = new Intl.NumberFormat(locale, { maximumFractionDigits: 20 }).format(step)
  if (unit === 'money') {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol', minimumFractionDigits: 0, maximumFractionDigits: 20 }).format(step)
    } catch {
      return `${currency} ${plain}`
    }
  }
  if (unit === 'percent') return `${plain}%`
  return unit === 'hours' ? `${plain} hours` : plain
}

export const PLAIN_NUMBER = /^-?(\d+\.?\d*|\.\d+)$/

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * What someone typed, made into a plain number where it plainly is one: "$120,000" → "120000", "24 %" → "24",
 * "40." → "40". Group separators go only when they group thousands: in en-US "1,5" (a decimal comma) or "12 34" is
 * left as typed, so the field's own validation says it isn't a number rather than it saving quietly as 15 or 1234.
 * In a locale with a decimal comma (`symbols`, from the field's locale) "1,5" is 1.5 and "1.234,5" 1234.5. `symbol`
 * is the currency mark to strip from the front (`$`, say), after any `prefix`; `suffix` comes off the end.
 */
export function readFigure(
  raw: string | number | null | undefined,
  o: { symbol?: string, symbols?: Pick<Symbols, 'group' | 'decimal'>, prefix?: string, suffix?: string } = {},
): string {
  const s = String(raw ?? '').trim()
  if (s === '') return ''
  let bare = s
  for (const lead of [o.prefix, o.symbol ?? '$']) if (lead?.trim()) bare = bare.replace(new RegExp(`^${escapeRegExp(lead.trim())}\\s*`), '')
  if (o.suffix?.trim()) bare = bare.replace(new RegExp(`\\s*${escapeRegExp(o.suffix.trim())}$`), '')
  bare = bare.replace(/\s*%$/, '')
  const { group, decimal } = o.symbols ?? { group: ',', decimal: '.' }
  const g = /\s/.test(group) ? '\\s' : escapeRegExp(group)
  let plain = new RegExp(`^-?\\d{1,3}(${g}\\d{3})+(${escapeRegExp(decimal)}\\d*)?$`).test(bare) ? bare.replace(new RegExp(g, 'g'), '') : bare
  if (decimal !== '.') plain = plain.replace(decimal, '.')
  return PLAIN_NUMBER.test(plain) ? plain.replace(/\.$/, '') : s
}

/** A figure written for freeform text in the field's locale: its decimal mark, no grouping, so `readFigure` reads it
 *  back as the same value (de: "1,234", never "1.234", which de reads as 1234). */
export const writeFigure = (figure: string, symbols: Pick<Symbols, 'decimal'>) => figure.replace('.', symbols.decimal)

/**
 * The value after one nudge of `step` in `direction`, from whatever is there (38,500 → 43,500: never snapped to a
 * multiple of the step), clamped to min/max. Empty starts from zero.
 */
export function nudged(current: Dec | null, direction: 1 | -1, o: { step: number, min?: number | string, max?: number | string }): Dec {
  return clamp((current ?? new D(0)).plus(new D(o.step).times(direction)), o.min, o.max)
}

/** The decimal places for a unit: the props' (`minFractionDigits`, `maxFractionDigits`), then the app.config's, then
 *  the defaults. A minimum above an explicit maximum comes down to it; otherwise the maximum goes up to the minimum. */
export function resolvePlaces(own: { min?: number, max?: number }, fallback: Places): Places {
  const min = own.min ?? fallback.min
  const max = own.max ?? fallback.max
  if (max === undefined || min <= max) return { min, max }
  return own.max !== undefined ? { min: max, max } : { min, max: min }
}
