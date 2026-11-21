// Website addresses as ZUrlInput commits them (packages/nuxt/utils/url-input.ts).
// Node strips the TypeScript itself (Node 22.18+, 23.6+), so the layer's source is what runs.
// Run: node --test 'scripts/*.test.mjs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { commitWebAddress, isWebAddress, normalizeWebAddress } from '../packages/nuxt/utils/url-input.ts'

describe('normalizeWebAddress', () => {
  it('trims and adds https:// when there is no scheme', () => {
    assert.equal(normalizeWebAddress('  example.com  '), 'https://example.com')
    assert.equal(normalizeWebAddress('app.example.com/about?x=1#top'), 'https://app.example.com/about?x=1#top')
  })
  it('replaces http:// or https://, in any case, with https://', () => {
    assert.equal(normalizeWebAddress('http://example.com'), 'https://example.com')
    assert.equal(normalizeWebAddress('https://example.com'), 'https://example.com')
    assert.equal(normalizeWebAddress('HTTPS://Example.com'), 'https://Example.com')
    assert.equal(normalizeWebAddress('Http://example.com/Path'), 'https://example.com/Path')
  })
  it('reads no other scheme: it stays in the text, behind https://', () => {
    assert.equal(normalizeWebAddress('ftp://example.com'), 'https://ftp://example.com')
  })
  it('keeps the rest as typed: case, path, query, fragment', () => {
    assert.equal(normalizeWebAddress('Example.COM/Shop/Item?id=A1'), 'https://Example.COM/Shop/Item?id=A1')
  })
  it('leaves empty and blank text empty', () => {
    assert.equal(normalizeWebAddress(''), '')
    assert.equal(normalizeWebAddress('   '), '')
  })
  it('adds no www. by default', () => {
    assert.equal(normalizeWebAddress('example.app'), 'https://example.app')
  })
  it('with addWww, adds www. to a two-label host only', () => {
    const www = { addWww: true }
    assert.equal(normalizeWebAddress('example.com', www), 'https://www.example.com')
    assert.equal(normalizeWebAddress('http://example.com/about', www), 'https://www.example.com/about')
    assert.equal(normalizeWebAddress('example.com:8080/x', www), 'https://www.example.com:8080/x')
    assert.equal(normalizeWebAddress('example.com?q=a.b', www), 'https://www.example.com?q=a.b')
    assert.equal(normalizeWebAddress('app.example.com', www), 'https://app.example.com')
    assert.equal(normalizeWebAddress('www.example.com', www), 'https://www.example.com')
    assert.equal(normalizeWebAddress('localhost', www), 'https://localhost')
  })
})

describe('isWebAddress', () => {
  it('takes https to a host with a top-level domain', () => {
    for (const a of ['https://example.com', 'https://www.example.co.uk/a?b#c', 'https://example.app', 'https://my-shop.example.io:8443',
      'https://bücher.de', 'https://example.xn--p1ai', 'https://under_score.example.com']) {
      assert.equal(isWebAddress(a), true, a)
    }
  })
  it('refuses anything but https', () => {
    assert.equal(isWebAddress('http://example.com'), false)
    assert.equal(isWebAddress('ftp://example.com'), false)
  })
  it('refuses a host with no top-level domain, or with an empty label', () => {
    for (const a of ['https://localhost', 'https://example', 'https://www.com', 'https://www.example', 'https://example.',
      'https://.example.com', 'https://example..com', 'https://example.c']) {
      assert.equal(isWebAddress(a), false, a)
    }
  })
  it('refuses a numeric top-level domain, so an IP address is not a website', () => {
    assert.equal(isWebAddress('https://192.168.1.10'), false)
    assert.equal(isWebAddress('https://example.123'), false)
  })
  it('refuses a label that starts or ends with a hyphen', () => {
    assert.equal(isWebAddress('https://-example.com'), false)
    assert.equal(isWebAddress('https://example-.com'), false)
  })
  it('refuses a user name or password: an email address typed into the box', () => {
    assert.equal(isWebAddress('https://sam@example.com'), false)
    assert.equal(isWebAddress('https://sam:secret@example.com'), false)
  })
  it('refuses what the URL parser refuses, and what was another scheme', () => {
    assert.equal(isWebAddress('https://exa mple.com'), false)
    assert.equal(isWebAddress('https://'), false)
    assert.equal(isWebAddress('not a url'), false)
    assert.equal(isWebAddress('https://ftp://example.com'), false)
    assert.equal(isWebAddress('https://mailto:sam@example.com'), false)
  })
})

describe('commitWebAddress', () => {
  it('empty or blank text is null, and valid', () => {
    assert.deepEqual(commitWebAddress(''), { value: null, valid: true })
    assert.deepEqual(commitWebAddress('  \t '), { value: null, valid: true })
  })
  it('an address is normalized', () => {
    assert.deepEqual(commitWebAddress(' example.com/about '), { value: 'https://example.com/about', valid: true })
    assert.deepEqual(commitWebAddress('http://example.com'), { value: 'https://example.com', valid: true })
    assert.deepEqual(commitWebAddress('example.com', { addWww: true }), { value: 'https://www.example.com', valid: true })
  })
  it('text that is not an address is kept, trimmed, and invalid', () => {
    assert.deepEqual(commitWebAddress('  not a site '), { value: 'not a site', valid: false })
    assert.deepEqual(commitWebAddress('localhost'), { value: 'localhost', valid: false })
    assert.deepEqual(commitWebAddress('sam@example.com'), { value: 'sam@example.com', valid: false })
  })
})
