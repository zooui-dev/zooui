// Sorting dropped files by `accept` and `multiple` (packages/nuxt/utils/file-drop.ts), behind ZFileDropOverlay.
// Node strips the TypeScript itself (Node 22.18+, 23.6+), so the layer's source is what runs.
// Run: node --test 'scripts/*.test.mjs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { dragCarriesFiles, fileMatchesAccept, formatFileSize, sortDroppedFiles } from '../packages/nuxt/utils/file-drop.ts'

const file = (name, type = '') => new File(['x'], name, { type })
const names = (files) => files.map((f) => f.name)

describe('fileMatchesAccept', () => {
  it('takes every file with no accept, an empty one, or one with no valid token', () => {
    for (const accept of [undefined, '', ' , ', [], 'pdf', 'image']) assert.equal(fileMatchesAccept(file('a.bin'), accept), true, String(accept))
  })
  it('matches an extension against the end of the name, in any case', () => {
    assert.equal(fileMatchesAccept(file('Report.PDF'), '.pdf'), true)
    assert.equal(fileMatchesAccept(file('archive.tar.gz'), '.tar.gz'), true)
    assert.equal(fileMatchesAccept(file('archive.tar.gz'), '.tar'), false)
    assert.equal(fileMatchesAccept(file('pdf'), '.pdf'), false)
  })
  it('matches type/* on the first half of the MIME type, and a full type exactly', () => {
    assert.equal(fileMatchesAccept(file('a.png', 'image/png'), 'image/*'), true)
    assert.equal(fileMatchesAccept(file('a.pdf', 'application/pdf'), 'image/*'), false)
    assert.equal(fileMatchesAccept(file('a.pdf', 'application/pdf'), 'APPLICATION/PDF'), true)
    assert.equal(fileMatchesAccept(file('a.pdf', 'application/pdf'), 'application/pd'), false)
    assert.equal(fileMatchesAccept(file('a.txt', 'text/plain;charset=utf-8'), 'text/plain'), true)
  })
  it('refuses a file with no type for a MIME token, but still matches it by extension', () => {
    assert.equal(fileMatchesAccept(file('a.heic', ''), 'image/*'), false)
    assert.equal(fileMatchesAccept(file('a.heic', ''), 'image/*, .heic'), true)
  })
  it('takes a comma-separated string or a list, ignoring spaces and invalid tokens', () => {
    assert.equal(fileMatchesAccept(file('a.csv', 'text/csv'), ' image/* , .csv '), true)
    assert.equal(fileMatchesAccept(file('a.csv', 'text/csv'), ['image/*', '.csv']), true)
    assert.equal(fileMatchesAccept(file('a.csv', 'text/csv'), ['image/*', 'csv']), false)
  })
})

describe('sortDroppedFiles', () => {
  const dropped = [file('a.png', 'image/png'), file('b.exe', 'application/x-msdownload'), file('c.pdf', 'application/pdf'), file('d.jpg', 'image/jpeg')]

  it('with multiple, takes every matching file in drop order and refuses the rest for accept', () => {
    const { accepted, rejected } = sortDroppedFiles(dropped, { accept: 'image/*,.pdf', multiple: true })
    assert.deepEqual(names(accepted), ['a.png', 'c.pdf', 'd.jpg'])
    assert.deepEqual(rejected.map((r) => [r.file.name, r.reason]), [['b.exe', 'accept']])
  })
  it('without multiple, takes the first matching file and refuses later matches for multiple', () => {
    const { accepted, rejected } = sortDroppedFiles(dropped, { accept: 'image/*,.pdf' })
    assert.deepEqual(names(accepted), ['a.png'])
    assert.deepEqual(rejected.map((r) => [r.file.name, r.reason]), [['b.exe', 'accept'], ['c.pdf', 'multiple'], ['d.jpg', 'multiple']])
  })
  it('without multiple, a refused first file does not use up the one slot', () => {
    const { accepted } = sortDroppedFiles([dropped[1], dropped[2]], { accept: '.pdf' })
    assert.deepEqual(names(accepted), ['c.pdf'])
  })
  it('takes everything with no accept, and handles no files', () => {
    assert.equal(sortDroppedFiles(dropped, { multiple: true }).accepted.length, 4)
    assert.deepEqual(sortDroppedFiles([]), { accepted: [], rejected: [] })
  })
})

describe('dragCarriesFiles', () => {
  it('is true only when the drag carries Files', () => {
    assert.equal(dragCarriesFiles({ types: ['Files'] }), true)
    assert.equal(dragCarriesFiles({ types: ['text/plain', 'Files'] }), true)
    assert.equal(dragCarriesFiles({ types: ['text/plain', 'text/uri-list'] }), false)
    assert.equal(dragCarriesFiles({ types: [] }), false)
    assert.equal(dragCarriesFiles(null), false)
    assert.equal(dragCarriesFiles(undefined), false)
  })
})

describe('formatFileSize', () => {
  it('says bytes in words under 1 kB, and steps up in decimal units', () => {
    assert.equal(formatFileSize(0, 'en'), '0 bytes')
    assert.equal(formatFileSize(1, 'en'), '1 byte')
    assert.equal(formatFileSize(999, 'en'), '999 bytes')
    assert.equal(formatFileSize(1000, 'en'), '1 kB')
    assert.equal(formatFileSize(1234, 'en'), '1.2 kB')
    assert.equal(formatFileSize(34_560_000, 'en'), '35 MB')
    assert.equal(formatFileSize(3_400_000_000, 'en'), '3.4 GB')
  })
  it('steps up when rounding reaches the next unit', () => {
    assert.equal(formatFileSize(999_960, 'en'), '1 MB')
    assert.equal(formatFileSize(9_960, 'en'), '10 kB')
  })
  it('writes the locale\'s digits and unit words', () => {
    assert.equal(formatFileSize(1234, 'de'), '1,2 kB')
    assert.equal(formatFileSize(512, 'de'), '512 Byte')
  })
  it('reads a missing or negative size as nothing', () => {
    assert.equal(formatFileSize(Number.NaN, 'en'), '0 bytes')
    assert.equal(formatFileSize(-5, 'en'), '0 bytes')
  })
})
