/**
 * ZNumberInput's `calc` mode: a currency field with a calculator in it, apart from the component (tests:
 * scripts/number-calc.test.mjs). `+ - * /` with the usual precedence, read by a small recursive-descent parser (never
 * `eval`) and worked in decimal.js, so 0.1 + 0.2 is 0.3. Each number in the expression is grouped as it is typed, for
 * the field's locale, with the caret kept on the same character.
 */
import { D, deletion, grouped, isDecimal, isGroup, isMinus, splice, type Dec, type Edit, type Field, type Places, type Selection, type Symbols } from './number-format.ts'

const OPERATOR = /([+\-*/−])/
const isOperator = (c: string) => c.length === 1 && OPERATOR.test(c)

/**
 * The value of an expression, or `null` when it is incomplete ("678+"), not one ("abc"), or divides by zero. Spaces
 * and the locale's group separators are ignored ("1,000+500" is 1500 in en-US, "1.000+500" in de); a minus straight
 * before a number makes it negative ("-100+200", "5*-2").
 */
export function evaluate(input: string, s: Symbols): Dec | null {
  let expr = ''
  for (const c of input) {
    if (/\s/.test(c) || isGroup(c, s)) continue
    expr += isDecimal(c, s) ? '.' : isMinus(c) ? '-' : c
  }
  let pos = 0

  // number → -? [digits and one decimal point]
  const number = (): Dec | null => {
    let text = ''
    if (expr[pos] === '-') text += expr[pos++]
    while (pos < expr.length && /[\d.]/.test(expr[pos]!)) text += expr[pos++]
    if (!/\d/.test(text)) return null
    try {
      return new D(text)
    } catch {
      return null
    }
  }
  // term → number ((* or /) number)*
  const term = (): Dec | null => {
    let result = number()
    while (result !== null && (expr[pos] === '*' || expr[pos] === '/')) {
      const op = expr[pos++]
      const right = number()
      if (right === null || (op === '/' && right.isZero())) return null
      result = op === '*' ? result.times(right) : result.div(right)
    }
    return result
  }
  // expression → term ((+ or -) term)*
  const expression = (): Dec | null => {
    let result = term()
    while (result !== null && (expr[pos] === '+' || expr[pos] === '-')) {
      const op = expr[pos++]
      const right = term()
      if (right === null) return null
      result = op === '+' ? result.plus(right) : result.minus(right)
    }
    return result
  }

  if (!expr) return null
  const result = expression()
  return pos === expr.length && result !== null && result.isFinite() ? result : null
}

/** Ten places, for a calc field with no maximum of its own: 1/3*3 is 1 rather than forty nines. */
export const CALC_PLACES = 10

/** The places a calc field's result is rounded to, once, on commit: the field's maximum, else ten. */
export const calcPlaces = (places: Places): Places => (places.max === undefined ? { min: places.min, max: CALC_PLACES } : places)

/** Whether there is an operator past the first character (a leading minus is a sign, not a sum). */
export const containsOperator = (text: string) => text.length > 1 && OPERATOR.test(text.slice(1))

/** One number of an expression grouped: "12345.6" → "12,345.6", spaces around it kept. Anything it can't read is
 *  left as typed. */
function segment(part: string, s: Symbols): string {
  const bare = [...part].filter((c) => !isGroup(c, s)).join('')
  const [, before, core, after] = /^(\s*)(.*?)(\s*)$/s.exec(bare)!
  if (!/\d/.test(core!)) return part
  const at = [...core!].findIndex((c) => isDecimal(c, s))
  const int = at < 0 ? core! : core!.slice(0, at)
  return before + (/^\d+$/.test(int) ? grouped(int, s).text : int) + (at < 0 ? '' : core!.slice(at)) + after
}

/** The same caret in a regrouped text: after as many characters other than group separators. */
function keepCaret(before: string, after: string, caret: number, s: Symbols): number {
  let count = 0
  for (let i = 0; i < Math.min(caret, before.length); i++) if (!isGroup(before[i]!, s)) count++
  let pos = 0
  for (let seen = 0; pos < after.length && seen < count; pos++) if (!isGroup(after[pos]!, s)) seen++
  return pos
}

/** An expression as the field shows it while typing: each number grouped, the caret on the same character. */
export function reformatExpression(raw: string, caret: number, s: Symbols): Field {
  const text = raw.split(OPERATOR).map((part, i) => (i % 2 ? part : segment(part, s))).join('')
  return { text, caret: keepCaret(raw, text, caret, s) }
}

/**
 * The expression after one edit. The rule: an operator typed over a selection is added at the end rather than
 * replacing it (so "1,200" selected on focus, then "+50", is 1,250), except a minus over the whole text, which starts
 * a negative number. `null`: the edit is refused and nothing changes, the selection included.
 */
export function editExpression(sel: Selection, e: Edit, s: Symbols): Field | null {
  const { text, start, end } = sel
  if ('delete' in e) {
    const range = deletion(sel, e.delete, s)
    return range ? reformatExpression(splice(text, range[0], range[1]), range[0], s) : { text, caret: start }
  }
  // what an expression can hold: a pasted "$1,200" arrives as 1,200, and a line break as a space
  const put = [...e.insert.replace(/\s/g, ' ')].filter((c) => /[\d ]/.test(c) || isOperator(c) || isDecimal(c, s) || isGroup(c, s)).join('')
  if (!put) return null
  if (start !== end && isOperator(put) && !(isMinus(put) && start === 0 && end === text.length)) {
    return reformatExpression(text + put, text.length + 1, s)
  }
  return reformatExpression(splice(text, start, end, put), start + put.length, s)
}
