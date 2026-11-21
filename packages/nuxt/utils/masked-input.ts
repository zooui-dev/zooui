// What a masked field shows and how typing changes it, apart from <ZMaskedInput> so the rules read (and are tested,
// scripts/masked-input.test.mjs) in one place.
//
// A MASK is a pattern of tokens and literals: `#` a digit, `A` a letter, `*` a letter or digit, anything else a
// literal written for the person ("(###) ###-####"); a backslash makes a token character literal ("\#"). A field may
// have several masks, and which one formats the text is chosen afresh on every change:
//
// - by the separator typed: a literal typed where the mask in use has none, but another mask has it right there,
//   chooses that mask ("12-" in a US tax-ID field chooses the EIN's ##-####### over the SSN's ###-##-####). The choice
//   holds until the field is empty, or its whole text is replaced;
// - otherwise, the first mask that holds every character typed, or, if none does, the first that holds the most.
//
// A mask's literals are written once a character follows them, so "123" doesn't end in a dash, except in a mask a
// separator chose: there they are written as soon as the characters before them are in ("12-").
//
// Every change is rebuilt by `reformat`, with the caret kept on the same character as literals come and go, the way
// ZNumberInput keeps it on its digit (components/number-format.ts): the caret is counted in characters typed, not
// in text, and put back after the same count. `editMasked` is one keystroke or paste on top of that: Backspace or
// Delete over a literal takes the character beyond it (but Backspace at the end over the separator that chose the
// mask takes the separator, and the choice), a key that adds nothing is refused.
//
// Framework-free: Nuxt auto-imports it in a product, and `@zooui/nuxt/masked-input` imports it anywhere else (a
// server route validating the same value).

/** What one mask character accepts, and how it is written (`transform`: say, to upper case). */
export interface MaskToken {
  readonly pattern: RegExp
  readonly transform?: (c: string) => string
}

/** The tokens every mask knows: `#` a digit, `A` a letter, `*` either. A field's `tokens` add to these, and one for
 *  the same character replaces it. */
export const MASK_TOKENS: Readonly<Record<string, MaskToken>> = {
  '#': { pattern: /\d/ },
  'A': { pattern: /[A-Za-z]/ },
  '*': { pattern: /[A-Za-z\d]/ },
}

type Slot = { readonly token: MaskToken } | { readonly literal: string }

/** A pattern, read into its slots. Make one with `parseMask`; every function here also takes the pattern itself. */
export interface Mask {
  readonly pattern: string
  readonly slots: readonly Slot[]
  /** How many characters it holds: its tokens. */
  readonly capacity: number
}

/** One pattern or a list of them, as a field's `mask` prop takes them. */
export type MaskSource = string | Mask | readonly (string | Mask)[]

export function parseMask(pattern: string, tokens: Readonly<Record<string, MaskToken>> = MASK_TOKENS): Mask {
  const slots: Slot[] = []
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]!
    if (c === '\\' && i + 1 < pattern.length) slots.push({ literal: pattern[++i]! })
    else if (tokens[c]) slots.push({ token: tokens[c] })
    else slots.push({ literal: c })
  }
  return { pattern, slots, capacity: slots.filter((s) => 'token' in s).length }
}

/** A field's masks, read. */
export function masksOf(source: MaskSource, tokens?: Readonly<Record<string, MaskToken>>): Mask[] {
  const list = typeof source === 'string' || !Array.isArray(source) ? [source as string | Mask] : source as readonly (string | Mask)[]
  return list.map((m) => (typeof m === 'string' ? parseMask(m, tokens) : m))
}

const tokensOf = (mask: Mask) => mask.slots.flatMap((s) => ('token' in s ? [s.token] : []))

/** The literals a mask writes after `n` characters, before the next one: `(###) ###` after 3 is ") ". */
export function literalsAfter(mask: Mask, n: number): string {
  let passed = 0, out = ''
  for (const s of mask.slots) {
    if ('token' in s) {
      if (passed === n) return out
      passed++
    } else if (passed === n) out += s.literal
  }
  return out
}

/** The field's text after a change, with the caret, and what it holds. */
export interface Masked {
  readonly text: string
  readonly caret: number
  /** The characters typed, without the literals: "123456789" for "123-45-6789". */
  readonly raw: string
  /** Which of the masks formats it. */
  readonly mask: number
  /** The mask a separator chose, held until the field is empty; `null` when the first fit chooses. */
  readonly chosen: number | null
  /** Every character the mask holds is in. */
  readonly complete: boolean
  /** Characters typed that didn't fit (past the end, or of the wrong kind for their place). */
  readonly overflow: number
}

/** What the field's masks take: a character some token accepts. Anything else is a separator, kept or not. */
const accepts = (masks: readonly Mask[], c: string) => masks.some((m) => tokensOf(m).some((t) => t.pattern.test(c)))

/** The characters a mask takes from the ones typed, in order, each in the next slot that accepts it. */
function fill(mask: Mask, typed: readonly string[]): { taken: string[], from: number[] } {
  const tokens = tokensOf(mask)
  const taken: string[] = [], from: number[] = []
  typed.forEach((c, k) => {
    const t = tokens[taken.length]
    if (!t || !t.pattern.test(c)) return
    taken.push(t.transform ? t.transform(c) : c)
    from.push(k)
  })
  return { taken, from }
}

/** The first mask that holds every character, else the first that holds the most. */
function firstFit(masks: readonly Mask[], typed: readonly string[]): number {
  let best = 0, most = -1
  for (let m = 0; m < masks.length; m++) {
    const n = fill(masks[m]!, typed).taken.length
    if (n === typed.length) return m
    if (n > most) [best, most] = [m, n]
  }
  return best
}

/**
 * The text as the field shows it, formatted by the mask that fits (see the top of this file), with the caret on the
 * same character it was on. `chosen` is the mask a separator chose on an earlier change, if any. `typed` is the part
 * of the input just typed or pasted: only a separator there may choose a mask, so one left behind by a deletion
 * ("12-45" after Backspace in "123-|45") never does. Without it, the whole input counts, as for a value read in.
 */
export function reformat(input: string, caret: number, source: MaskSource, chosen: number | null = null, typed?: readonly [number, number]): Masked {
  const masks = masksOf(source)
  const chars: string[] = []
  const separators: { c: string, n: number, k: number }[] = []
  // the caret, as a count of the characters typed before it, and whether a separator was right before it
  let at = 0, afterSeparator = false
  for (let k = 0; k <= input.length; k++) {
    if (k === caret) [at, afterSeparator] = [chars.length, k > 0 && !accepts(masks, input[k - 1]!)]
    if (k === input.length) break
    const c = input[k]!
    if (accepts(masks, c)) chars.push(c)
    else separators.push({ c, n: chars.length, k })
  }

  // a separator where the fitting mask has none, and another mask has it right there, chooses that mask
  let picked = chosen !== null && chosen < masks.length ? chosen : null
  if (picked === null) {
    const fit = masks[firstFit(masks, chars)]!
    for (const { c, n, k } of separators) {
      if (typed && (k < typed[0] || k >= typed[1])) continue
      if (literalsAfter(fit, n).includes(c)) continue
      const m = masks.findIndex((mask) => literalsAfter(mask, n).includes(c))
      if (m >= 0) {
        picked = m
        break
      }
    }
  }
  const index = picked ?? firstFit(masks, chars)
  const mask = masks[index]!
  const { taken, from } = fill(mask, chars)
  const eager = picked !== null

  // written slot by slot: literals once a character follows them (or, eager, once the ones before them are in)
  let text = '', i = 0, pending = ''
  const ends: number[] = [] // the text's length after each character
  const literal: boolean[] = []
  const write = (s: string, isLiteral: boolean) => {
    text += s
    for (let j = 0; j < s.length; j++) literal.push(isLiteral)
  }
  for (const s of mask.slots) {
    if ('literal' in s) {
      pending += s.literal
      continue
    }
    if (i >= taken.length) break
    write(pending, true)
    pending = ''
    write(taken[i]!, false)
    ends.push(text.length)
    i++
  }
  if (pending && (eager || i === mask.capacity)) write(pending, true)

  const before = from.filter((k) => k < at).length
  let pos = before === 0 ? 0 : ends[before - 1]!
  // typed just after a separator, the caret stays after the literals there ("12-|", not "12|-"); after the last
  // character, it goes past any literals written after it ("(12)|")
  if (afterSeparator || (before > 0 && before === taken.length)) while (pos < text.length && literal[pos]) pos++

  return {
    text,
    caret: pos,
    raw: taken.join(''),
    mask: index,
    chosen: text === '' ? null : picked,
    complete: taken.length === mask.capacity,
    overflow: chars.length - taken.length,
  }
}

/** One change to the field: text typed or pasted over the selection, or a Backspace or Delete. */
export type MaskEdit = { insert: string } | { delete: 'backward' | 'forward' }
export interface MaskSelection { text: string, start: number, end: number }

const splice = (text: string, from: number, to: number, put = '') => text.slice(0, from) + put + text.slice(to)

/**
 * Where a deletion lands: the selection, or one character beside the caret, where a literal means the character
 * beyond it (Backspace over "123-|45" deletes the 3, over "(555) |123" the last 5). With nothing beyond it, the
 * literal itself. `null`: nothing to delete there.
 */
export function maskDeletion(sel: MaskSelection, direction: 'backward' | 'forward', source: MaskSource): [number, number] | null {
  const masks = masksOf(source)
  const { text, start, end } = sel
  if (start !== end) return [start, end]
  if (direction === 'backward') {
    if (start === 0) return null
    for (let k = start - 1; k >= 0; k--) if (accepts(masks, text[k]!)) return [k, k + 1]
    return [start - 1, start]
  }
  if (start >= text.length) return null
  for (let k = start; k < text.length; k++) if (accepts(masks, text[k]!)) return [k, k + 1]
  return [start, start + 1]
}

/**
 * The field after one edit, reformatted; `null` when the edit is refused and nothing changes, the selection included
 * (a letter typed over a digit-only field's text leaves it there, selected). `chosen` is the mask a separator chose;
 * an edit that replaces the whole text starts the choice afresh.
 */
export function editMasked(sel: MaskSelection, e: MaskEdit, source: MaskSource, chosen: number | null = null): Masked | null {
  const masks = masksOf(source)
  const { text, start, end } = sel
  const keep = start === 0 && end === text.length && text !== '' ? null : chosen
  if ('delete' in e) {
    // Backspace over the separator that chose the mask, at the end ("12-|"), takes it and the choice back: "12".
    // Unless the text would read the same without it ("(555) |", where the "(" chooses again): then as usual
    if (e.delete === 'backward' && keep !== null && start === end && start === text.length && start > 0 && !accepts(masks, text[start - 1]!)) {
      let k = start
      while (k > 0 && !accepts(masks, text[k - 1]!)) k--
      const r = reformat(text.slice(0, k), k, masks, null)
      if (r.text !== text) return r
    }
    const range = maskDeletion(sel, e.delete, masks)
    if (!range) return null
    // Backspace leaves the caret where the character was; Delete leaves it where it is
    return reformat(splice(text, range[0], range[1]), e.delete === 'backward' ? range[0] : start, masks, keep, [0, 0])
  }
  const put = e.insert
  // nothing in it the field takes, or writes: refused before it clears a selection
  const literals = new Set(masks.flatMap((m) => m.slots.flatMap((s) => ('literal' in s ? [s.literal] : []))))
  if (![...put].some((c) => accepts(masks, c) || literals.has(c))) return null
  const after = reformat(splice(text, start, end, put), start + put.length, masks, keep, [start, start + put.length])
  if (start === end) {
    // at a caret, an insertion that changes nothing (a separator the mask writes anyway), or pushes a character
    // out of a full field, is refused
    const base = reformat(text, start, masks, chosen, [0, 0])
    if (after.text === base.text && after.caret === base.caret) return null
    if (base.complete && after.overflow > base.overflow) return null
  }
  return after
}

/**
 * The text a field formatted on commit (blur) shows: formatted by its mask when it holds a whole value and nothing
 * else ("5551234567" or "555.123.4567" → "(555) 123-4567"), and as typed otherwise ("+44 20 7946 0958" stays).
 */
export function commitMasked(text: string, source: MaskSource): string {
  const r = reformat(text, text.length, source)
  return r.complete && r.overflow === 0 ? r.text : text
}

/** Whether a text is a whole value written in one of the masks: "(555) 123-4567" is, "5551234567" and "(555) 12" are
 *  not. For a form's own rules, on the server as in the field. */
export function isMaskComplete(text: string | null | undefined, source: MaskSource): boolean {
  if (!text) return false
  const r = reformat(text, text.length, source)
  return r.complete && r.overflow === 0 && r.text === text
}

/** The characters a text holds that its masks take, without the literals, as the field's `raw` model has them:
 *  "5551234567" for "(555) 123-4567", and every digit of a number typed in another form ("+44 20 7946 0958"). */
export function unmaskedValue(text: string | null | undefined, source: MaskSource): string {
  const masks = masksOf(source)
  return [...text ?? ''].filter((c) => accepts(masks, c)).join('')
}

/** What a preset sets: its masks, when it formats, and the input's attributes. Every one can be overridden. */
export interface MaskPreset {
  readonly mask: readonly string[]
  readonly formatOn: 'input' | 'blur'
  readonly attrs: Readonly<Record<string, string>>
}

/**
 * `phone`: a US number, (555) 123-4567, formatted on blur when the field holds ten digits and nothing else, and left
 * as typed otherwise, so a number from elsewhere ("+44 20 7946 0958") goes in as it is. `tax-id`: a US SSN
 * (123-45-6789) or EIN (12-3456789), formatted as typed; a dash after two digits chooses the EIN.
 */
export const MASK_PRESETS: Readonly<Record<'phone' | 'tax-id', MaskPreset>> = {
  'phone': { mask: ['(###) ###-####'], formatOn: 'blur', attrs: { type: 'tel', inputmode: 'tel', autocomplete: 'tel' } },
  'tax-id': { mask: ['###-##-####', '##-#######'], formatOn: 'input', attrs: { inputmode: 'numeric', placeholder: 'SSN or EIN' } },
}
