// The date-entry parser behind <ZDateField> (packages/nuxt/utils/date-entry.ts): unit tests for it, first the
// cases for the original parser (ported from vitest to node:test), then the formats it gained here.
// Node strips the TypeScript itself (Node 22.18+, 23.6+), so the layer's source is what runs.
// Run: node --test 'scripts/*.test.mjs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  applyDateShortcut,
  commitDateEntry,
  dateEntryFormat,
  dateEntryFormatFor,
  entryDay,
  FIRST_ENTRY_DATE,
  formatDateEntry,
  LAST_ENTRY_DATE,
  parseDateEntry,
  US_DATE_ENTRY,
} from '../packages/nuxt/utils/date-entry.ts'

// The layer's own PlainDate class (temporal-polyfill lives in packages/nuxt, out of reach of this directory).
const PlainDate = FIRST_ENTRY_DATE.constructor
const d = (s) => PlainDate.from(s)
const TODAY = d('2026-11-12')
const parse = (text, today = TODAY, format) => parseDateEntry(text, today, format)?.toString() ?? null
const key = (k, current, today = TODAY, format) =>
  applyDateShortcut(k, current ? d(current) : null, today, format)?.toString() ?? null

describe('parseDateEntry', () => {
  for (const [text, expected] of [
    ['5', '2026-11-05'],
    ['12', '2026-11-12'],
    ['31', null], // November has 30 days
    ['30', '2026-11-30'],
    ['0512', '2026-05-12'],
    ['051226', '2026-05-12'],
    ['123199', '1999-12-31'],
    ['5/12', '2026-05-12'],
    ['05/12', '2026-05-12'],
    ['5/12/26', '2026-05-12'],
    ['5/12/2026', '2026-05-12'],
    ['05/12/2026', '2026-05-12'],
    ['2/29/2028', '2028-02-29'],
    ['5/12/6', '2006-05-12'],
    ['1/1/01', '2001-01-01'],
    ['  5/12/26 ', '2026-05-12'], // stray whitespace isn't worth erasing a date over
  ]) {
    it(`${JSON.stringify(text)} → ${expected}`, () => assert.equal(parse(text), expected))
  }

  it('reads a day of the CURRENT month, whatever month today is', () => {
    assert.equal(parse('31', d('2026-01-15')), '2026-01-31')
    assert.equal(parse('29', d('2027-02-01')), null)
    assert.equal(parse('29', d('2028-02-01')), '2028-02-29')
  })

  for (const text of [
    '',
    '0',
    '00',
    '32', // over 31 is not a day, and too short for MMDD
    '512',
    '05122',
    '0512202',
    '13/1',
    '0/1',
    '1/0',
    '2/30',
    '4/31/2026',
    '2/29/2027',
    '2/29/27',
    '5/12/202',
    '5/12/0026',
    '5/12/20261',
    '5/',
    '/12',
    '5//2026',
    '5/12/26/1',
    '123/1',
    '1312',
    '0230',
    '5-12-2026',
    'May 12',
    '2026-05-12',
    't',
  ]) {
    it(`${JSON.stringify(text)} is not a date`, () => assert.equal(parse(text), null))
  }

  // The two-digit year lands within 20 years ahead of today and 79 behind.
  for (const [text, expected] of [
    ['5/12/46', '2046-05-12'],
    ['5/12/47', '1947-05-12'],
    ['5/12/99', '1999-05-12'],
    ['051246', '2046-05-12'],
    ['051247', '1947-05-12'],
  ]) {
    it(`pivots ${JSON.stringify(text)} to ${expected} in 2026`, () => assert.equal(parse(text), expected))
  }

  it('moves the pivot with today, and across a century', () => {
    assert.equal(parse('5/12/10', d('2090-01-01')), '2110-05-12')
    assert.equal(parse('5/12/11', d('2090-01-01')), '2011-05-12')
    assert.equal(parse('5/12/95', d('2090-01-01')), '2095-05-12')
  })

  // A year of 0 is rejected; "00" is not 2000, in any shape or format.
  for (const text of ['5/12/0', '5/12/00', '5/12/000', '5/12/0000', '1/1/00', '051200', '010100'])
    it(`${JSON.stringify(text)} has a year of 0, so is not a date`, () => assert.equal(parse(text), null))

  it('rejects a year of 0 in every format', () => {
    for (const [text, f] of [
      ['12/5/0', 'DD/MM/YYYY'], ['12/5/00', 'DD/MM/YYYY'], ['120500', 'DD/MM/YYYY'],
      ['12.5.00', 'DD.MM.YYYY'], ['120500', 'DD.MM.YYYY'],
      ['0-5-12', 'YYYY-MM-DD'], ['00-5-12', 'YYYY-MM-DD'], ['0000-05-12', 'YYYY-MM-DD'], ['000512', 'YYYY-MM-DD'],
    ])
      assert.equal(parse(text, TODAY, f), null, `${text} in ${f}`)
  })

  it('still reads a year that merely starts with 0', () => {
    assert.equal(parse('5/12/01'), '2001-05-12')
    assert.equal(parse('5/12/1'), '2001-05-12')
    assert.equal(parse('051201'), '2001-05-12')
    assert.equal(parse('010512', TODAY, 'YYYY-MM-DD'), '2001-05-12')
  })
})

describe('formatDateEntry', () => {
  it('writes MM/DD/YYYY', () => {
    assert.equal(formatDateEntry(d('2026-05-02')), '05/02/2026')
    assert.equal(formatDateEntry(d('2026-12-31')), '12/31/2026')
  })

  it('is empty for no date', () => {
    assert.equal(formatDateEntry(null), '')
    assert.equal(formatDateEntry(undefined), '')
  })

  it('reads back through parseDateEntry', () => {
    for (const s of ['2026-05-02', '1999-12-31', '2028-02-29', '2047-01-01'])
      assert.equal(parseDateEntry(formatDateEntry(d(s)), TODAY)?.toString(), s)
  })
})

describe('commitDateEntry', () => {
  const commit = (text, current, format) => commitDateEntry(text, current ? d(current) : null, TODAY, format)?.toString() ?? null

  it('keeps a date it could not read back when the text is untouched', () => {
    // A bad import, say: shown as 05/12/0026, which parseDateEntry rejects as a slip.
    assert.equal(parse('05/12/0026'), null)
    assert.equal(commit('05/12/0026', '0026-05-12'), '0026-05-12')
    assert.equal(commit(' 05/12/0026 ', '0026-05-12'), '0026-05-12')
  })

  it('reads the text once it has been edited', () => {
    assert.equal(commit('05/12/2026', '0026-05-12'), '2026-05-12')
    assert.equal(commit('5/12/0026', '0026-05-12'), null)
    assert.equal(commit('', '0026-05-12'), null)
    assert.equal(commit('7', '2026-05-12'), '2026-11-07')
  })

  it('leaves an empty field empty', () => {
    assert.equal(commit('', null), null)
    assert.equal(commit('  ', null), null)
  })

  it('compares untouched text in the field\'s own format', () => {
    assert.equal(commit('12.05.0026', '0026-05-12', 'DD.MM.YYYY'), '0026-05-12')
    assert.equal(commit('05/12/0026', '0026-05-12', 'DD.MM.YYYY'), null)
  })
})

describe('applyDateShortcut', () => {
  it('t is today, whatever the field held', () => {
    assert.equal(key('t', null), '2026-11-12')
    assert.equal(key('t', '1999-01-01'), '2026-11-12')
    assert.equal(key('T', '1999-01-01'), '2026-11-12')
  })

  it('works from today when the field is empty', () => {
    assert.equal(key('m', null), '2026-11-01')
    assert.equal(key('h', null), '2026-11-30')
    assert.equal(key('y', null), '2026-01-01')
    assert.equal(key('r', null), '2026-12-31')
    assert.equal(key('+', null), '2026-11-13')
    assert.equal(key('-', null), '2026-11-11')
  })

  it('m goes to the 1st, and from the 1st to the month before', () => {
    assert.equal(key('m', '2026-05-12'), '2026-05-01')
    assert.equal(key('m', '2026-05-01'), '2026-04-01')
    assert.equal(key('m', '2026-01-01'), '2025-12-01')
    assert.equal(key('M', '2026-05-12'), '2026-05-01')
  })

  it('h goes to the last day, and from the last day to the month after', () => {
    assert.equal(key('h', '2026-05-12'), '2026-05-31')
    assert.equal(key('h', '2026-05-31'), '2026-06-30')
    assert.equal(key('h', '2026-01-31'), '2026-02-28')
    assert.equal(key('h', '2028-01-31'), '2028-02-29')
    assert.equal(key('h', '2026-02-10'), '2026-02-28')
    assert.equal(key('h', '2028-02-10'), '2028-02-29')
    assert.equal(key('h', '2028-02-29'), '2028-03-31')
    assert.equal(key('h', '2026-12-31'), '2027-01-31')
    assert.equal(key('H', '2026-05-12'), '2026-05-31')
  })

  it('y goes to Jan 1, and from Jan 1 to the year before', () => {
    assert.equal(key('y', '2026-05-12'), '2026-01-01')
    assert.equal(key('y', '2026-01-01'), '2025-01-01')
    assert.equal(key('y', '2026-01-02'), '2026-01-01')
    assert.equal(key('Y', '2026-05-12'), '2026-01-01')
  })

  it('r goes to Dec 31, and from Dec 31 to the year after', () => {
    assert.equal(key('r', '2026-05-12'), '2026-12-31')
    assert.equal(key('r', '2026-12-31'), '2027-12-31')
    assert.equal(key('r', '2026-12-30'), '2026-12-31')
    assert.equal(key('R', '2026-05-12'), '2026-12-31')
  })

  it('pressing again keeps walking', () => {
    let at = d('2026-05-12')
    for (const k of ['h', 'h', 'h']) at = applyDateShortcut(k, at, TODAY)
    assert.equal(at?.toString(), '2026-07-31')
    for (const k of ['m', 'm']) at = applyDateShortcut(k, at, TODAY)
    assert.equal(at?.toString(), '2026-06-01')
  })

  it('+ and = add a day, - takes one away, across month and year ends', () => {
    assert.equal(key('+', '2026-05-12'), '2026-05-13')
    assert.equal(key('=', '2026-05-12'), '2026-05-13')
    assert.equal(key('-', '2026-05-12'), '2026-05-11')
    assert.equal(key('+', '2026-01-31'), '2026-02-01')
    assert.equal(key('+', '2026-02-28'), '2026-03-01')
    assert.equal(key('+', '2028-02-28'), '2028-02-29')
    assert.equal(key('+', '2028-02-29'), '2028-03-01')
    assert.equal(key('-', '2026-03-01'), '2026-02-28')
    assert.equal(key('-', '2028-03-01'), '2028-02-29')
    assert.equal(key('+', '2026-12-31'), '2027-01-01')
    assert.equal(key('-', '2027-01-01'), '2026-12-31')
  })

  // Past the ends the field can read back, a shortcut would show a date that the next blur clears.
  it('stops at the first and last day a field can read back', () => {
    assert.equal(key('+', '9999-12-31'), '9999-12-31')
    assert.equal(key('h', '9999-12-31'), '9999-12-31')
    assert.equal(key('r', '9999-12-31'), '9999-12-31')
    assert.equal(key('r', '9999-06-01'), '9999-12-31')
    assert.equal(key('-', '1000-01-01'), '1000-01-01')
    assert.equal(key('m', '1000-01-01'), '1000-01-01')
    assert.equal(key('y', '1000-01-01'), '1000-01-01')
    assert.equal(key('y', '1000-06-15'), '1000-01-01')
    // A field holding a day outside the range (set by code, not typed) is pulled back into it.
    assert.equal(key('+', '0999-12-30'), '1000-01-01')
  })

  it('every day a shortcut lands on reads back through the field', () => {
    for (const day of [FIRST_ENTRY_DATE, LAST_ENTRY_DATE])
      for (const k of ['m', 'h', 'y', 'r', '+', '-']) {
        const next = applyDateShortcut(k, day, TODAY)
        assert.equal(parseDateEntry(formatDateEntry(next), TODAY)?.toString(), next.toString(), `${k} from ${day}`)
      }
  })

  it('any other key is not a shortcut', () => {
    for (const k of ['a', '5', '/', 'Enter', 'Tab', 'ArrowDown', ' ', 'x'])
      assert.equal(key(k, '2026-05-12'), null, k)
  })
})

// The original cases end there. What follows is what the layer added: the format as a parameter.

describe('entryDay', () => {
  it('passes a day a field can read back, and refuses one it can\'t', () => {
    assert.equal(entryDay('2026-05-12'), '2026-05-12')
    assert.equal(entryDay('1000-01-01'), '1000-01-01')
    assert.equal(entryDay('0999-12-31'), null)
    assert.equal(entryDay(''), null)
    assert.equal(entryDay(null), null)
    assert.equal(entryDay(undefined), null)
  })

  // An import hands it whatever was in the cell: text that names no day is null, never a thrown error.
  it('is null for text that names no day, so one bad cell does not abort an import', () => {
    for (const bad of ['05/12/2026', 'garbage', '2026-02-30', '2026-13-01', '2026-05-12Z'])
      assert.equal(entryDay(bad), null, bad)
  })

  it('stores what Temporal reads as the canonical YYYY-MM-DD', () => {
    assert.equal(entryDay('20260512'), '2026-05-12')
    assert.equal(entryDay('2026-05-12T10:00'), '2026-05-12')
    assert.equal(entryDay('+002026-05-12'), '2026-05-12')
  })
})

describe('dateEntryFormat', () => {
  it('reads a pattern\'s order and separator', () => {
    assert.deepEqual({ ...dateEntryFormat('MM/DD/YYYY') }, { pattern: 'MM/DD/YYYY', order: 'MDY', separator: '/' })
    assert.deepEqual({ ...dateEntryFormat('DD.MM.YYYY') }, { pattern: 'DD.MM.YYYY', order: 'DMY', separator: '.' })
    assert.deepEqual({ ...dateEntryFormat('YYYY-MM-DD') }, { pattern: 'YYYY-MM-DD', order: 'YMD', separator: '-' })
    assert.equal(US_DATE_ENTRY.pattern, 'MM/DD/YYYY')
  })

  for (const bad of ['', 'MM/DD', 'MM/DD/YY', 'M/D/YYYY', 'MM/DD-YYYY', 'MMDDYYYY', 'MM DD YYYY', 'MMxDDxYYYY', 'MM1DD1YYYY', 'YYYY/DD/MM', 'MM/YYYY/DD', 'MM/MM/YYYY', 'mm/dd/yyyy'])
    it(`refuses ${JSON.stringify(bad)}`, () => assert.throws(() => dateEntryFormat(bad), RangeError))
})

describe('dateEntryFormatFor', () => {
  for (const [locale, pattern] of [
    ['en', 'MM/DD/YYYY'],
    ['en-US', 'MM/DD/YYYY'],
    ['en-GB', 'DD/MM/YYYY'],
    ['fr', 'DD/MM/YYYY'],
    ['de', 'DD.MM.YYYY'],
    ['nl', 'DD-MM-YYYY'],
    ['sv', 'YYYY-MM-DD'],
    ['en-CA', 'YYYY-MM-DD'],
    ['ja', 'YYYY/MM/DD'],
    ['ko', 'YYYY.MM.DD'],
  ]) {
    it(`${locale} → ${pattern}`, () => assert.equal(dateEntryFormatFor(locale).pattern, pattern))
  }
})

describe('other formats', () => {
  it('DD/MM/YYYY reads day before month, in every shape', () => {
    const f = 'DD/MM/YYYY'
    assert.equal(parse('12/5', TODAY, f), '2026-05-12')
    assert.equal(parse('12/5/26', TODAY, f), '2026-05-12')
    assert.equal(parse('12/05/2026', TODAY, f), '2026-05-12')
    assert.equal(parse('1205', TODAY, f), '2026-05-12')
    assert.equal(parse('120526', TODAY, f), '2026-05-12')
    assert.equal(parse('5', TODAY, f), '2026-11-05')
    assert.equal(parse('5/13', TODAY, f), null) // no 13th month
    assert.equal(parse('31/4/2026', TODAY, f), null)
    assert.equal(formatDateEntry(d('2026-05-02'), f), '02/05/2026')
  })

  it('DD.MM.YYYY takes only its own separator', () => {
    const f = 'DD.MM.YYYY'
    assert.equal(parse('12.5.2026', TODAY, f), '2026-05-12')
    assert.equal(parse('12.5', TODAY, f), '2026-05-12')
    assert.equal(parse('12/5/2026', TODAY, f), null)
    assert.equal(formatDateEntry(d('2026-05-02'), f), '02.05.2026')
  })

  it('YYYY-MM-DD reads the year first, and a two-part entry as month and day', () => {
    const f = 'YYYY-MM-DD'
    assert.equal(parse('2026-05-12', TODAY, f), '2026-05-12')
    assert.equal(parse('26-5-12', TODAY, f), '2026-05-12')
    assert.equal(parse('5-12', TODAY, f), '2026-05-12')
    assert.equal(parse('0512', TODAY, f), '2026-05-12')
    assert.equal(parse('260512', TODAY, f), '2026-05-12')
    assert.equal(parse('470512', TODAY, f), '1947-05-12')
    assert.equal(parse('0026-05-12', TODAY, f), null)
    assert.equal(parse('5/12', TODAY, f), null)
    assert.equal(formatDateEntry(d('2026-05-02'), f), '2026-05-02')
  })

  it('every format reads back what it writes', () => {
    for (const f of ['MM/DD/YYYY', 'DD/MM/YYYY', 'DD.MM.YYYY', 'YYYY-MM-DD', 'YYYY/MM/DD', 'DD-MM-YYYY'])
      for (const s of ['2026-05-02', '1999-12-31', '2028-02-29', '1000-01-01', '9999-12-31'])
        assert.equal(parseDateEntry(formatDateEntry(d(s), f), TODAY, f)?.toString(), s, `${s} in ${f}`)
  })

  it('a separator that is also a shortcut types as the separator; _ is the day before instead', () => {
    assert.equal(key('-', '2026-05-12', TODAY, 'YYYY-MM-DD'), null)
    assert.equal(key('_', '2026-05-12', TODAY, 'YYYY-MM-DD'), '2026-05-11')
    assert.equal(key('+', '2026-05-12', TODAY, 'YYYY-MM-DD'), '2026-05-13')
    assert.equal(key('_', '2026-05-12'), '2026-05-11')
    assert.equal(key('.', '2026-05-12', TODAY, 'DD.MM.YYYY'), null)
  })
})
