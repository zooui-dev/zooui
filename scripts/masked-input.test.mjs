// ZMaskedInput's mask engine (packages/nuxt/utils/masked-input.ts): reading a mask, formatting, choosing among
// several masks (by the separator typed, or the first that fits), the caret kept on its character through every
// edit, the blur-time commit, and the phone and tax-ID presets.
// Node strips the TypeScript itself (Node 22.18+, 23.6+), so the layer's source is what runs.
// Run: node --test 'scripts/*.test.mjs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  commitMasked, editMasked, isMaskComplete, literalsAfter, MASK_PRESETS, maskDeletion, parseMask, reformat, unmaskedValue,
} from '../packages/nuxt/utils/masked-input.ts'

const PHONE = MASK_PRESETS.phone.mask
const TAX = MASK_PRESETS['tax-id'].mask
const SSN = 0, EIN = 1

/** A field written with | for the caret: "123-|45". */
const at = (s) => ({ text: s.replace('|', ''), caret: s.indexOf('|') })
const show = ({ text, caret }) => `${text.slice(0, caret)}|${text.slice(caret)}`
const re = (s, mask, chosen = null) => { const { text, caret } = at(s); return show(reformat(text, caret, mask, chosen)) }
/** A field with its caret (|) or its selection ([…]). */
const sel = (s) => s.includes('[')
  ? { text: s.replace(/[[\]]/g, ''), start: s.indexOf('['), end: s.indexOf(']') - 1 }
  : { text: s.replace('|', ''), start: s.indexOf('|'), end: s.indexOf('|') }
/** One edit, shown with its caret; `null` when refused. */
const ed = (s, e, mask, chosen = null) => { const r = editMasked(sel(s), e, mask, chosen); return r && show(r) }
const type = (s, insert, mask, chosen) => ed(s, { insert }, mask, chosen)
const back = (s, mask, chosen) => ed(s, { delete: 'backward' }, mask, chosen)
const del = (s, mask, chosen) => ed(s, { delete: 'forward' }, mask, chosen)

/** Keys typed one at a time into an empty field, the mask choice carried from each change to the next. */
function typeAll(keys, mask) {
  let field = { text: '', caret: 0 }, chosen = null
  for (const k of keys) {
    const r = editMasked({ text: field.text, start: field.caret, end: field.caret }, { insert: k }, mask, chosen)
    if (!r) continue
    field = r
    chosen = r.chosen
  }
  return { shown: show(field), chosen }
}

describe('parseMask', () => {
  it('reads tokens and literals, and counts what it holds', () => {
    const m = parseMask('(###) ###-####')
    assert.equal(m.capacity, 10)
    assert.equal(m.slots.length, 14)
    assert.deepEqual(m.slots.slice(0, 2).map((s) => ('literal' in s ? s.literal : '#')), ['(', '#'])
  })
  it('a backslash makes a token character literal', () => {
    const m = parseMask('\\#-###')
    assert.equal(m.capacity, 3)
    assert.equal(re('#-12|3', '\\#-###'), '#-12|3')
  })
  it('the literals between characters', () => {
    const m = parseMask('(###) ###-####')
    assert.equal(literalsAfter(m, 0), '(')
    assert.equal(literalsAfter(m, 3), ') ')
    assert.equal(literalsAfter(m, 6), '-')
    assert.equal(literalsAfter(m, 1), '')
    assert.equal(literalsAfter(parseMask('##)'), 2), ')')
  })
})

describe('formatting', () => {
  it('writes a literal once a character follows it', () => {
    assert.equal(re('5|', PHONE), '(5|')
    assert.equal(re('555|', PHONE), '(555|')
    assert.equal(re('5551|', PHONE), '(555) 1|')
    assert.equal(re('5551234567|', PHONE), '(555) 123-4567|')
    assert.equal(re('123|', TAX), '123|')
    assert.equal(re('1234|', TAX), '123-4|')
    assert.equal(re('12345|', TAX), '123-45|')
    assert.equal(re('123456|', TAX), '123-45-6|')
  })
  it('a trailing literal is written when the mask is full', () => {
    assert.equal(re('12|', '(##)'), '(12)|')
    assert.equal(re('1|', '(##)'), '(1|')
  })
  it('drops what no token takes, and what is past the end', () => {
    assert.equal(re('a5b5.5 1x2|', PHONE), '(555) 12|')
    assert.equal(re('1234567890|', TAX), '123-45-6789|')
    assert.equal(reformat('1234567890', 10, TAX).overflow, 1)
  })
  it('letters, alphanumerics and a transform', () => {
    assert.equal(re('ab12|', 'AA-##'), 'ab-12|')
    assert.equal(re('1a|', 'AA-##'), 'a|', 'a digit is not a letter')
    assert.equal(re('x9y|', '***'), 'x9y|')
    const upper = parseMask('AA', { A: { pattern: /[a-z]/i, transform: (c) => c.toUpperCase() } })
    assert.equal(re('ab|', [upper]), 'AB|')
  })
  it('raw, complete', () => {
    const r = reformat('123-45-6789', 11, TAX)
    assert.equal(r.raw, '123456789')
    assert.equal(r.complete, true)
    assert.equal(reformat('123-45', 6, TAX).complete, false)
    assert.equal(unmaskedValue('(555) 123-4567', PHONE), '5551234567')
    assert.equal(unmaskedValue(null, PHONE), '')
    assert.equal(unmaskedValue('+44 20 7946 0958', PHONE), '442079460958', 'not cut to the mask')
  })
})

describe('mask choice', () => {
  it('tax ID: SSN by default', () => {
    const r = reformat('123456789', 9, TAX)
    assert.equal(r.mask, SSN)
    assert.equal(r.chosen, null)
    assert.equal(r.text, '123-45-6789')
  })
  it('tax ID: a dash typed after two digits chooses the EIN, and shows it at once', () => {
    assert.deepEqual(typeAll('12-', TAX), { shown: '12-|', chosen: EIN })
    assert.deepEqual(typeAll('12-3456789', TAX), { shown: '12-3456789|', chosen: EIN })
  })
  it('tax ID: a dash anywhere else adds nothing', () => {
    assert.deepEqual(typeAll('-1-23-', TAX), { shown: '123|', chosen: null })
    assert.equal(type('1|', '-', TAX), null)
    assert.equal(type('123|', '-', TAX), null, 'the SSN writes that dash itself')
    assert.deepEqual(typeAll('123-45-6789', TAX), { shown: '123-45-6789|', chosen: null })
  })
  it('tax ID: the EIN holds once chosen, until the field is empty', () => {
    assert.equal(re('12-345|', TAX, EIN), '12-345|')
    assert.equal(re('123|', TAX, EIN), '12-3|', 'still the EIN after the dash is gone')
    assert.equal(reformat('', 0, TAX, EIN).chosen, null)
    assert.equal(editMasked(sel('[12-3]'), { delete: 'backward' }, TAX, EIN).chosen, null)
  })
  it('tax ID: a dash typed mid-text after two digits chooses the EIN too', () => {
    assert.equal(type('12|34', '-', TAX), '12-|34')
  })
  it('tax ID: a whole new text starts the choice afresh', () => {
    assert.equal(type('[12-3456789]', '123456789', TAX, EIN), '123-45-6789|')
    assert.equal(type('[12-3456789]', '5', TAX, EIN), '5|')
    assert.equal(editMasked(sel('[12-3456789]'), { insert: '5' }, TAX, EIN).chosen, null)
  })
  it('tax ID: a pasted value keeps its own form', () => {
    assert.equal(type('|', '12-3456789', TAX), '12-3456789|')
    assert.equal(type('|', '123-45-6789', TAX), '123-45-6789|')
    assert.equal(type('|', '12 3456789', TAX), '123-45-6789|', 'a space is no dash')
  })
  it('a model that arrives formatted is read back into its mask', () => {
    assert.equal(reformat('12-3456789', 10, TAX).chosen, EIN)
    assert.equal(reformat('12-', 3, TAX).chosen, EIN)
    assert.equal(reformat('123-45-6789', 11, TAX).chosen, null)
  })
  it('first fit: the first mask that holds every character', () => {
    const zip = ['#####', '#####-####']
    assert.equal(re('12345|', zip), '12345|')
    assert.equal(reformat('12345', 5, zip).mask, 0)
    assert.equal(re('123456|', zip), '12345-6|')
    assert.equal(reformat('123456', 6, zip).mask, 1)
    assert.equal(re('12345-6|', zip), '12345-6|')
    assert.equal(re('123456|', zip, 1), '12345-6|')
    const plate = ['AAA-###', '###-AAA']
    assert.equal(re('ab|', plate), 'ab|')
    assert.equal(reformat('12a', 3, plate).mask, 1)
    assert.equal(re('12ab|', plate), 'ab|', 'each holds two: the first')
  })
  it('first fit: none holds everything, the first that holds the most', () => {
    assert.equal(reformat('1234567890', 10, TAX).mask, SSN)
  })
  it('by separator, generally: a separator where only another mask has it', () => {
    const zip = ['#####', '#####-####']
    assert.deepEqual(typeAll('12345-', zip), { shown: '12345-|', chosen: 1 })
    const local = ['###-####', '(###) ###-####']
    assert.deepEqual(typeAll('(', local), { shown: '(|', chosen: 1 })
    assert.deepEqual(typeAll('(555', local), { shown: '(555) |', chosen: 1 })
    assert.deepEqual(typeAll('5551', local), { shown: '555-1|', chosen: null })
  })
})

describe('the caret', () => {
  it('stays after the same character as literals come and go', () => {
    assert.equal(re('123|4', TAX), '123|-4')
    assert.equal(re('1234|5', TAX), '123-4|5')
    assert.equal(re('1|23456', TAX), '1|23-45-6')
    assert.equal(re('555|1234567', PHONE), '(555|) 123-4567')
    assert.equal(re('5551|234567', PHONE), '(555) 1|23-4567')
    assert.equal(re('|5551234567', PHONE), '|(555) 123-4567')
  })
  it('typed just after a separator, stays after it', () => {
    assert.equal(re('123-|45', TAX), '123-|45')
    assert.equal(re('(555) |123', PHONE), '(555) |123')
    assert.equal(re('12-|', TAX), '12-|')
  })
  it('typing in the middle', () => {
    assert.equal(type('123-|45', '9', TAX), '123-9|4-5')
    assert.equal(type('123|-45', '9', TAX), '123-9|4-5')
    assert.equal(type('12|3-45', '9', TAX), '129|-34-5')
    assert.equal(type('(555) 1|23', '9', PHONE), '(555) 19|2-3')
  })
  it('a paste lands with the caret after it', () => {
    assert.equal(type('123-|45', '99', TAX), '123-99|-45')
    assert.equal(type('|', '(555) 123-4567', PHONE), '(555) 123-4567|')
    assert.equal(type('[555]', '(555) 123-4567', PHONE), '(555) 123-4567|')
    assert.equal(type('(5[55) 12]3', '9a9', PHONE), '(599|) 3', 'the letter dropped')
  })
  it('Backspace across a separator takes the character beyond it', () => {
    assert.equal(back('123-|45', TAX), '12|4-5')
    assert.equal(back('(555) |123', PHONE), '(55|1) 23')
    assert.equal(back('(555) 1|23', PHONE), '(555) |23')
    assert.equal(back('123-4|5', TAX), '123-|5')
    assert.equal(back('123-45-6789|', TAX), '123-45-678|')
  })
  it('a separator left behind by a deletion chooses nothing', () => {
    assert.equal(editMasked(sel('123-|45'), { delete: 'backward' }, TAX).chosen, null)
    assert.equal(editMasked(sel('12|3-45'), { delete: 'forward' }, TAX).chosen, null)
  })
  it('Backspace over the separator that chose the mask takes it, and the choice', () => {
    const r = editMasked(sel('12-|'), { delete: 'backward' }, TAX, EIN)
    assert.equal(show(r), '12|')
    assert.equal(r.chosen, null)
    assert.equal(back('12-3|', TAX, EIN), '12-|')
    assert.equal(back('(|', ['###-####', '(###) ###-####'], 1), '|')
    assert.equal(back('(555) |', ['###-####', '(###) ###-####'], 1), '(55|', 'the "(" would choose again: the 5 goes')
  })
  it('Delete across a separator takes the character beyond it, and the caret stays', () => {
    assert.equal(del('123|-45', TAX), '123|-5')
    assert.equal(del('(555|) 123', PHONE), '(555|) 23')
    assert.equal(del('12|3-45', TAX), '12|4-5')
    assert.equal(del('123-45|', TAX), null)
  })
  it('a deletion with a selection', () => {
    assert.equal(back('1[23-4]5', TAX), '1|5')
    assert.equal(del('[123-45]', TAX), '|')
  })
  it('the deletion range', () => {
    assert.deepEqual(maskDeletion(sel('(555) |1'), 'backward', PHONE), [3, 4])
    assert.deepEqual(maskDeletion(sel('(|555'), 'backward', PHONE), [0, 1])
    assert.equal(maskDeletion(sel('|5'), 'backward', PHONE), null)
    assert.deepEqual(maskDeletion(sel('555|) 1'), 'forward', PHONE), [5, 6])
  })
})

describe('refused edits', () => {
  it('a character no mask takes or writes', () => {
    assert.equal(type('12|', 'a', TAX), null)
    assert.equal(type('[123]', 'x', TAX), null, 'the selection stays')
    assert.equal(type('(55|', '.', PHONE), null)
  })
  it('a character into a full field', () => {
    assert.equal(type('123-45-6789|', '0', TAX), null)
    assert.equal(type('123-|45-6789', '0', TAX), null, 'never pushes the last out')
    assert.equal(type('[123]-45-6789', '0', TAX), '0|45-67-89', 'the rest moves up')
  })
  it('a paste that overflows keeps what fits', () => {
    assert.equal(type('|', '1234567890123', TAX), '123-45-6789|')
  })
})

describe('commit on blur', () => {
  it('formats a whole value, however written', () => {
    assert.equal(commitMasked('5551234567', PHONE), '(555) 123-4567')
    assert.equal(commitMasked('555.123.4567', PHONE), '(555) 123-4567')
    assert.equal(commitMasked('555 123 4567', PHONE), '(555) 123-4567')
    assert.equal(commitMasked('(555) 123-4567', PHONE), '(555) 123-4567')
  })
  it('leaves anything else as typed', () => {
    assert.equal(commitMasked('+44 20 7946 0958', PHONE), '+44 20 7946 0958')
    assert.equal(commitMasked('555-1234', PHONE), '555-1234')
    assert.equal(commitMasked('15551234567', PHONE), '15551234567')
    assert.equal(commitMasked('', PHONE), '')
  })
  it('a tax ID keeps the mask its separator chose', () => {
    assert.equal(commitMasked('12-3456789', TAX), '12-3456789')
    assert.equal(commitMasked('123456789', TAX), '123-45-6789')
  })
})

describe('isMaskComplete', () => {
  it('a whole value, written in its mask', () => {
    assert.equal(isMaskComplete('(555) 123-4567', PHONE), true)
    assert.equal(isMaskComplete('123-45-6789', TAX), true)
    assert.equal(isMaskComplete('12-3456789', TAX), true)
  })
  it('anything else', () => {
    assert.equal(isMaskComplete('5551234567', PHONE), false)
    assert.equal(isMaskComplete('(555) 123-456', PHONE), false)
    assert.equal(isMaskComplete('123-45-678', TAX), false)
    assert.equal(isMaskComplete('1234-5-6789', TAX), false)
    assert.equal(isMaskComplete(null, TAX), false)
    assert.equal(isMaskComplete('', TAX), false)
  })
})

describe('the presets', () => {
  it('phone formats on blur, tax ID as typed', () => {
    assert.equal(MASK_PRESETS.phone.formatOn, 'blur')
    assert.equal(MASK_PRESETS.phone.attrs.type, 'tel')
    assert.equal(MASK_PRESETS['tax-id'].formatOn, 'input')
    assert.equal(MASK_PRESETS['tax-id'].attrs.placeholder, 'SSN or EIN')
  })
})
