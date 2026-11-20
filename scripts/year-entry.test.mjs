// The year-entry parser behind <ZYearField> (packages/nuxt/utils/year-entry.ts): typing, committing, the shortcut keys
// and the limits.
// Run: node --test 'scripts/*.test.mjs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  applyYearShortcut,
  checkYearLimits,
  commitYearEntry,
  formatYearEntry,
  isYearShortcut,
  parseYearEntry,
  yearLimitMessage,
} from '../packages/nuxt/utils/year-entry.ts'
import { FIRST_ENTRY_DATE } from '../packages/nuxt/utils/date-entry.ts'

const PlainDate = FIRST_ENTRY_DATE.constructor
const TODAY = PlainDate.from('2026-11-12')

describe('parseYearEntry', () => {
  for (const [text, expected] of [
    ['2026', 2026],
    [' 2026 ', 2026],
    ['1999', 1999],
    ['1000', 1000],
    ['9999', 9999],
    ['26', 2026],
    ['46', 2046],
    ['47', 1947],
    ['6', 2006],
    ['', null],
    ['0', null],
    ['00', null],
    ['0000', null],
    ['999', null],
    ['0999', null],
    ['20260', null],
    ['abc', null],
    ['20a6', null],
    ['-2026', null],
    ['2026.5', null],
  ]) {
    it(`"${text}" → ${expected}`, () => assert.equal(parseYearEntry(text, TODAY), expected))
  }
})

describe('formatYearEntry and commitYearEntry', () => {
  it('writes four digits, empty for none', () => {
    assert.equal(formatYearEntry(2026), '2026')
    assert.equal(formatYearEntry(null), '')
    assert.equal(formatYearEntry(undefined), '')
  })
  it('keeps the year while the text is untouched; bad text and blank clear it', () => {
    assert.equal(commitYearEntry('2026', 2026, TODAY), 2026)
    assert.equal(commitYearEntry('27', 2026, TODAY), 2027)
    assert.equal(commitYearEntry('abc', 2026, TODAY), null)
    assert.equal(commitYearEntry('', 2026, TODAY), null)
    // A stored year it couldn't read back survives passing through untouched.
    assert.equal(commitYearEntry('0500', 500, TODAY), 500)
  })
})

describe('applyYearShortcut', () => {
  const key = (k, current, limits) => applyYearShortcut(k, current, TODAY, limits)
  it('t is this year', () => {
    assert.equal(key('t', null), 2026)
    assert.equal(key('T', 1999), 2026)
  })
  it('y, - and _ are the year before; r, + and = the year after', () => {
    for (const k of ['y', 'Y', '-', '_']) assert.equal(key(k, 2020), 2019, k)
    for (const k of ['r', 'R', '+', '=']) assert.equal(key(k, 2020), 2021, k)
  })
  it('with no year, steps from this year', () => {
    assert.equal(key('y', null), 2025)
    assert.equal(key('r', null), 2027)
  })
  it('other keys are not shortcuts', () => {
    for (const k of ['m', 'h', '5', 'a']) {
      assert.equal(isYearShortcut(k), false, k)
      assert.equal(key(k, 2020), null, k)
    }
  })
  it('stops at 1000 and 9999, and at the limits, t included', () => {
    assert.equal(key('y', 1000), 1000)
    assert.equal(key('r', 9999), 9999)
    const limits = { minValue: 2020, maxValue: 2024 }
    assert.equal(key('y', 2020, limits), 2020)
    assert.equal(key('r', 2024, limits), 2024)
    assert.equal(key('t', null, limits), 2024)
    assert.equal(key('r', 2010, limits), 2020)
    assert.equal(key('t', null, { minValue: 2030, maxValue: 2020 }), null)
  })
})

describe('limits', () => {
  const limits = { minValue: 2020, maxValue: 2030 }
  it('checks before the first and after the last', () => {
    assert.equal(checkYearLimits(2025, limits), null)
    assert.equal(checkYearLimits(2020, limits), null)
    assert.equal(checkYearLimits(2030, limits), null)
    assert.deepEqual(checkYearLimits(2019, limits), { reason: 'before-min', date: 2019, limit: 2020 })
    assert.deepEqual(checkYearLimits(2031, limits), { reason: 'after-max', date: 2031, limit: 2030 })
    assert.equal(checkYearLimits(1500), null)
  })
  it('words the refusal', () => {
    assert.equal(yearLimitMessage(checkYearLimits(2019, limits)), 'Choose a year on or after 2020.')
    assert.equal(yearLimitMessage(checkYearLimits(2031, limits)), 'Choose a year on or before 2030.')
  })
})
