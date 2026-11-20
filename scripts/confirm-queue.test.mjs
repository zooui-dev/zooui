// The queue behind useConfirm() and <ZConfirmDialog> (packages/nuxt/utils/confirm-queue.ts): one request asked at a
// time, a second call queues behind the first rather than replacing it, each promise settles exactly once with its own
// answer, and a stale answer (for a dialog that has gone) cannot settle the next one.
// Node strips the TypeScript itself (Node 22.18+, 23.6+), so the layer's source is what runs.
// Run: node --test 'scripts/*.test.mjs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { createConfirmQueue } from '../packages/nuxt/utils/confirm-queue.ts'

/** A promise's state without waiting on it: 'pending', or { value }. Every check below goes through it, so a broken
 *  queue that never settles a promise fails the test rather than hanging the run. */
async function state(promise) {
  const pending = Symbol('pending')
  // a macrotask later, so a promise settled through a chain of microtasks has settled
  const value = await Promise.race([promise, new Promise((resolve) => setImmediate(() => resolve(pending)))])
  return value === pending ? 'pending' : { value }
}

describe('createConfirmQueue', () => {
  it('starts empty', () => {
    const q = createConfirmQueue()
    assert.equal(q.current, undefined)
    assert.equal(q.waiting, 0)
  })

  it('answers a request with the value given', async () => {
    const q = createConfirmQueue()
    const asked = q.ask({ title: 'Delete?' }, false)
    assert.deepEqual(q.current?.request, { title: 'Delete?' })
    q.answer(q.current.id, true)
    assert.deepEqual(await state(asked), { value: true })
    assert.equal(q.current, undefined)
  })

  it('dismisses a request with its own dismissed value', async () => {
    const q = createConfirmQueue()
    const confirm = q.ask('confirm', false)
    q.dismiss(q.current.id)
    assert.deepEqual(await state(confirm), { value: false })
    const choose = q.ask('choose', null)
    q.dismiss(q.current.id)
    assert.deepEqual(await state(choose), { value: null })
  })

  it('queues a second call behind the first rather than replacing it', async () => {
    const q = createConfirmQueue()
    const first = q.ask('first', false)
    const second = q.ask('second', false)
    assert.equal(q.current.request, 'first')
    assert.equal(q.waiting, 1)
    assert.equal(await state(second), 'pending')

    q.answer(q.current.id, true)
    assert.deepEqual(await state(first), { value: true })
    assert.equal(q.current.request, 'second')
    assert.equal(await state(second), 'pending')

    q.dismiss(q.current.id)
    assert.deepEqual(await state(second), { value: false })
    assert.equal(q.current, undefined)
  })

  it('ignores an answer for a request that is no longer current', async () => {
    const q = createConfirmQueue()
    const first = q.ask('first', false)
    const firstId = q.current.id
    const second = q.ask('second', false)
    q.answer(firstId, true)
    q.answer(firstId, true) // a late click on the closing dialog
    q.dismiss(firstId)
    assert.deepEqual(await state(first), { value: true })
    assert.equal(q.current.request, 'second')
    assert.equal(await state(second), 'pending')
  })

  it('settles each promise exactly once', async () => {
    const q = createConfirmQueue()
    const asked = q.ask('once', 'no')
    const id = q.current.id
    q.answer(id, 'yes')
    q.dismiss(id)
    q.dismissAll()
    assert.deepEqual(await state(asked), { value: 'yes' })
  })

  it('dismissAll settles every request with its own dismissed value, in order', async () => {
    const q = createConfirmQueue()
    const order = []
    const a = q.ask('a', false).then((v) => { order.push('a'); return v })
    const b = q.ask('b', null).then((v) => { order.push('b'); return v })
    q.dismissAll()
    assert.deepEqual(await state(Promise.all([a, b])), { value: [false, null] })
    assert.deepEqual(order, ['a', 'b'])
    assert.equal(q.current, undefined)
  })

  it('tells subscribers when the current request changes, not when one joins the line behind it', () => {
    const q = createConfirmQueue()
    let calls = 0
    const stop = q.subscribe(() => { calls++ })
    q.ask('first', false)
    assert.equal(calls, 1)
    q.ask('second', false)
    assert.equal(calls, 1)
    q.answer(q.current.id, true)
    assert.equal(calls, 2)
    stop()
    q.answer(q.current.id, true)
    assert.equal(calls, 2)
  })

  it('gives each request its own id', () => {
    const q = createConfirmQueue()
    q.ask('a', false)
    const a = q.current.id
    q.answer(a, true)
    q.ask('b', false)
    assert.notEqual(q.current.id, a)
  })
})
