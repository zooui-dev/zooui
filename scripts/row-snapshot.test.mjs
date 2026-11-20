// ZRepeatingList's Cancel (packages/nuxt/components/row-snapshot.ts): the copy taken when a row opens is a copy, not
// the row, and putting it back restores the row's fields, nested ones included, into the same objects.
// Node strips the TypeScript itself (Node 22.18+, 23.6+), so the layer's source is what runs.
// Run: node --test 'scripts/*.test.mjs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { restore, snapshot } from '../packages/nuxt/components/row-snapshot.ts'

describe('snapshot', () => {
  it('copies plain objects and arrays all the way down', () => {
    const row = { name: 'Draft', details: { owner: 'Ana', tags: ['a', 'b'] } }
    const snap = snapshot(row)
    assert.deepEqual(snap, row)
    assert.notEqual(snap, row)
    assert.notEqual(snap.details, row.details)
    assert.notEqual(snap.details.tags, row.details.tags)
  })

  it('keeps anything else by reference: a Date, a class instance', () => {
    class Money { constructor(cents) { this.cents = cents } }
    const due = new Date(2026, 0, 1), fee = new Money(500)
    const snap = snapshot({ due, fee })
    assert.equal(snap.due, due)
    assert.equal(snap.fee, fee)
  })
})

describe('restore', () => {
  it('puts the fields back into the same object, nested objects and arrays included', () => {
    const row = { name: 'Draft', details: { owner: 'Ana', tags: ['a', 'b'] } }
    const details = row.details, tags = row.details.tags
    const snap = snapshot(row)
    row.name = 'Changed'
    row.details.owner = 'Zed'
    row.details.tags.push('c')
    row.added = 'new field'

    assert.equal(restore(row, snap), row)
    assert.deepEqual(row, { name: 'Draft', details: { owner: 'Ana', tags: ['a', 'b'] } })
    assert.equal(row.details, details, 'the nested object keeps its identity')
    assert.equal(row.details.tags, tags, 'the nested array keeps its identity')
    assert.ok(!('added' in row), 'a field added since is removed')
  })

  it('a nested object replaced while editing is put back as a copy of the snapshot', () => {
    const row = { details: { owner: 'Ana' } }
    const snap = snapshot(row)
    row.details = null
    restore(row, snap)
    assert.deepEqual(row.details, { owner: 'Ana' })
    assert.notEqual(row.details, snap.details, 'not the snapshot itself, so a second Cancel still has it')
  })

  it('a value replaced while editing (a Date) goes back to the one it held', () => {
    const was = new Date(2026, 0, 1)
    const row = { due: was }
    const snap = snapshot(row)
    row.due = new Date(2027, 0, 1)
    restore(row, snap)
    assert.equal(row.due, was)
  })
})
