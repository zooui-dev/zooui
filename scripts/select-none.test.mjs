// The select "none" sentinel (packages/nuxt/utils/select-none.ts).
// Node strips the TypeScript itself (Node 22.18+, 23.6+), so the layer's source is what runs.
// Run: node --test 'scripts/*.test.mjs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { emptyToSelectNone, SELECT_NONE, selectNoneToNull, selectNoneToUndefined } from '../packages/nuxt/utils/select-none.ts'

describe('SELECT_NONE', () => {
  it('is a non-empty string: reka-ui throws on a SelectItem whose value is ""', () => {
    assert.equal(typeof SELECT_NONE, 'string')
    assert.notEqual(SELECT_NONE, '')
  })
})

describe('selectNoneToUndefined', () => {
  it('turns the sentinel, an empty string, null and undefined into undefined', () => {
    for (const v of [SELECT_NONE, '', null, undefined]) assert.equal(selectNoneToUndefined(v), undefined)
  })
  it('passes a real value through', () => {
    assert.equal(selectNoneToUndefined('3f2a'), '3f2a')
  })
})

describe('selectNoneToNull', () => {
  it('turns the sentinel, an empty string, null and undefined into null', () => {
    for (const v of [SELECT_NONE, '', null, undefined]) assert.equal(selectNoneToNull(v), null)
  })
  it('passes a real value through', () => {
    assert.equal(selectNoneToNull('3f2a'), '3f2a')
  })
})

describe('emptyToSelectNone', () => {
  it('shows the none option for an absent value', () => {
    for (const v of ['', null, undefined]) assert.equal(emptyToSelectNone(v), SELECT_NONE)
  })
  it('keeps a real value, and the sentinel itself', () => {
    assert.equal(emptyToSelectNone('3f2a'), '3f2a')
    assert.equal(emptyToSelectNone(SELECT_NONE), SELECT_NONE)
  })
  it('round-trips: what the box shows for an absent value is sent as nothing', () => {
    assert.equal(selectNoneToUndefined(emptyToSelectNone(null)), undefined)
    assert.equal(selectNoneToNull(emptyToSelectNone(undefined)), null)
  })
})
