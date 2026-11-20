// ZFilterSelect's search (packages/nuxt/utils/filter-match.ts): literal and case-insensitive, never a regular
// expression, and the label cut into segments for highlighting.
// Node strips the TypeScript itself (Node 22.18+, 23.6+), so the layer's source is what runs.
// Run: node --test 'scripts/*.test.mjs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { filterSelectMatches, filterSelectSegments } from '../packages/nuxt/utils/filter-match.ts'

const marked = (segments) => segments.map((s) => (s.match ? `[${s.text}]` : s.text)).join('')

describe('filterSelectMatches', () => {
  it('matches a substring, ignoring case', () => {
    assert.equal(filterSelectMatches('In progress', 'PROG'), true)
    assert.equal(filterSelectMatches('In progress', 'ss'), true)
    assert.equal(filterSelectMatches('In progress', 'done'), false)
  })

  it('matches everything for an empty query', () => {
    assert.equal(filterSelectMatches('Open', ''), true)
  })

  it('takes regular-expression characters literally, and never throws on them', () => {
    const labels = ['Fees (monthly)', 'a.b', 'C++', 'Q&A [draft]', 'back\\slash', '$5 ^ up', 'yes|no', '{json}', 'what?', 'a*b']
    for (const query of ['(', ')', '[', ']', '{', '}', '.', '*', '+', '?', '^', '$', '|', '\\', '(monthly', '[draft]', '++']) {
      for (const label of labels) {
        assert.doesNotThrow(() => filterSelectMatches(label, query), `${label} / ${query}`)
        assert.equal(filterSelectMatches(label, query), label.includes(query), `${label} / ${query}`)
      }
    }
  })

  it('does not read . or * as wildcards', () => {
    assert.equal(filterSelectMatches('abc', '.'), false)
    assert.equal(filterSelectMatches('abc', 'a.c'), false)
    assert.equal(filterSelectMatches('abc', '.*'), false)
    assert.equal(filterSelectMatches('a.c', 'a.c'), true)
  })
})

describe('filterSelectSegments', () => {
  it('cuts out each match, in order', () => {
    assert.equal(marked(filterSelectSegments('In progress', 'PRO')), 'In [pro]gress')
    assert.equal(marked(filterSelectSegments('Pending review: pending', 'pend')), '[Pend]ing review: [pend]ing')
    // Matches that touch are one segment: one <mark>, not two side by side.
    assert.deepEqual(filterSelectSegments('Banana', 'an'), [{ text: 'B', match: false }, { text: 'anan', match: true }, { text: 'a', match: false }])
  })

  it('keeps the label\'s own case in the match', () => {
    assert.deepEqual(filterSelectSegments('OPEN', 'op'), [{ text: 'OP', match: true }, { text: 'EN', match: false }])
  })

  it('is the whole label, unmatched, for an empty or absent query', () => {
    assert.deepEqual(filterSelectSegments('Open', ''), [{ text: 'Open', match: false }])
    assert.deepEqual(filterSelectSegments('Open', 'zzz'), [{ text: 'Open', match: false }])
    assert.deepEqual(filterSelectSegments('', 'a'), [])
  })

  it('marks regular-expression characters literally', () => {
    assert.equal(marked(filterSelectSegments('Fees (monthly)', '(')), 'Fees [(]monthly)')
    assert.equal(marked(filterSelectSegments('Q&A [draft]', '[draft]')), 'Q&A [[draft]]')
    assert.equal(marked(filterSelectSegments('a.b.c', '.')), 'a[.]b[.]c')
    assert.equal(marked(filterSelectSegments('C++ and C', '+')), 'C[++] and C')
    assert.equal(marked(filterSelectSegments('back\\slash', '\\')), 'back[\\]slash')
    assert.equal(marked(filterSelectSegments('abc', '.*')), 'abc')
  })

  it('does not overlap matches', () => {
    assert.equal(marked(filterSelectSegments('aaa', 'aa')), '[aa]a')
  })

  it('joins back to the label, and maps a match onto whole characters where lowercasing changes length', () => {
    for (const [label, query] of [['İstanbul', 'i'], ['İstanbul', 'ist'], ['Straße', 'SS'], ['naïve café', 'É'], ['😀 smile', 'smi']]) {
      const segments = filterSelectSegments(label, query)
      assert.equal(segments.map((s) => s.text).join(''), label, `${label} / ${query}`)
    }
    assert.equal(marked(filterSelectSegments('İstanbul', 'i')), '[İ]stanbul')
    // After the İ (one character, two once lowercased) the folded text runs one ahead of the label.
    assert.equal(marked(filterSelectSegments('İstanbul', 'STAN')), 'İ[stan]bul')
    assert.equal(marked(filterSelectSegments('naïve café', 'É')), 'naïve caf[é]')
    assert.equal(marked(filterSelectSegments('😀 smile', 'smi')), '😀 [smi]le')
  })

  it('agrees with filterSelectMatches', () => {
    for (const [label, query] of [['Open', 'pe'], ['Open', 'x'], ['Fees (monthly)', '(m'], ['İstanbul', 'i']]) {
      assert.equal(filterSelectSegments(label, query).some((s) => s.match), filterSelectMatches(label, query))
    }
  })
})
