// The month-entry parser behind <ZMonthField> (packages/nuxt/utils/month-entry.ts): typing in each order, the
// shortcut keys, the limits, the two model types, and the month-of-year items for a USelect.
// Run: node --test 'scripts/*.test.mjs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

import {
  applyMonthShortcut,
  checkMonthLimits,
  commitMonthEntry,
  FIRST_ENTRY_MONTH,
  formatMonthEntry,
  fromPlainYearMonth,
  isMonthShortcut,
  LAST_ENTRY_MONTH,
  monthEntryFormat,
  monthEntryFormatFor,
  monthLimitMessage,
  monthModelTypeOf,
  monthOfYearItems,
  parseMonthEntry,
  toPlainYearMonth,
  US_MONTH_ENTRY,
} from '../packages/nuxt/utils/month-entry.ts'
import { FIRST_ENTRY_DATE } from '../packages/nuxt/utils/date-entry.ts'

const intl = createRequire(new URL('../packages/nuxt/package.json', import.meta.url))('@internationalized/date')

const PlainDate = FIRST_ENTRY_DATE.constructor
const PlainYearMonth = FIRST_ENTRY_MONTH.constructor
const m = (s) => PlainYearMonth.from(s)
const TODAY = PlainDate.from('2026-11-12')
const parse = (text, format, today = TODAY) => parseMonthEntry(text, today, format)?.toString() ?? null
const key = (k, current, format, limits, today = TODAY) =>
  applyMonthShortcut(k, current ? m(current) : null, today, format, limits)?.toString() ?? null

describe('parseMonthEntry, MM/YYYY (the default)', () => {
  for (const [text, expected] of [
    ['5/26', '2026-05'],
    ['05/26', '2026-05'],
    ['5/2026', '2026-05'],
    ['05/2026', '2026-05'],
    ['12/2026', '2026-12'],
    ['  05/2026 ', '2026-05'],
    // Two-digit years read as ZDateField reads them: within 20 years ahead, 79 behind.
    ['5/46', '2046-05'],
    ['5/47', '1947-05'],
    ['5/6', '2006-05'],
    // Years before 2000 are years.
    ['5/1999', '1999-05'],
    ['1/1000', '1000-01'],
    // A four-digit part is the year wherever it's written, and ISO's YYYY-MM reads in any format.
    ['2026/5', '2026-05'],
    ['2026-05', '2026-05'],
    ['2026-5', '2026-05'],
    // Six digits: MMYYYY.
    ['052026', '2026-05'],
    // A month alone is this year's; a year alone is its December.
    ['5', '2026-05'],
    ['12', '2026-12'],
    ['2026', '2026-12'],
    ['1999', '1999-12'],
    // Not a month.
    ['', null],
    ['   ', null],
    ['0', null],
    ['13', null],
    ['0/2026', null],
    ['00/2026', null],
    ['13/2026', null],
    ['5/0', null],
    ['5/00', null],
    ['5/0000', null],
    ['5/999', null], // three digits are no year
    ['5/0999', null], // before 1000
    ['0999', null],
    ['5/', null],
    ['/2026', null],
    ['5/5/2026', null],
    ['5.2026', null], // not this format's separator
    ['may 2026', null],
    ['2026-13', null],
    ['202605', null], // MMYYYY: month 20
    ['526', null],
    ['52026', null],
  ]) {
    it(`"${text}" → ${expected}`, () => assert.equal(parse(text), expected))
  }
})

describe('parseMonthEntry in other orders', () => {
  it('YYYY-MM: two short parts read year first, six digits are YYYYMM', () => {
    assert.equal(parse('26-5', 'YYYY-MM'), '2026-05')
    assert.equal(parse('2026-05', 'YYYY-MM'), '2026-05')
    assert.equal(parse('05-2026', 'YYYY-MM'), '2026-05')
    assert.equal(parse('202605', 'YYYY-MM'), '2026-05')
    assert.equal(parse('052026', 'YYYY-MM'), null)
    assert.equal(parse('5', 'YYYY-MM'), '2026-05')
    assert.equal(parse('2026', 'YYYY-MM'), '2026-12')
  })
  it('MM.YYYY reads its own separator, and ISO', () => {
    assert.equal(parse('5.26', 'MM.YYYY'), '2026-05')
    assert.equal(parse('05.2026', 'MM.YYYY'), '2026-05')
    assert.equal(parse('5/26', 'MM.YYYY'), null)
    assert.equal(parse('2026-05', 'MM.YYYY'), '2026-05')
  })
  it('a format object works as well as its pattern', () => {
    assert.equal(parse('5/26', US_MONTH_ENTRY), '2026-05')
  })
})

describe('monthEntryFormat and monthEntryFormatFor', () => {
  it('reads MM and YYYY in either order', () => {
    assert.deepEqual({ ...monthEntryFormat('MM/YYYY') }, { pattern: 'MM/YYYY', order: 'MY', separator: '/' })
    assert.deepEqual({ ...monthEntryFormat('YYYY-MM') }, { pattern: 'YYYY-MM', order: 'YM', separator: '-' })
  })
  for (const bad of ['MM/DD/YYYY', 'MMYYYY', 'MM YYYY', 'MM/MM', 'YYYY/YYYY', 'M/YYYY', 'MMaYYYY']) {
    it(`refuses "${bad}"`, () => assert.throws(() => monthEntryFormat(bad), RangeError))
  }
  for (const [locale, pattern] of [['en', 'MM/YYYY'], ['en-US', 'MM/YYYY'], ['en-GB', 'MM/YYYY'], ['de', 'MM.YYYY'], ['sv', 'YYYY-MM'], ['ja', 'YYYY/MM']]) {
    it(`${locale} → ${pattern}`, () => assert.equal(monthEntryFormatFor(locale).pattern, pattern))
  }
})

describe('formatMonthEntry and commitMonthEntry', () => {
  it('writes the month zero-padded in the format, and reads it back', () => {
    assert.equal(formatMonthEntry(m('2026-05')), '05/2026')
    assert.equal(formatMonthEntry(m('2026-05'), 'YYYY-MM'), '2026-05')
    assert.equal(formatMonthEntry(m('2026-05'), 'MM.YYYY'), '05.2026')
    assert.equal(formatMonthEntry(null), '')
    for (const f of ['MM/YYYY', 'YYYY-MM', 'MM.YYYY']) assert.equal(parse(formatMonthEntry(m('1999-01'), f), f), '1999-01')
  })
  it('keeps the month while the text is untouched, reads it when edited, and clears for junk or blank', () => {
    const current = m('2026-05')
    assert.equal(commitMonthEntry('05/2026', current, TODAY), current)
    assert.equal(commitMonthEntry('6/26', current, TODAY).toString(), '2026-06')
    assert.equal(commitMonthEntry('junk', current, TODAY), null)
    assert.equal(commitMonthEntry('', current, TODAY), null)
  })
})

describe('applyMonthShortcut', () => {
  it('t is this month, from anywhere', () => {
    assert.equal(key('t', null), '2026-11')
    assert.equal(key('t', '1999-03'), '2026-11')
    assert.equal(key('T', '1999-03'), '2026-11')
  })
  it('y and r step a year, keeping the month', () => {
    assert.equal(key('y', '2026-05'), '2025-05')
    assert.equal(key('r', '2026-05'), '2027-05')
    assert.equal(key('Y', '2026-05'), '2025-05')
    assert.equal(key('R', '2026-05'), '2027-05')
  })
  it('m, - and _ step a month back; h, + and = a month on, across the year', () => {
    for (const k of ['m', 'M', '-', '_']) assert.equal(key(k, '2026-01'), '2025-12', k)
    for (const k of ['h', 'H', '+', '=']) assert.equal(key(k, '2026-12'), '2027-01', k)
  })
  it('with no month, steps from this month', () => {
    assert.equal(key('m', null), '2026-10')
    assert.equal(key('h', null), '2026-12')
    assert.equal(key('y', null), '2025-11')
  })
  it('in YYYY-MM, - types a dash and _ is the month before', () => {
    assert.equal(isMonthShortcut('-', 'YYYY-MM'), false)
    assert.equal(key('-', '2026-05', 'YYYY-MM'), null)
    assert.equal(key('_', '2026-05', 'YYYY-MM'), '2026-04')
    assert.equal(isMonthShortcut('-'), true)
  })
  it('other keys are not shortcuts', () => {
    for (const k of ['a', '5', '/', 'd', 'Enter']) {
      assert.equal(isMonthShortcut(k), false, k)
      assert.equal(key(k, '2026-05'), null, k)
    }
  })
  it('stops at the first and last months a field can show', () => {
    assert.equal(key('m', FIRST_ENTRY_MONTH.toString()), '1000-01')
    assert.equal(key('h', LAST_ENTRY_MONTH.toString()), '9999-12')
    assert.equal(key('r', '9999-05'), '9999-12')
  })
  it('stops at the limits, t included; null when they leave no month', () => {
    const limits = { minValue: m('2026-03'), maxValue: new intl.CalendarDate(2026, 8, 20) }
    assert.equal(key('m', '2026-03', undefined, limits), '2026-03')
    assert.equal(key('h', '2026-08', undefined, limits), '2026-08')
    assert.equal(key('y', '2026-05', undefined, limits), '2026-03')
    assert.equal(key('r', '2026-05', undefined, limits), '2026-08')
    assert.equal(key('t', null, undefined, limits), '2026-08') // today, November, is after the last
    assert.equal(key('h', '2026-05', undefined, limits), '2026-06')
    assert.equal(key('t', null, undefined, { minValue: m('2027-01'), maxValue: m('2026-01') }), null)
  })
})

describe('limits', () => {
  const limits = { minValue: m('2026-03'), maxValue: m('2026-08') }
  it('checks before the first and after the last', () => {
    assert.equal(checkMonthLimits(m('2026-05'), limits), null)
    assert.equal(checkMonthLimits(m('2026-03'), limits), null)
    assert.equal(checkMonthLimits(m('2026-08'), limits), null)
    const before = checkMonthLimits(m('2026-02'), limits)
    assert.equal(before.reason, 'before-min')
    assert.equal(before.limit.toString(), '2026-03')
    assert.equal(checkMonthLimits(m('2026-09'), limits).reason, 'after-max')
  })
  it('words the refusal in the format', () => {
    assert.equal(monthLimitMessage(checkMonthLimits(m('2026-02'), limits)), 'Choose a month on or after 03/2026.')
    assert.equal(monthLimitMessage(checkMonthLimits(m('2026-09'), limits), 'YYYY-MM'), 'Choose a month on or before 2026-08.')
  })
})

describe('the two month types', () => {
  it('tells them apart', () => {
    assert.equal(monthModelTypeOf(m('2026-05')), 'plain-year-month')
    assert.equal(monthModelTypeOf(new intl.CalendarDate(2026, 5, 12)), 'calendar-date')
    assert.equal(monthModelTypeOf(PlainDate.from('2026-05-12')), null)
    assert.equal(monthModelTypeOf(null), null)
  })
  it('reads a CalendarDate as its month, and builds one on the first with the caller\'s class', () => {
    assert.equal(toPlainYearMonth(new intl.CalendarDate(2026, 5, 12)).toString(), '2026-05')
    const like = new intl.CalendarDate(2020, 1, 1)
    const back = fromPlainYearMonth(m('2026-05'), 'calendar-date', like)
    assert.ok(back instanceof intl.CalendarDate)
    assert.equal(back.toString(), '2026-05-01')
    assert.equal(fromPlainYearMonth(m('2026-05'), 'plain-year-month').toString(), '2026-05')
    assert.equal(fromPlainYearMonth(null, 'calendar-date'), null)
  })
  it('refuses another calendar and anything else', () => {
    const japanese = intl.toCalendar(new intl.CalendarDate(2026, 5, 12), new intl.JapaneseCalendar())
    assert.throws(() => toPlainYearMonth(japanese), RangeError)
    assert.throws(() => toPlainYearMonth('2026-05'), TypeError)
  })
})

describe('monthOfYearItems', () => {
  it('names the twelve months in the locale, valued 1 to 12', () => {
    const items = monthOfYearItems()
    assert.equal(items.length, 12)
    assert.deepEqual(items[0], { label: 'January', value: 1 })
    assert.deepEqual(items[11], { label: 'December', value: 12 })
    assert.equal(monthOfYearItems('de')[2].label, 'März')
    assert.equal(monthOfYearItems('en', { month: 'short' })[8].label, 'Sep')
  })
  it('numbered puts the number first', () => {
    assert.deepEqual(monthOfYearItems('en', { numbered: true })[9], { label: '10 - October', value: 10 })
  })
})
