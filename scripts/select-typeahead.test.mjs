// ZSelectMenu's typeahead (packages/nuxt/components/select-typeahead.ts): the items a search can land on, labels and
// values read by labelKey and valueKey, and the matching rules (from the top of the list; a repeated letter cycles). The wiring is tested in Playwright
// (apps/base/tests/select-menu.spec.ts).
// Node strips the TypeScript itself (Node 22.18+, 23.6+), so the layer's source is what runs.
// Run: node --test 'scripts/*.test.mjs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { itemLabel, itemValue, sameValue, selectableItems, typeaheadMatch } from '../packages/nuxt/components/select-typeahead.ts'

const FRUIT = ['Apple', 'Banana', 'Blueberry', 'Cherry', 'Date']

describe('selectableItems', () => {
  it('flattens groups and drops labels, separators, disabled items and nulls', () => {
    const items = [
      [{ type: 'label', label: 'Fruit' }, { label: 'Apple' }, { label: 'Banana', disabled: true }],
      [{ type: 'separator' }, { label: 'Carrot' }, null],
    ]
    assert.deepEqual(selectableItems(items).map((i) => i.label), ['Apple', 'Carrot'])
  })
  it('takes a flat list of strings as it is', () => {
    assert.deepEqual(selectableItems(FRUIT), FRUIT)
  })
})

describe('itemLabel and itemValue', () => {
  it('read labelKey and valueKey, dotted paths included', () => {
    const item = { id: 7, name: { full: 'Ada Lovelace' } }
    assert.equal(itemLabel(item, { labelKey: 'name.full' }), 'Ada Lovelace')
    assert.equal(itemValue(item, { valueKey: 'id' }), 7)
  })
  it('default to `label` and the item itself', () => {
    const item = { label: 'Apple' }
    assert.equal(itemLabel(item), 'Apple')
    assert.equal(itemValue(item), item)
  })
  it('read a primitive item as itself', () => {
    assert.equal(itemLabel(42), '42')
    assert.equal(itemValue(42, { valueKey: 'id' }), 42)
  })
})

describe('sameValue', () => {
  it('compares objects by `by`, a field or a function', () => {
    assert.equal(sameValue({ id: 1, v: 'a' }, { id: 1, v: 'b' }, { by: 'id' }), true)
    assert.equal(sameValue({ id: 'A1' }, { id: 'a1' }, { by: (a, b) => a.id.toLowerCase() === b.id.toLowerCase() }), true)
  })
  it('compares objects by their contents without `by`', () => {
    assert.equal(sameValue({ label: 'Apple' }, { label: 'Apple' }), true)
    assert.equal(sameValue({ label: 'Apple' }, { label: 'Pear' }), false)
  })
})

describe('typeaheadMatch', () => {
  it('lands on the first item whose label starts with the search, ignoring case', () => {
    assert.equal(typeaheadMatch(FRUIT, 'c', undefined), 'Cherry')
    assert.equal(typeaheadMatch(FRUIT, 'BL', undefined), 'Blueberry')
  })
  it('searches from the top of the list, not from the current item', () => {
    const states = ['Alabama', 'California', 'Colorado', 'Connecticut', 'Delaware']
    assert.equal(typeaheadMatch(states, 'c', 'Colorado'), 'California')
    assert.equal(typeaheadMatch(states, 'c', 'Delaware'), 'California')
    assert.equal(typeaheadMatch(states, 'con', 'Colorado'), 'Connecticut')
  })
  it('a repeated letter cycles through the items that start with it, onward from the current one', () => {
    const states = ['Alabama', 'California', 'Colorado', 'Connecticut', 'Delaware']
    assert.equal(typeaheadMatch(states, 'cc', 'California'), 'Colorado')
    assert.equal(typeaheadMatch(states, 'ccc', 'Colorado'), 'Connecticut')
    assert.equal(typeaheadMatch(states, 'cccc', 'Connecticut'), 'California')
    assert.equal(typeaheadMatch(states, 'cc', 'Delaware'), 'California')
  })
  it('stays on the current item when it is the match', () => {
    assert.equal(typeaheadMatch(FRUIT, 'b', 'Banana'), undefined)
    assert.equal(typeaheadMatch(FRUIT, 'ba', 'Banana'), undefined)
    assert.equal(typeaheadMatch(FRUIT, 'bl', 'Banana'), 'Blueberry')
    assert.equal(typeaheadMatch(FRUIT, 'b', 'Blueberry'), 'Banana')
  })
  it('finds the current item by `by` when cycling', () => {
    const people = [{ id: 1, name: 'Ada' }, { id: 2, name: 'Alan' }, { id: 3, name: 'Grace' }]
    assert.equal(typeaheadMatch(people, 'aa', { id: 1, name: 'Ada (renamed)' }, { labelKey: 'name', by: 'id' }), people[1])
  })
  it('finds nothing for a search nothing starts with, or an empty one', () => {
    assert.equal(typeaheadMatch(FRUIT, 'z', 'Apple'), undefined)
    assert.equal(typeaheadMatch(FRUIT, '', 'Apple'), undefined)
  })
  it('matches objects by labelKey and finds the current one by valueKey', () => {
    const people = [{ id: 1, name: 'Ada' }, { id: 2, name: 'Alan' }, { id: 3, name: 'Grace' }]
    const keys = { labelKey: 'name', valueKey: 'id' }
    assert.equal(typeaheadMatch(people, 'a', 3, keys), people[0])
    assert.equal(typeaheadMatch(people, 'aa', 1, keys), people[1])
    assert.equal(typeaheadMatch(people, 'g', 1, keys), people[2])
  })
})
