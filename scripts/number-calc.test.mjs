// ZNumberInput's calc mode (packages/nuxt/components/number-calc.ts): the expression examples, ported case
// for case, then the precedence, decimal arithmetic, locales, live grouping and the operator-with-selection rule.
// Node strips the TypeScript itself (Node 22.18+, 23.6+), so the layer's source is what runs.
// Run: node --test 'scripts/*.test.mjs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { CALC_PLACES, calcPlaces, containsOperator, editExpression, evaluate, reformatExpression } from '../packages/nuxt/components/number-calc.ts'
import { committed, symbols } from '../packages/nuxt/components/number-format.ts'

const en = symbols('en-US'), de = symbols('de')
const calc = (text, s = en) => evaluate(text, s)?.toString() ?? null
const show = (next) => (next ? `${next.text.slice(0, next.caret)}|${next.text.slice(next.caret)}` : 'refused')
/** A field with its caret (|) or its selection ([…]). */
const sel = (s) => s.includes('[')
  ? { text: s.replace(/[[\]]/g, ''), start: s.indexOf('['), end: s.indexOf(']') - 1 }
  : { text: s.replace('|', ''), start: s.indexOf('|'), end: s.indexOf('|') }

describe('evaluate: the expression examples', () => {
  for (const [text, value] of [
    ['678+22', '700'],
    ['100*3+50', '350'],
    ['1,000+500', '1500'],
    ['-100+200', '100'],
    ['100+50*2', '200'], // precedence
    ['678+', null], // incomplete
    ['abc', null], // invalid
    ['5/0', null], // division by zero
  ]) {
    it(`${text} → ${value}`, () => assert.equal(calc(text), value))
  }
})

describe('evaluate: precedence, signs and decimals', () => {
  for (const [text, value] of [
    ['2*3-4/2', '4'],
    ['2+3*4-5', '9'],
    ['100-50-25', '25'], // left to right
    ['100/10/2', '5'],
    ['5*-2', '-10'],
    ['5--2', '7'],
    ['0.1+0.2', '0.3'], // decimal.js: no float noise
    ['10/4', '2.5'],
    ['5.', '5'],
    ['.5+.5', '1'],
    [' 1 + 2 ', '3'],
    ['1−2', '-1'], // a typographic minus
    ['12', '12'],
    ['-12', '-12'],
  ]) {
    it(`${text} → ${value}`, () => assert.equal(calc(text), value))
  }
  for (const text of ['', '+', '--5', '5+*2', '1.2.3', '1e5', '5*', '(1+2)', '2^3', '5/0.0']) {
    it(`${JSON.stringify(text)} has no value`, () => assert.equal(calc(text), null))
  }
  it('reads the field\'s locale: de groups with a full stop and has a decimal comma', () => {
    assert.equal(calc('1.000,5+1', de), '1001.5')
    assert.equal(calc('2,5*2', de), '5')
  })
  it('rounds to the field\'s places on commit: the whole-dollar rule is calc with no places', () => {
    const whole = { places: calcPlaces({ min: 0, max: 0 }) }
    assert.equal(committed(evaluate('10.5*3', en), whole).toString(), '32')
    assert.equal(committed(evaluate('100/3', en), { places: calcPlaces({ min: 2, max: 2 }) }).toString(), '33.33')
    assert.equal(committed(evaluate('600+700', en), { max: 1000, places: { min: 0 } }).toString(), '1000')
  })
})

// review 6: the result is rounded once, at the field's places; ten places only stand in where the field has no maximum
describe('calc rounds once, at the field\'s places', () => {
  it('does not round to ten places first (that would make 1.00499999999 round up to 1.01)', () => {
    assert.equal(calc('1.00499999999+0'), '1.00499999999')
    assert.equal(committed(evaluate('1.00499999999+0', en), { places: calcPlaces({ min: 2, max: 2 }) }).toFixed(2), '1.00')
  })
  it('stands in ten places where the field has no maximum', () => {
    assert.deepEqual(calcPlaces({ min: 0 }), { min: 0, max: CALC_PLACES })
    assert.deepEqual(calcPlaces({ min: 2, max: 2 }), { min: 2, max: 2 })
    assert.equal(committed(evaluate('1/3*3', en), { places: calcPlaces({ min: 0 }) }).toString(), '1')
    assert.equal(committed(evaluate('2/3', en), { places: calcPlaces({ min: 0 }) }).toString(), '0.6666666667')
  })
})

describe('containsOperator: a sum, not a sign', () => {
  it('looks past the first character', () => {
    assert.equal(containsOperator('-5'), false)
    assert.equal(containsOperator('5'), false)
    assert.equal(containsOperator('5-2'), true)
    assert.equal(containsOperator('5*'), true)
  })
})

describe('reformatExpression: each number grouped as it is typed, the caret kept', () => {
  for (const [typed, shown, s] of [
    ['12345+6789|', '12,345+6,789|'],
    ['-12345+6789|', '-12,345+6,789|'],
    ['1234|+5', '1,234|+5'],
    ['1|234+5', '1|,234+5'],
    ['12,34|+5', '1,234|+5'], // regrouped after a deletion
    ['1234.5678*2|', '1,234.5678*2|'],
    ['1234,5+1|', '1.234,5+1|', de],
    ['abc+1234|', 'abc+1,234|'], // what it can't read is left as typed
    ['12\n34+5|', '12\n34+5|'], // review 9: a line break that gets past an edit doesn't throw
  ]) {
    it(`${typed} → ${shown}`, () => {
      const { text, start } = sel(typed)
      assert.equal(show(reformatExpression(text, start, s ?? en)), shown)
    })
  }
})

describe('editExpression: the operator-with-selection rule, and edits', () => {
  for (const [field, change, after] of [
    ['[1,200]', { insert: '+' }, '1,200+|'], // selected on focus, then +50: added to, not replaced
    ['[1,200]', { insert: '*' }, '1,200*|'],
    ['[1,200]', { insert: '-' }, '-|'], // a minus over everything starts a negative number
    ['1,[200]', { insert: '-' }, '1,200-|'], // over part of it, a minus is added too
    ['[1,200]', { insert: '5' }, '5|'], // a digit replaces as usual
    ['1,200|', { insert: '+' }, '1,200+|'],
    ['1,200+|', { insert: '5' }, '1,200+5|'],
    ['1,200+5|', { insert: '000' }, '1,200+5,000|'],
    ['|', { insert: '$1,200 + 50' }, '1,200 + 50|'], // a paste keeps what an expression can hold
    ['1,200+|', { insert: 'x' }, 'refused'],
    ['[1,200]', { insert: 'x' }, 'refused'], // refused before it clears the selection
    // review 9: a line break in a paste is a space, and nothing throws
    ['|', { insert: '12\n34+5' }, '12 34+5|'],
    ['|', { insert: '1200\r\n+5' }, '1,200  +5|'],
    ['1,|200', { delete: 'backward' }, '|200'], // Backspace over a separator takes the digit before it
    ['1,200+5|', { delete: 'backward' }, '1,200+|'],
    ['[1,200+5]', { delete: 'forward' }, '|'],
  ]) {
    it(`${field} ${JSON.stringify(change)} → ${after}`, () => assert.equal(show(editExpression(sel(field), change, en)), after))
  }
})
