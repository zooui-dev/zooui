// ZRepeatingList's reordering (packages/nuxt/components/reorder.ts): where each move takes a row, and that it does
// nothing at the edge; which keys ask for a move; and that a move keeps the same row objects.
// Node strips the TypeScript itself (Node 22.18+, 23.6+), so the layer's source is what runs.
// Run: node --test 'scripts/*.test.mjs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { moved, moveForKey, moveTarget } from '../packages/nuxt/components/reorder.ts'

describe('moveTarget', () => {
  it('moves one place, or to either end', () => {
    assert.equal(moveTarget('up', 2, 5), 1)
    assert.equal(moveTarget('down', 2, 5), 3)
    assert.equal(moveTarget('top', 2, 5), 0)
    assert.equal(moveTarget('bottom', 2, 5), 4)
  })

  it('is null at the edge the move goes toward: nowhere to move to', () => {
    assert.equal(moveTarget('up', 0, 5), null)
    assert.equal(moveTarget('top', 0, 5), null)
    assert.equal(moveTarget('down', 4, 5), null)
    assert.equal(moveTarget('bottom', 4, 5), null)
    // The other way from an edge is fine.
    assert.equal(moveTarget('down', 0, 5), 1)
    assert.equal(moveTarget('up', 4, 5), 3)
  })

  it('is null for a single row, and for an index outside the list', () => {
    for (const m of ['up', 'down', 'top', 'bottom']) assert.equal(moveTarget(m, 0, 1), null)
    assert.equal(moveTarget('up', 5, 5), null)
    assert.equal(moveTarget('down', -1, 5), null)
  })
})

describe('moveForKey', () => {
  const key = (k, mods = {}) => ({ key: k, altKey: false, shiftKey: false, ctrlKey: false, metaKey: false, ...mods })

  it('Alt+ArrowUp and Alt+ArrowDown move one place', () => {
    assert.equal(moveForKey(key('ArrowUp', { altKey: true })), 'up')
    assert.equal(moveForKey(key('ArrowDown', { altKey: true })), 'down')
  })

  it('Alt+Home and Alt+End, or Alt+Shift+ArrowUp and Alt+Shift+ArrowDown, move to the ends', () => {
    assert.equal(moveForKey(key('Home', { altKey: true })), 'top')
    assert.equal(moveForKey(key('End', { altKey: true })), 'bottom')
    assert.equal(moveForKey(key('ArrowUp', { altKey: true, shiftKey: true })), 'top')
    assert.equal(moveForKey(key('ArrowDown', { altKey: true, shiftKey: true })), 'bottom')
  })

  it('leaves every other key alone: no Alt, Ctrl or Meta as well, other keys', () => {
    assert.equal(moveForKey(key('ArrowUp')), null)
    assert.equal(moveForKey(key('Home')), null)
    assert.equal(moveForKey(key('ArrowUp', { altKey: true, ctrlKey: true })), null)
    assert.equal(moveForKey(key('ArrowDown', { altKey: true, metaKey: true })), null)
    assert.equal(moveForKey(key('Home', { altKey: true, shiftKey: true })), null)
    assert.equal(moveForKey(key('ArrowLeft', { altKey: true })), null)
  })
})

describe('moved', () => {
  const a = { n: 'a' }, b = { n: 'b' }, c = { n: 'c' }, d = { n: 'd' }

  it('moves an item up, down and to either end, in a new array', () => {
    const list = [a, b, c, d]
    assert.deepEqual(moved(list, 2, 1), [a, c, b, d])
    assert.deepEqual(moved(list, 1, 2), [a, c, b, d])
    assert.deepEqual(moved(list, 2, 0), [c, a, b, d])
    assert.deepEqual(moved(list, 1, 3), [a, c, d, b])
    assert.notEqual(moved(list, 0, 1), list)
    assert.deepEqual(list, [a, b, c, d], 'the list it was given is unchanged')
  })

  it('keeps the same objects, not copies: a row keeps its identity', () => {
    const next = moved([a, b, c], 0, 2)
    assert.equal(next[2], a)
    assert.equal(next[0], b)
  })
})
