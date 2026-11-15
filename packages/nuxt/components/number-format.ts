/**
 * ZNumberInput's text: what the field shows and how typing changes it, apart from the component so it reads (and is
 * tested, scripts/number-format.test.mjs) in one place. The live editing is the behavior of PrimeVue's
 * InputNumber, at the size of its rules rather than its 1,100 lines:
 *
 * - every change is rebuilt by `reformat`: the locale's grouping, one decimal mark, a minus only at the front, no
 *   leading zeros, at most the maximum decimal places (typing into a full fraction overwrites the next digit), and
 *   the caret kept on the same digit as separators come and go;
 * - `edit` is one keystroke or paste on top of that: Backspace or Delete over a group separator takes the digit
 *   beyond it, a fixed decimal mark is stepped over rather than deleted, a second decimal mark is ignored.
 *
 * Figures are plain strings ("-1234.5") between here and decimal.js, and every value is a Decimal of this file's own
 * precision, so nothing passes through a float. `toModel` hands the caller back its own kind: a string, a number, or
 * a Decimal built with the caller's own class.
 */
import Decimal from 'decimal.js'

/** decimal.js with room for a Postgres `numeric` (the default 20 significant digits would round a sum of two), and
 *  half-away-from-zero rounding, as Intl rounds for display. */
export const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP, toExpNeg: -40, toExpPos: 40 })
export type Dec = InstanceType<typeof D>

/** The locale's marks: its group and decimal characters and how it groups (en-IN: 12,34,567). Latin digits only. */
export interface Symbols {
  group: string
  decimal: string
  /** Digits in the last group, and in each group before it. */
  primary: number
  secondary: number
  /** Group only from primary + minGroup digits (es: 1234 but 12.345). */
  minGroup: number
}

const cache = new Map<string, Symbols>()

export function symbols(locale: string): Symbols {
  let s = cache.get(locale)
  if (s) return s
  const nf = new Intl.NumberFormat(locale, { numberingSystem: 'latn' })
  const parts = nf.formatToParts(123456789.5)
  const ints = parts.filter((p) => p.type === 'integer').map((p) => p.value.length)
  s = {
    group: parts.find((p) => p.type === 'group')?.value ?? ',',
    decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.',
    primary: ints.at(-1) ?? 3,
    secondary: ints.length > 2 ? ints.at(-2)! : ints.at(-1) ?? 3,
    minGroup: nf.formatToParts(1234).some((p) => p.type === 'group') ? 1 : 2,
  }
  cache.set(locale, s)
  return s
}

/** Decimal places: at least `min` once committed, at most `max` (none: as many as typed). */
export interface Places { min: number, max?: number }

/** How a field reads and writes its text. */
export interface Format {
  symbols: Symbols
  places: Places
  /** Whether a minus may be typed (min unset or below zero). */
  negative: boolean
}

const isDigit = (c: string) => c >= '0' && c <= '9'
export const isMinus = (c: string) => c === '-' || c === '−'
/** The locale's group character; any space where it groups with one (fr's narrow no-break space), an apostrophe
 *  where it uses ’ (de-CH). */
export function isGroup(c: string, s: Symbols): boolean {
  if (c === s.group) return true
  if (/\s/.test(s.group)) return /\s/.test(c)
  return s.group === '’' && c === '\''
}
/** The locale's decimal mark, or a full stop where the full stop isn't its group (a numeric keypad's key). */
export const isDecimal = (c: string, s: Symbols) => c === s.decimal || (c === '.' && s.group !== '.')

/** The integer digits grouped for the locale, with the text index after `at` digits (the caret's). */
export function grouped(int: string, s: Symbols, at = -1): { text: string, caret: number } {
  let text = '', caret = at === 0 ? 0 : -1
  const groupIt = int.length >= s.primary + s.minGroup
  for (let i = 0; i < int.length; i++) {
    const left = int.length - i
    if (groupIt && i > 0 && left >= s.primary && (left === s.primary || (left - s.primary) % s.secondary === 0)) text += s.group
    text += int[i]
    if (i + 1 === at) caret = text.length
  }
  return { text, caret }
}

/** A typed or shown text and where its caret is. */
export interface Field { text: string, caret: number }

/**
 * The text as the field shows it while typing, with the caret on the same digit. Anything that isn't a digit, the
 * decimal mark or a leading minus is dropped (a pasted "$1,234.50" arrives as 1,234.50). Not padded: the minimum
 * places are written on commit, so "1.0" survives on the way to "1.05".
 */
export function reformat(raw: string, caret: number, f: Format): Field {
  const s = f.symbols
  let neg = false, int = '', frac = '', dec = false
  let part: 'int' | 'frac' = 'int', at = 0
  for (let k = 0; k <= raw.length; k++) {
    if (k === caret) [part, at] = dec ? ['frac', frac.length] : ['int', int.length]
    if (k === raw.length) break
    const c = raw[k]!
    if (isDigit(c)) {
      if (dec) frac += c
      else int += c
    } else if (isDecimal(c, s) && !dec) dec = true
    else if (isMinus(c) && f.negative && !int && !dec) neg = true
  }
  // no leading zeros, but a zero before the decimal mark
  const significant = int.replace(/^0+/, '')
  const zeros = int.length - significant.length - (int && !significant ? 1 : 0)
  if (zeros > 0) {
    int = int.slice(zeros)
    // all zeros, one is left: a caret past any of them goes after it
    if (part === 'int') at = significant ? Math.max(0, at - zeros) : Math.min(at, 1)
  }
  if (dec && !int) {
    int = '0'
    if (part === 'int') at = 1
  }
  // at most `max` places: overwrite after the caret, then drop from the end
  const max = f.places.max
  if (max !== undefined && frac.length > max) {
    let excess = frac.length - max
    if (part === 'frac') {
      const cut = Math.min(excess, frac.length - at)
      frac = frac.slice(0, at) + frac.slice(at + cut)
      excess -= cut
    }
    frac = frac.slice(0, frac.length - excess)
    if (part === 'frac') at = Math.min(at, frac.length)
  }
  const sign = neg ? '-' : ''
  const g = grouped(int, s, part === 'int' ? at : -1)
  if (!dec || max === 0) return { text: sign + g.text, caret: sign.length + (part === 'int' ? g.caret : g.text.length) }
  const text = sign + g.text + s.decimal + frac
  return { text, caret: sign.length + (part === 'int' ? g.caret : g.text.length + 1 + at) }
}

/** One change to the field: text typed or pasted over the selection, or a Backspace or Delete. */
export type Edit = { insert: string } | { delete: 'backward' | 'forward' }
export interface Selection { text: string, start: number, end: number }

/**
 * Where a deletion lands: the selection, or one character beside the caret, where a group separator means the digit
 * beyond it (Backspace over "1,|234" deletes the 1). `null`: nothing to delete there.
 */
export function deletion(sel: Selection, direction: 'backward' | 'forward', s: Symbols): [number, number] | null {
  const { text, start, end } = sel
  if (start !== end) return [start, end]
  if (direction === 'backward') {
    if (start === 0) return null
    return isGroup(text[start - 1]!, s) ? (start > 1 ? [start - 2, start - 1] : null) : [start - 1, start]
  }
  if (start >= text.length) return null
  return isGroup(text[start]!, s) ? (start + 1 < text.length ? [start + 1, start + 2] : null) : [start, start + 1]
}

export const splice = (text: string, from: number, to: number, put = '') => text.slice(0, from) + put + text.slice(to)

/** The field after one edit, reformatted; `null` when the edit is refused and nothing changes, the selection
 *  included (a letter typed over "1,234.50" leaves it there, selected). */
export function edit(sel: Selection, e: Edit, f: Format): Field | null {
  const s = f.symbols
  const { text, start, end } = sel
  if ('delete' in e) {
    const range = deletion(sel, e.delete, s)
    if (!range) return { text, caret: start }
    // a fixed decimal mark with places after it is stepped over, not deleted (it would run the fraction into the
    // whole part)
    if (range[1] - range[0] === 1 && isDecimal(text[range[0]]!, s) && f.places.min > 0 && /\d/.test(text.slice(range[1]))) {
      return { text, caret: e.delete === 'backward' ? range[0] : range[1] }
    }
    return reformat(splice(text, range[0], range[1]), range[0], f)
  }
  let put = e.insert
  let [from, to] = [start, end]
  const outside = [...text].some((c, i) => (i < start || i >= end) && isDecimal(c, s))
  if (outside && [...put].some((c) => isDecimal(c, s))) {
    // a decimal mark typed just before the one there steps over it; any other second mark is ignored
    if (put.length === 1 && start === end && isDecimal(text[start] ?? '', s)) return { text, caret: start + 1 }
    put = [...put].filter((c) => !isDecimal(c, s)).join('')
  }
  // typed before the minus, a digit goes after it: the sign stays
  if (to === 0 && isMinus(text[0] ?? '') && ![...put].some(isMinus)) from = to = 1
  // nothing in it may go here (a letter, a decimal mark with no places, a minus past the start or where none may go):
  // refused before it clears a selection. Anything that may, replaces the selection, even if it reads the same ("0"
  // over "12" in "120" is 0)
  const allowed = (c: string) => isDigit(c) || (isDecimal(c, s) && f.places.max !== 0) || (isMinus(c) && f.negative && from === 0)
  if (![...put].some(allowed)) return null
  const after = reformat(splice(text, from, to, put), from + put.length, f)
  // at a caret, an insertion that changes neither the text nor the caret (a digit past a full fraction) is refused
  // too; a digit typed over the same digit in a full fraction leaves the text as it was but moves the caret on
  if (from === to) {
    const base = reformat(text, from, f)
    if (after.text === base.text && after.caret === base.caret) return null
  }
  return after
}

/** A field's text, written in another locale's marks: group separators dropped, the decimal mark swapped (and the
 *  caret kept on its character), ready for `reformat` in the new locale. */
export function relocalize(field: Field, from: Symbols, to: Symbols): Field {
  let text = '', caret = 0
  ;[...field.text].forEach((c, i) => {
    if (i === field.caret) caret = text.length
    if (isGroup(c, from)) return
    text += isDecimal(c, from) ? to.decimal : c
  })
  return { text, caret: field.caret >= field.text.length ? text.length : caret }
}

/** The figure in a field's text ("-1,234.5" → "-1234.5"); `null` when there is none yet ("", "-"). */
export function figureOf(text: string, s: Symbols): string | null {
  let out = ''
  for (const c of text) {
    if (isDigit(c)) out += c
    else if (isDecimal(c, s) && !out.includes('.')) out += '.'
    else if (isMinus(c) && !out) out = '-'
  }
  out = out.replace(/\.$/, '')
  if (out.startsWith('.')) out = `0${out}`
  if (out.startsWith('-.')) out = `-0${out.slice(1)}`
  return /\d/.test(out) ? out : null
}

/** A plain figure as Decimal, or `null` for none. */
export const toDec = (figure: string | null) => (figure === null ? null : new D(figure))

/** A value as the field shows it at rest: rounded to the maximum places, padded to the minimum, grouped. */
export function display(value: Dec | null, s: Symbols, places: Places): string {
  if (value === null) return ''
  const rounded = places.max === undefined ? value : value.toDecimalPlaces(places.max)
  const fixed = rounded.toFixed(Math.max(places.min, rounded.decimalPlaces()))
  const [whole, frac] = fixed.replace('-', '').split('.')
  const sign = rounded.isNeg() && !rounded.isZero() ? '-' : ''
  return sign + grouped(whole!, s).text + (frac ? s.decimal + frac : '')
}

const bounded = (b: number | string | undefined): b is number | string => b !== undefined && b !== ''

/** A committed value as the field shows it: `committed` has rounded it already, or kept a bound the places can't
 *  write, so it is not rounded again (min 0.004, max 0.006, two places shows 0.006, as the model holds). */
export const shownCommitted = (value: Dec | null, s: Symbols, places: Places) => display(value, s, { min: places.min })

/** Kept within min/max. */
export function clamp(value: Dec, min?: number | string, max?: number | string): Dec {
  if (bounded(min) && value.lt(min)) return new D(min)
  if (bounded(max) && value.gt(max)) return new D(max)
  return value
}

/** Out of min/max: -1 below, 1 above, 0 within. */
export function outside(value: Dec | null, min?: number | string, max?: number | string): -1 | 0 | 1 {
  if (value === null) return 0
  if (bounded(min) && value.lt(min)) return -1
  if (bounded(max) && value.gt(max)) return 1
  return 0
}

/**
 * What a commit (blur, Enter, Tab, or a nudge) makes of a value: rounded to the maximum places, half away from zero,
 * then kept within min/max at those places. A rounded value past a bound becomes the nearest value inside it that the
 * places can write (max 1.235 at two places: 1.23; min 0.004: 0.01), so a commit never leaves the range. If no such
 * value exists (min 0.004, max 0.006, two places), the bound itself is kept, unrounded.
 */
export function committed(value: Dec | null, o: { min?: number | string, max?: number | string, places: Places }): Dec | null {
  if (value === null) return null
  const dp = o.places.max
  if (dp === undefined) return clamp(value, o.min, o.max)
  const rounded = value.toDecimalPlaces(dp)
  const off = outside(rounded, o.min, o.max)
  if (off === 0) return rounded
  const bound = new D(off > 0 ? o.max! : o.min!)
  const inside = bound.toDecimalPlaces(dp, off > 0 ? D.ROUND_FLOOR : D.ROUND_CEIL)
  return outside(inside, o.min, o.max) === 0 ? inside : bound
}

/** The committed figure, padded to the minimum places: what a string model holds ("1234.50"). */
export function fixedFigure(value: Dec, places: Places): string {
  return value.toFixed(Math.max(places.min, value.decimalPlaces()))
}

/** The kind of value the caller holds, and so hands back. */
export type ModelKind = 'string' | 'number' | 'decimal'
/** Any decimal.js Decimal, from this copy or another. */
export type DecimalLike = { toString(): string, constructor: unknown }
export type ModelValue = string | number | DecimalLike | null | undefined

/** The kind of a model value; `undefined` for null or undefined, which hold no kind. A Decimal is recognized by
 *  decimal.js's own check, which also knows another copy's instances. */
export function kindOf(v: ModelValue): ModelKind | undefined {
  if (v === null || v === undefined) return undefined
  if (Decimal.isDecimal(v)) return 'decimal'
  return typeof v === 'number' ? 'number' : 'string'
}

/** A model value as this file's Decimal: `null` for empty, or for a string that isn't a plain figure. */
export function readModel(v: ModelValue): Dec | null {
  const kind = kindOf(v)
  if (!kind) return null
  if (kind === 'number') return Number.isFinite(v) ? new D(v as number) : null
  const text = String(v).trim()
  if (kind === 'string' && !/^-?(\d+\.?\d*|\.\d+)$/.test(text)) return null
  try {
    const d = new D(text)
    return d.isFinite() ? d : null
  } catch {
    return null
  }
}

/**
 * The value a model holds, for its range check: `readModel`, and for a string that isn't a plain figure ("1,500") the
 * figure the field would read from it as text, so a grouped string model is judged by its value, not skipped.
 */
export function readHeld(v: ModelValue, s: Symbols): Dec | null {
  return readModel(v) ?? (kindOf(v) === 'string' ? toDec(figureOf(String(v), s)) : null)
}

/** A Decimal class: the caller's own, so its `instanceof` holds whichever copy of decimal.js it uses. */
export type DecimalClass = new (value: string) => DecimalLike

/**
 * The class a Decimal was built with, to build its successors with. decimal.js writes the constructor that built an
 * instance onto it, which is the right class for the base and for a `Decimal.clone()` (whose precision it carries):
 * they share one prototype. A subclass (`class Money extends Decimal`) has a prototype of its own, while decimal.js
 * still writes the class it extends onto the instance; there, the prototype's constructor is the caller's class.
 */
export function decimalClass(v: DecimalLike): DecimalClass {
  const own = v.constructor as { prototype?: unknown }
  const proto = Object.getPrototypeOf(v) as { constructor?: unknown } | null
  if (typeof own === 'function' && own.prototype === proto) return own as DecimalClass
  return (typeof proto?.constructor === 'function' ? proto.constructor : own) as DecimalClass
}

/**
 * A figure handed back as the caller's kind: a string as is, a number, or a Decimal built from the figure's text by
 * the caller's class (`cls`; this file's when the model started empty). Empty is `''` for a string model and `null`
 * otherwise.
 */
export function toModel(figure: string | null, kind: ModelKind, cls: DecimalClass = Decimal): string | number | DecimalLike | null {
  if (figure === null) return kind === 'string' ? '' : null
  if (kind === 'number') return Number(figure)
  return kind === 'decimal' ? new cls(figure) : figure
}

/** Whether the model already holds this figure, so typing doesn't hand back what is there (a string compares as
 *  text, so "1.0" is news to a model holding "1"). */
export function holds(v: ModelValue, figure: string | null): boolean {
  if (figure === null) return v === null || v === undefined || v === ''
  if (kindOf(v) === 'string') return v === figure
  const d = readModel(v)
  return d !== null && d.eq(figure)
}
