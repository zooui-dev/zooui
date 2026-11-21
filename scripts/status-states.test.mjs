// ZStatus's status map (packages/nuxt/utils/status-states.ts): the merge order, the fallback and the options list.
// Node strips the TypeScript itself (Node 22.18+, 23.6+), so the layer's source is what runs.
// Run: node --test 'scripts/*.test.mjs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { BUILT_IN_STATUS_STATES, mergeStatusStates, STATUS_FALLBACK, statusInfo, statusOptions } from '../packages/nuxt/utils/status-states.ts'

const product = {
  draft: { label: 'Draft', icon: 'i-lucide-pencil-line', color: 'neutral' },
  review: { label: 'In review', icon: 'i-lucide-eye', color: 'info' },
  shipped: { label: 'Shipped', icon: 'i-lucide-rocket', color: 'success' },
}

describe('mergeStatusStates', () => {
  it('keeps the five built-ins as defaults', () => {
    const states = mergeStatusStates(BUILT_IN_STATUS_STATES)
    assert.deepEqual(Object.keys(states), ['healthy', 'warn', 'suspended', 'unreachable', 'quiet'])
    assert.deepEqual(states.warn, { label: 'Near limit', color: 'warning', shape: 'warn' })
  })

  it('adds a product\'s statuses after the built-ins, in the order written', () => {
    const states = mergeStatusStates(BUILT_IN_STATUS_STATES, product)
    assert.deepEqual(Object.keys(states).slice(5), ['draft', 'review', 'shipped'])
    assert.deepEqual(states.review, { label: 'In review', icon: 'i-lucide-eye', color: 'info' })
  })

  it('lets a product override a built-in, field by field, in its place', () => {
    const states = mergeStatusStates(BUILT_IN_STATUS_STATES, { warn: { label: 'Almost full' } })
    assert.deepEqual(states.warn, { label: 'Almost full', color: 'warning', shape: 'warn' })   // the shape stays
    assert.equal(Object.keys(states)[1], 'warn')
  })

  it('takes the later map over the earlier: prop over app.config over built-in', () => {
    const config = { healthy: { label: 'Up' }, draft: { label: 'Draft', icon: 'i-lucide-pencil', color: 'neutral' } }
    const prop = { healthy: { label: 'Running' }, draft: { icon: 'i-lucide-pencil-line', color: 'warning' } }
    const states = mergeStatusStates(BUILT_IN_STATUS_STATES, config, prop)
    assert.equal(states.healthy.label, 'Running')
    assert.deepEqual(states.draft, { label: 'Draft', icon: 'i-lucide-pencil-line', color: 'warning' })
    assert.equal(mergeStatusStates(BUILT_IN_STATUS_STATES, prop, config).healthy.label, 'Up')
  })

  it('draws a built-in given a new icon or color as the product\'s own, without its shape', () => {
    const states = mergeStatusStates(BUILT_IN_STATUS_STATES, { quiet: { icon: 'i-lucide-moon' }, suspended: { color: 'warning' } })
    assert.deepEqual(states.quiet, { label: 'Quiet', icon: 'i-lucide-moon', color: 'neutral' })
    assert.deepEqual(states.suspended, { label: 'Suspended', color: 'warning' })
  })

  it('labels a new key with the key itself, in neutral, when the product gives neither', () => {
    assert.deepEqual(mergeStatusStates({ archived: {} }).archived, { label: 'archived', color: 'neutral' })
  })

  it('leaves the built-ins untouched', () => {
    mergeStatusStates(BUILT_IN_STATUS_STATES, { healthy: { label: 'Up' } })
    assert.equal(BUILT_IN_STATUS_STATES.healthy.label, 'Healthy')
  })
})

describe('statusInfo', () => {
  const states = mergeStatusStates(BUILT_IN_STATUS_STATES, product)

  it('finds a known key', () => {
    assert.deepEqual(statusInfo(states, 'draft'), { ...product.draft, known: true })
  })

  it('falls back for an unknown, empty or missing key', () => {
    for (const key of ['scheduled', '', null, undefined, 'toString', '__proto__']) {
      assert.deepEqual(statusInfo(states, key), { ...STATUS_FALLBACK, known: false }, String(key))
    }
  })

  it('takes the product\'s own fallback over the built-in one, field by field', () => {
    assert.deepEqual(statusInfo(states, 'nope', { label: 'Other' }), { label: 'Other', icon: 'i-lucide-circle-help', color: 'neutral', known: false })
  })
})

describe('statusOptions', () => {
  const states = mergeStatusStates(BUILT_IN_STATUS_STATES, product)

  it('lists the map in its order, with value, label, icon and color', () => {
    const options = statusOptions(states)
    assert.deepEqual(options.map((o) => o.value), Object.keys(states))
    assert.deepEqual(options.at(-1), { label: 'Shipped', value: 'shipped', icon: 'i-lucide-rocket', color: 'success' })
  })

  it('gives an entry without an icon a chip in its color instead', () => {
    assert.deepEqual(statusOptions(states, ['warn'])[0], { label: 'Near limit', value: 'warn', color: 'warning', chip: { color: 'warning' } })
  })

  it('lists only the keys asked for, in that order', () => {
    assert.deepEqual(statusOptions(states, ['shipped', 'draft']).map((o) => o.label), ['Shipped', 'Draft'])
  })
})
