// ZOrderList's ordering (packages/nuxt/utils/order-list.ts): where each move goes, the array after it, and typeahead.
// Node strips the TypeScript itself (Node 22.18+, 23.6+), so the layer's source is what runs.
// Run: node --test 'scripts/*.test.mjs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { moveItem, moveTarget, typeaheadIndex } from '../packages/nuxt/utils/order-list.ts'

describe('moveTarget', () => {
  it('takes a middle row to each end and one step either way', () => {
    assert.equal(moveTarget(2, 5, 'top'), 0)
    assert.equal(moveTarget(2, 5, 'up'), 1)
    assert.equal(moveTarget(2, 5, 'down'), 3)
    assert.equal(moveTarget(2, 5, 'bottom'), 4)
  })
  it('one row from an end, a step and a jump land on the same place', () => {
    assert.equal(moveTarget(1, 5, 'up'), 0)
    assert.equal(moveTarget(1, 5, 'top'), 0)
    assert.equal(moveTarget(3, 5, 'down'), 4)
    assert.equal(moveTarget(3, 5, 'bottom'), 4)
  })
  it('the first row has nowhere to go up, the last nowhere to go down', () => {
    assert.equal(moveTarget(0, 5, 'top'), null)
    assert.equal(moveTarget(0, 5, 'up'), null)
    assert.equal(moveTarget(0, 5, 'down'), 1)
    assert.equal(moveTarget(4, 5, 'down'), null)
    assert.equal(moveTarget(4, 5, 'bottom'), null)
    assert.equal(moveTarget(4, 5, 'up'), 3)
  })
  it('a single row cannot move at all', () => {
    for (const m of ['top', 'up', 'down', 'bottom']) assert.equal(moveTarget(0, 1, m), null)
  })
  it('no row (nothing selected, or a stale index) cannot move', () => {
    for (const i of [-1, 5, 7, 1.5, NaN]) {
      for (const m of ['top', 'up', 'down', 'bottom']) assert.equal(moveTarget(i, 5, m), null, `${i} ${m}`)
    }
    assert.equal(moveTarget(0, 0, 'down'), null)
  })
})

describe('moveItem', () => {
  const a = { id: 'a' }, b = { id: 'b' }, c = { id: 'c' }, d = { id: 'd' }
  it('moves down and up, keeping every other item in order', () => {
    assert.deepEqual(moveItem([a, b, c, d], 0, 2), [b, c, a, d])
    assert.deepEqual(moveItem([a, b, c, d], 3, 1), [a, d, b, c])
    assert.deepEqual(moveItem([a, b, c, d], 1, 0), [b, a, c, d])
    assert.deepEqual(moveItem([a, b, c, d], 2, 3), [a, b, d, c])
  })
  it('returns a new array of the same objects, and leaves the original alone', () => {
    const items = [a, b, c]
    const next = moveItem(items, 0, 2)
    assert.notEqual(next, items)
    assert.deepEqual(items, [a, b, c])
    assert.equal(next[2], a)
    assert.equal(next.length, 3)
  })
  it('agrees with moveTarget for every row and move', () => {
    const items = [a, b, c, d]
    for (let i = 0; i < items.length; i++) {
      for (const m of ['top', 'up', 'down', 'bottom']) {
        const to = moveTarget(i, items.length, m)
        if (to === null) continue
        const next = moveItem(items, i, to)
        assert.equal(next.indexOf(items[i]), to, `${i} ${m}`)
        assert.deepEqual([...next].sort((x, y) => x.id.localeCompare(y.id)), items)
      }
    }
  })
})

describe('typeaheadIndex', () => {
  const titles = ['Open', 'In progress', 'Review', 'Ready', 'Done', 'Résumé sent']
  it('finds the first title with the prefix, ignoring case', () => {
    assert.equal(typeaheadIndex(titles, 'd', -1), 4)
    assert.equal(typeaheadIndex(titles, 'IN', -1), 1)
  })
  it('one letter again moves on to the next match, wrapping', () => {
    assert.equal(typeaheadIndex(titles, 'r', -1), 2)
    assert.equal(typeaheadIndex(titles, 'r', 2), 3)
    assert.equal(typeaheadIndex(titles, 'rr', 3), 5)
    assert.equal(typeaheadIndex(titles, 'rrr', 5), 2)
  })
  it('a longer prefix keeps the row it is on while that row still matches', () => {
    assert.equal(typeaheadIndex(titles, 're', 2), 2)
    assert.equal(typeaheadIndex(titles, 'rea', 2), 3)
  })
  it('ignores accents and a leading space', () => {
    assert.equal(typeaheadIndex(titles, 'resu', -1), 5)
    assert.equal(typeaheadIndex([' Spaced'], 's', -1), 0)
  })
  it('-1 for no match, an empty query or no rows', () => {
    assert.equal(typeaheadIndex(titles, 'x', 0), -1)
    assert.equal(typeaheadIndex(titles, '', 0), -1)
    assert.equal(typeaheadIndex([], 'a', -1), -1)
  })
})
