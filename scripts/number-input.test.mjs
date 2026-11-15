// ZNumberInput's text and values (packages/nuxt/components/number-format.ts and number-input.ts): live formatting and
// the caret, locale-aware reading, commits (clamp and rounding), nudges, and the caller's kind of model handed back:
// a string, a number, or a decimal.js Decimal of the caller's own class.
// Node strips the TypeScript itself (Node 22.18+, 23.6+), so the layer's source is what runs.
// Run: node --test 'scripts/*.test.mjs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

import {
  committed, D, decimalClass, display, edit, figureOf, fixedFigure, holds, kindOf, outside, readHeld, readModel, reformat, relocalize, shownCommitted,
  symbols, toModel,
} from '../packages/nuxt/components/number-format.ts'
import { DEFAULTS, nudged, readFigure, resolvePlaces, stepLabel, writeFigure } from '../packages/nuxt/components/number-input.ts'

// The layer's own decimal.js (the ESM entry), and a second copy: the CommonJS entry is a separate module with its own
// class, as a product with two installs would have.
const { default: Decimal } = await import('../packages/nuxt/node_modules/decimal.js/decimal.mjs')
const OtherDecimal = createRequire(new URL('../packages/nuxt/package.json', import.meta.url))('decimal.js')

const en = symbols('en-US'), de = symbols('de')
const money = { symbols: en, places: { min: 2, max: 2 }, negative: true }
const plain = { symbols: en, places: { min: 0 }, negative: true }
/** A field written with | for the caret: "1,2|34". */
const at = (s) => ({ text: s.replace('|', ''), caret: s.indexOf('|') })
const show = ({ text, caret }) => `${text.slice(0, caret)}|${text.slice(caret)}`
const re = (s, f = plain) => { const { text, caret } = at(s); return show(reformat(text, caret, f)) }
/** A field with its caret (|) or its selection ([…]). */
const sel = (s) => s.includes('[')
  ? { text: s.replace(/[[\]]/g, ''), start: s.indexOf('['), end: s.indexOf(']') - 1 }
  : { text: s.replace('|', ''), start: s.indexOf('|'), end: s.indexOf('|') }
const ed = (s, change, f = plain) => { const next = edit(sel(s), change, f); return next ? show(next) : 'refused' }

describe('symbols: the locale\'s marks, from Intl', () => {
  it('reads the group and decimal characters and how the locale groups', () => {
    assert.deepEqual([en.group, en.decimal, en.primary, en.secondary], [',', '.', 3, 3])
    assert.deepEqual([de.group, de.decimal], ['.', ','])
    assert.deepEqual([symbols('en-IN').primary, symbols('en-IN').secondary], [3, 2])
    assert.equal(symbols('es').minGroup, 2)
  })
})

describe('reformat: live formatting, the caret on the same digit', () => {
  for (const [typed, shown, f] of [
    ['1234567|', '1,234,567|'],
    ['12|345', '12|,345'],
    ['1|234', '1|,234'],
    ['1,23|', '123|'], // a separator goes when its group does
    ['1234,5|', '1.234,5|', { ...plain, symbols: de }],
    ['1.5|', '15|', { ...plain, symbols: de }], // the full stop is de's group mark, not a decimal
    ['1234,5|', '1\u202F234,5|', { ...plain, symbols: symbols('fr') }], // fr groups with a narrow no-break space
    ['1234567|', '12,34,567|', { ...plain, symbols: symbols('en-IN') }],
    ['1234|', '1234|', { ...plain, symbols: symbols('es') }],
    ['12345|', '12.345|', { ...plain, symbols: symbols('es') }],
    ['1.2.3|', '1.23|'], // one decimal mark
    ['-5|', '-5|'],
    ['-5|', '5|', { ...plain, negative: false }],
    ['5-|', '5|'], // a minus only at the front
    ['007|', '7|'],
    ['0|', '0|'],
    ['05|', '5|'],
    ['000|', '0|'], // all zeros: the caret goes after the one left
    ['0|0', '0|'],
    ['|00', '|0'],
    ['000.5|', '0.5|'],
    ['.|', '0.|'],
    ['|.5', '0|.5'],
    ['$1,234.50|', '1,234.50|'], // a pasted figure keeps only its digits and marks
    ['1.2|', '1.2|'],
    ['1.0|', '1.0|'], // not padded or trimmed while typing
    ['12.345|', '12.34|', money], // at most the maximum places
    ['12.3|45', '12.3|5', money], // typed into a full fraction, a digit overwrites the next
    ['12.34|', '12|', { ...plain, places: { min: 0, max: 0 } }], // no places: the fraction never arrives
  ]) {
    it(`${typed} → ${shown}`, () => assert.equal(re(typed, f), shown))
  }
  it('is idempotent on its own text', () => {
    for (const s of ['1,234|', '-12,345.6|7', '0.|5']) assert.equal(re(re(s)), re(s))
  })
})

describe('edit: one keystroke, paste or deletion (insert, Backspace and Delete)', () => {
  const back = { delete: 'backward' }, fwd = { delete: 'forward' }
  for (const [field, change, after, f] of [
    ['1,234|', { insert: '5' }, '12,345|'],
    ['1|,234', { insert: '9' }, '19|,234'],
    ['1,234|', back, '123|'],
    ['1,|234', back, '|234'], // Backspace over a separator takes the digit before it
    ['1|,234', fwd, '1|34'], // Delete over a separator takes the digit after it
    ['|1,234', back, '|1,234'],
    ['1,234|', fwd, '1,234|'],
    ['[1,2]34', back, '|34'],
    ['12.|50', back, '12|.50', money], // a fixed decimal mark is stepped over, not deleted
    ['12|.50', fwd, '12.|50', money],
    ['12.|5', back, '12|5'], // with no fixed places it goes, like any character
    ['1|,234.56', { insert: '.' }, 'refused'], // a second decimal mark is ignored
    ['12|.50', { insert: '.' }, '12.|50', money], // or steps over the one there
    ['38,500.|00', { insert: '5' }, '38,500.5|0', money],
    ['38,500.00|', { insert: '1' }, 'refused', money],
    // PR review (gitar): a digit over the same digit is accepted, so the caret moves on to the next one
    ['38,500.|00', { insert: '0' }, '38,500.0|0', money],
    ['38,500.0|0', { insert: '0' }, '38,500.00|', money],
    ['[38,500.00]', { insert: '5' }, '5|', money],
    ['[1,234]', { insert: '$9,876.5' }, '9,876.5|'],
    ['12.[3]4', { insert: '9.9' }, '12.99|4'], // the mark in a paste goes when one is there already
    // review 1: an insertion that adds nothing is refused before it removes the selection
    ['[1,234.50]', { insert: 'a' }, 'refused', money],
    ['1,[234]', { insert: 'x' }, 'refused'],
    ['[12]', { insert: '-' }, 'refused', { ...plain, negative: false }],
    ['1[23]4', { insert: '-' }, 'refused'], // a minus can't go mid-number
    ['[1,234.50]', { insert: '-' }, '-|', money], // where one may go, it replaces the selection
    // review 2: typed before the minus, a digit goes after it and the sign stays
    ['|-123', { insert: '4' }, '-4|,123'],
    ['|-123', { insert: '.' }, '-0.|123'],
    ['[-1]23', { insert: '4' }, '4|23'], // a selected minus is replaced like anything else
    // PR review (CodeRabbit): an allowed insertion replaces a selection even when both forms read the same
    ['[12]0', { insert: '0' }, '0|'],
    ['[0].5', { insert: '0' }, '0|.5'], // reads the same either way, and the selection is still replaced
    // PR review (Baz): a decimal mark in a field with no places is refused, so the caret stays where it was
    ['|0', { insert: '.' }, 'refused', { ...plain, places: { min: 0, max: 0 } }],
    ['1|0', { insert: '.' }, 'refused', { ...plain, places: { min: 0, max: 0 } }],
  ]) {
    it(`${field} ${JSON.stringify(change)} → ${after}`, () => assert.equal(ed(field, change, f), after))
  }
  it('typing 05 after the decimal mark of 1,200.00 gives 1,200.05, one digit after the other', () => {
    let field = { text: '1,200.00', caret: 6 }
    for (const key of '05') field = edit({ text: field.text, start: field.caret, end: field.caret }, { insert: key }, money) ?? field
    assert.equal(show(field), '1,200.05|')
  })
  it('a refused edit leaves the selection where it was', () => {
    assert.equal(edit({ text: '1,234.50', start: 0, end: 8 }, { insert: 'a' }, money), null)
  })
})

// PR review (CodeRabbit): a locale change mid-edit rewrites the text in the new marks before it is read with them
describe('relocalize: a field\'s text in another locale\'s marks', () => {
  it('drops the old grouping, swaps the decimal mark and keeps the caret on its character', () => {
    const moved = relocalize(at('1,234.5|0'), en, de)
    assert.equal(show(moved), '1234,5|0')
    assert.equal(show(reformat(moved.text, moved.caret, { ...money, symbols: de })), '1.234,5|0')
    assert.equal(figureOf(reformat(moved.text, moved.caret, { ...money, symbols: de }).text, de), '1234.50')
    assert.equal(show(relocalize(at('1.234,50|'), de, en)), '1234.50|')
  })
})

describe('figureOf: the plain figure in a field\'s text', () => {
  it('drops the grouping and makes the decimal mark a full stop', () => {
    assert.equal(figureOf('-1,234.50', en), '-1234.50')
    assert.equal(figureOf('1.234,5', de), '1234.5')
    assert.equal(figureOf('1.', en), '1')
    assert.equal(figureOf('0.5', en), '0.5')
  })
  it('has none until there is a digit', () => {
    assert.equal(figureOf('', en), null)
    assert.equal(figureOf('-', en), null)
  })
})

describe('display: a value at rest', () => {
  it('rounds half away from zero to the maximum places and pads to the minimum', () => {
    const p = { min: 2, max: 2 }
    assert.equal(display(new D('1.005'), en, p), '1.01')
    assert.equal(display(new D('-1.005'), en, p), '-1.01')
    assert.equal(display(new D('5'), en, p), '5.00')
    assert.equal(display(new D('-0.001'), en, p), '0.00')
    assert.equal(display(new D('1234567.891'), de, p), '1.234.567,89')
  })
  it('keeps every digit with no maximum, and nothing for empty', () => {
    assert.equal(display(new D('12345.6789'), en, { min: 0 }), '12,345.6789')
    assert.equal(display(null, en, { min: 2 }), '')
  })
})

describe('committed: clamped to min/max, then rounded', () => {
  const p = { min: 2, max: 2 }
  it('clamps a typed value', () => {
    assert.equal(committed(new D(12), { max: 10, places: { min: 0 } }).toString(), '10')
    assert.equal(committed(new D(-1), { min: 0, places: { min: 0 } }).toString(), '0')
    assert.equal(committed(new D(5), { min: '0', max: '10', places: { min: 0 } }).toString(), '5')
    assert.equal(committed(new D(-1), { min: '', places: { min: 0 } }).toString(), '-1')
  })
  it('rounds to the places, half away from zero', () => {
    assert.equal(committed(new D('1.005'), { places: p }).toString(), '1.01')
    assert.equal(committed(new D('-2.675'), { places: p }).toString(), '-2.68')
    assert.equal(committed(new D('31.5'), { places: { min: 0, max: 0 } }).toString(), '32')
    assert.equal(committed(new D('1.23456'), { places: { min: 0 } }).toString(), '1.23456')
  })
  it('leaves empty empty', () => assert.equal(committed(null, { min: 0, places: p }), null))
  // review 5: rounding after a clamp could leave the range; the result is the nearest value inside it at the places
  it('never rounds out of range: the nearest value the places can write inside the bound', () => {
    assert.equal(committed(new D(2), { max: '1.235', places: p }).toFixed(2), '1.23')
    assert.equal(committed(new D('1.235'), { max: '1.235', places: p }).toFixed(2), '1.23') // 1.24 would be past it
    assert.equal(committed(new D(0), { min: '0.004', places: p }).toFixed(2), '0.01')
    assert.equal(committed(new D('-5'), { min: '-1.005', places: p }).toFixed(2), '-1.00')
    assert.equal(committed(new D('1.234'), { max: '1.235', places: p }).toFixed(2), '1.23') // in range: just rounded
    assert.equal(outside(committed(new D(9), { min: 0, max: '1.235', places: { min: 0, max: 0 } }), 0, '1.235'), 0)
  })
  it('keeps the bound itself when the places can write nothing inside the range', () => {
    assert.equal(committed(new D(1), { min: '0.004', max: '0.006', places: p }).toString(), '0.006')
  })
  // PR review (CodeRabbit): what is shown is what is handed back; a committed value isn't rounded again
  it('shows a committed value as it is held, the unrounded bound included', () => {
    const bound = committed(new D(1), { min: '0.004', max: '0.006', places: p })
    assert.equal(shownCommitted(bound, en, p), '0.006')
    assert.equal(shownCommitted(bound, en, p), fixedFigure(bound, p))
    assert.equal(shownCommitted(committed(new D('1234.005'), { places: p }), en, p), '1,234.01')
    assert.equal(shownCommitted(committed(new D(5), { places: p }), en, p), '5.00')
  })
  it('says which side a value is out on', () => {
    assert.equal(outside(new D(11), 0, 10), 1)
    assert.equal(outside(new D(-1), 0, 10), -1)
    assert.equal(outside(new D(10), 0, 10), 0)
    assert.equal(outside(null, 0, 10), 0)
  })
  it('writes a string model\'s figure to the minimum places', () => {
    assert.equal(fixedFigure(new D('1234.5'), p), '1234.50')
    assert.equal(fixedFigure(new D('1234.567'), { min: 0 }), '1234.567')
  })
})

describe('the caller\'s kind of model: string, number or Decimal', () => {
  it('knows each kind, a Decimal of another copy of decimal.js included', () => {
    assert.equal(kindOf('1'), 'string')
    assert.equal(kindOf(1), 'number')
    assert.equal(kindOf(new Decimal(1)), 'decimal')
    assert.equal(kindOf(new OtherDecimal(1)), 'decimal')
    assert.equal(kindOf(null), undefined)
    assert.equal(kindOf(undefined), undefined)
  })
  it('the second copy really is another class', () => {
    assert.equal(new OtherDecimal(1) instanceof Decimal, false)
  })
  it('a string comes back a string, as typed', () => {
    assert.equal(toModel('1.0', 'string'), '1.0')
    assert.equal(toModel(null, 'string'), '')
  })
  it('a number comes back a number', () => {
    assert.equal(toModel('1.5', 'number'), 1.5)
    assert.equal(toModel(null, 'number'), null)
  })
  it('a Decimal comes back a Decimal of the caller\'s own class', () => {
    const ours = toModel('1.50', 'decimal')
    assert.ok(ours instanceof Decimal)
    assert.equal(ours.toString(), '1.5')
    const theirs = toModel('1.50', 'decimal', OtherDecimal)
    assert.ok(theirs instanceof OtherDecimal)
    assert.equal(theirs instanceof Decimal, false)
    class Money extends OtherDecimal {}
    assert.ok(toModel('2', 'decimal', Money) instanceof Money)
    assert.equal(toModel(null, 'decimal', OtherDecimal), null)
  })
  it('reads the class off an instance: another copy\'s, or a subclass\'s (whose own `constructor` decimal.js sets to the base)', () => {
    class Money extends OtherDecimal {}
    const m = new Money('1')
    assert.equal(m.constructor, OtherDecimal) // why `v.constructor` won't do for a subclass
    assert.equal(decimalClass(m), Money)
    assert.equal(decimalClass(new OtherDecimal('1')), OtherDecimal)
    assert.equal(decimalClass(new Decimal('1')), Decimal)
    assert.ok(toModel('2.50', 'decimal', decimalClass(m)) instanceof Money)
  })
  // review 4: a clone shares the base's prototype, so the prototype names the base; its own constructor is the clone
  it('keeps a Decimal.clone() and its precision', () => {
    const P30 = OtherDecimal.clone({ precision: 30 })
    const v = new P30('1')
    assert.equal(decimalClass(v), P30)
    const out = toModel('2', 'decimal', decimalClass(v))
    assert.equal(out.constructor, P30)
    assert.equal(out.constructor.precision, 30)
    assert.equal(out.div(3).toString().length, '0.'.length + 30)
    class Fine extends P30 {}
    assert.equal(decimalClass(new Fine('1')), Fine)
  })
  it('a foreign Decimal goes through typing, a nudge, a clamp and rounding and comes back its own class, exactly', () => {
    const v = new OtherDecimal('12345678901234567890.125')
    const next = committed(nudged(readModel(v), 1, { step: 1 }), { max: '99999999999999999999', places: { min: 2, max: 2 } })
    const out = toModel(fixedFigure(next, { min: 2, max: 2 }), kindOf(v), decimalClass(v))
    assert.ok(out instanceof OtherDecimal)
    assert.equal(out.toFixed(), '12345678901234567891.13')
  })
  it('reads a model with no float in the way', () => {
    assert.equal(readModel('12345678901234567890.12').toFixed(), '12345678901234567890.12')
    assert.equal(readModel(new OtherDecimal('0.1')).plus(readModel('0.2')).toString(), '0.3')
    assert.equal(readModel(38500).toString(), '38500')
    assert.equal(readModel('forty'), null)
    assert.equal(readModel('1e5'), null)
    assert.equal(readModel(Number.NaN), null)
    assert.equal(readModel(''), null)
  })
  // PR review (Baz): a grouped string model is judged by its value for the range mark, not skipped
  it('reads a string model that isn\'t a plain figure the way the field reads text', () => {
    assert.equal(readHeld('1,500', en).toString(), '1500')
    assert.equal(readHeld('1.500,5', de).toString(), '1500.5')
    assert.equal(readHeld('38500', en).toString(), '38500')
    assert.equal(readHeld(new OtherDecimal('0.1'), en).toString(), '0.1')
    assert.equal(readHeld(12, en).toString(), '12')
    assert.equal(readHeld('forty', en), null)
    assert.equal(readHeld('', en), null)
    assert.equal(readHeld(null, en), null)
  })
  it('knows when the model already holds a figure (a string compares as text)', () => {
    assert.equal(holds('1', '1.0'), false)
    assert.equal(holds(1, '1.0'), true)
    assert.equal(holds(new OtherDecimal(1), '1.00'), true)
    assert.equal(holds(null, null), true)
    assert.equal(holds('', null), true)
    assert.equal(holds(0, null), false)
  })
})

describe('readFigure: freeform text, read where it plainly is a number', () => {
  for (const [typed, read, o] of [
    ['$120,000', '120000'],
    ['24 %', '24'],
    ['40.', '40'],
    ['1,5', '1,5'], // a decimal comma in en-US is left for validation
    ['12 34', '12 34'],
    ['forty', 'forty'],
    ['', ''],
    ['1,5', '1.5', { symbols: de }],
    ['1.234,5', '1234.5', { symbols: de }],
    ['€ 1.234', '1234', { symbols: de, symbol: '€' }],
    ['~$1,200', '1200', { prefix: '~' }],
    ['1,200 /mo', '1200', { suffix: '/mo' }],
  ]) {
    it(`${JSON.stringify(typed)} → ${JSON.stringify(read)}`, () => assert.equal(readFigure(typed, o), read))
  }
})

// PR review (CodeRabbit): a freeform nudge is written in the field's own marks, so the next nudge reads it back
describe('writeFigure: a figure in freeform text, as the field\'s locale reads it', () => {
  it('round-trips through readFigure in en-US and de', () => {
    assert.equal(writeFigure('125000.5', en), '125000.5')
    for (const figure of ['1.234', '1234.5', '-0.001', '7']) {
      assert.equal(readFigure(writeFigure(figure, de), { symbols: de }), figure)
    }
    assert.equal(writeFigure('1.234', de), '1,234')
  })
})

describe('nudged: by the step from what is there, clamped', () => {
  it('never snaps to a multiple of the step', () => {
    assert.equal(nudged(new D(38512), 1, { step: 5000 }).toString(), '43512')
    assert.equal(nudged(new D(38500), -1, { step: 5000 }).toString(), '33500')
  })
  it('starts from zero, adds without float noise, and stops at min and max', () => {
    assert.equal(nudged(null, 1, { step: 1 }).toString(), '1')
    assert.equal(nudged(new D('-0.9'), 1, { step: 1 }).toString(), '0.1')
    assert.equal(nudged(new D(9.5), 1, { step: 1, max: 10 }).toString(), '10')
    assert.equal(nudged(new D(0), -1, { step: 0.5, min: 0 }).toString(), '0')
  })
})

describe('resolvePlaces: the decimal places for a unit', () => {
  it('money is in cents, every other unit as typed', () => {
    assert.deepEqual(DEFAULTS.places.money, { min: 2, max: 2 })
    assert.deepEqual(resolvePlaces({}, DEFAULTS.places.count), { min: 0, max: undefined })
  })
  it('a minimum above the maximum meets it: down to an explicit maximum, else the maximum goes up', () => {
    assert.deepEqual(resolvePlaces({ min: 0 }, DEFAULTS.places.money), { min: 0, max: 2 })
    assert.deepEqual(resolvePlaces({ max: 0 }, DEFAULTS.places.money), { min: 0, max: 0 })
    assert.deepEqual(resolvePlaces({ min: 4 }, DEFAULTS.places.money), { min: 4, max: 4 })
    assert.deepEqual(resolvePlaces({ min: 3, max: 1 }, DEFAULTS.places.money), { min: 1, max: 1 })
  })
})

describe('stepLabel: the chevrons\' names', () => {
  it('names the step in its unit', () => {
    assert.equal(stepLabel('money', 5000, 'en-US', 'USD'), '$5,000')
    assert.equal(stepLabel('hours', 0.5, 'en-US', 'USD'), '0.5 hours')
    assert.equal(stepLabel('percent', 1, 'en-US', 'USD'), '1%')
  })
})
