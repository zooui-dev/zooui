// Sorting dropped files by `accept` and `multiple` (packages/nuxt/utils/file-drop.ts), behind ZFileDropOverlay.
// Node strips the TypeScript itself (Node 22.18+, 23.6+), so the layer's source is what runs.
// Run: node --test 'scripts/*.test.mjs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { dragCarriesFiles, droppedFiles, fileMatchesAccept, formatFileSize, sortDroppedFiles } from '../packages/nuxt/utils/file-drop.ts'

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

describe('sortDroppedFiles: filter', () => {
  const sized = (name, bytes, type = '') => new File(['x'.repeat(bytes)], name, { type })
  const under = (max) => (f) => f.size <= max || `${f.name} is over ${max} bytes`

  it('refuses a file the filter returns false for, with no message', () => {
    const { accepted, rejected } = sortDroppedFiles([file('~$lock.docx'), file('memo.docx')], { multiple: true, filter: (f) => !f.name.startsWith('~$') })
    assert.deepEqual(names(accepted), ['memo.docx'])
    assert.deepEqual(rejected, [{ file: rejected[0].file, reason: 'filter' }])
    assert.equal(rejected[0].file.name, '~$lock.docx')
    assert.equal('message' in rejected[0], false)
  })
  it('refuses a file the filter returns a message for, and carries the message', () => {
    const { accepted, rejected } = sortDroppedFiles([sized('small.pdf', 3), sized('big.pdf', 10)], { multiple: true, filter: under(5) })
    assert.deepEqual(names(accepted), ['small.pdf'])
    assert.deepEqual(rejected.map((r) => [r.file.name, r.reason, r.message]), [['big.pdf', 'filter', 'big.pdf is over 5 bytes']])
  })
  it('runs only on files accept takes, so a wrong type is refused for accept', () => {
    const seen = []
    const { rejected } = sortDroppedFiles([file('a.exe'), file('b.pdf')], { accept: '.pdf', multiple: true, filter: (f) => (seen.push(f.name), true) })
    assert.deepEqual(seen, ['b.pdf'])
    assert.deepEqual(rejected.map((r) => r.reason), ['accept'])
  })
  it('without multiple, a filtered first file does not use up the one slot', () => {
    const { accepted, rejected } = sortDroppedFiles([sized('big.pdf', 10), sized('small.pdf', 3)], { filter: under(5) })
    assert.deepEqual(names(accepted), ['small.pdf'])
    assert.deepEqual(rejected.map((r) => r.reason), ['filter'])
  })
})

describe('sortDroppedFiles: dedupe', () => {
  it('without existing or dedupe, takes a repeated name (the default is unchanged)', () => {
    assert.deepEqual(names(sortDroppedFiles([file('a.pdf'), file('a.pdf')], { multiple: true }).accepted), ['a.pdf', 'a.pdf'])
  })
  it('with existing, refuses a file whose name is already held, and a repeat within the drop', () => {
    const { accepted, rejected } = sortDroppedFiles([file('held.pdf'), file('new.pdf'), file('new.pdf'), file('other.pdf')], { multiple: true, existing: ['held.pdf'] })
    assert.deepEqual(names(accepted), ['new.pdf', 'other.pdf'])
    assert.deepEqual(rejected.map((r) => [r.file.name, r.reason]), [['held.pdf', 'duplicate'], ['new.pdf', 'duplicate']])
  })
  it('with dedupe: name, refuses repeats within the drop; existing takes any iterable', () => {
    assert.deepEqual(sortDroppedFiles([file('a.pdf'), file('a.pdf')], { multiple: true, dedupe: 'name' }).rejected.map((r) => r.reason), ['duplicate'])
    assert.deepEqual(names(sortDroppedFiles([file('a.pdf'), file('b.pdf')], { multiple: true, existing: new Set(['b.pdf']) }).accepted), ['a.pdf'])
  })
  it('names are matched exactly, case included', () => {
    assert.equal(sortDroppedFiles([file('A.pdf')], { existing: ['a.pdf'] }).accepted.length, 1)
  })
  it('a file refused for filter is not counted as held: a later one of that name is taken', () => {
    const big = new File(['x'.repeat(10)], 'scan.pdf')
    const small = new File(['x'], 'scan.pdf')
    const { accepted, rejected } = sortDroppedFiles([big, small], { multiple: true, dedupe: 'name', filter: (f) => f.size < 5 })
    assert.deepEqual(accepted, [small])
    assert.deepEqual(rejected.map((r) => r.reason), ['filter'])
  })
})

describe('droppedFiles', () => {
  const fileList = (list) => Object.assign([...list], { item: (i) => list[i] ?? null })
  const entry = (kind, f) => ({ kind, getAsFile: () => f })

  it('reads dataTransfer.files when it holds any', () => {
    const a = file('a.pdf')
    const b = file('b.pdf')
    assert.deepEqual(droppedFiles({ files: fileList([a]), items: [entry('file', b)] }), [a])
  })
  it('falls back to the file entries of dataTransfer.items when files is empty', () => {
    const a = file('a.pdf')
    const b = file('b.pdf')
    const got = droppedFiles({ files: fileList([]), items: [entry('string', null), entry('file', a), entry('file', null), entry('file', b)] })
    assert.deepEqual(got, [a, b])
  })
  it('answers nothing for no dataTransfer', () => {
    assert.deepEqual(droppedFiles(null), [])
    assert.deepEqual(droppedFiles({ files: fileList([]), items: [] }), [])
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
  it('by default counts in 1024s with one decimal at most: B, KB, MB', () => {
    assert.equal(formatFileSize(0, 'en'), '0 B')
    assert.equal(formatFileSize(512, 'en'), '512 B')
    assert.equal(formatFileSize(1000, 'en'), '1,000 B')
    assert.equal(formatFileSize(1024, 'en'), '1 KB')
    assert.equal(formatFileSize(1234, 'en'), '1.2 KB')
    assert.equal(formatFileSize(245_000, 'en'), '239.3 KB')
    assert.equal(formatFileSize(1_830_000, 'en'), '1.7 MB')
    assert.equal(formatFileSize(5 * 1024 ** 2, 'en'), '5 MB')
    assert.equal(formatFileSize(3.4 * 1024 ** 3, 'en'), '3.4 GB')
    assert.equal(formatFileSize(2 * 1024 ** 4, 'en'), '2 TB')
    assert.equal(formatFileSize(1260, 'en', { binary: true }), '1.2 KB')
  })
  it('by default steps up when rounding reaches 1024 of a unit', () => {
    assert.equal(formatFileSize(1024 ** 2 - 20, 'en'), '1 MB')
  })
  it('by default writes the locale\'s digits', () => {
    assert.equal(formatFileSize(1234, 'de'), '1,2 KB')
    assert.equal(formatFileSize(3.4 * 1024 ** 3, 'de'), '3,4 GB')
  })
  it('with binary: false, says bytes in words under 1 kB, and steps up in decimal units', () => {
    const decimal = (n, locale = 'en') => formatFileSize(n, locale, { binary: false })
    assert.equal(decimal(0), '0 bytes')
    assert.equal(decimal(1), '1 byte')
    assert.equal(decimal(999), '999 bytes')
    assert.equal(decimal(1000), '1 kB')
    assert.equal(decimal(1234), '1.2 kB')
    assert.equal(decimal(245_000), '245 kB')
    assert.equal(decimal(34_560_000), '35 MB')
    assert.equal(decimal(3_400_000_000), '3.4 GB')
    // Rounding that reaches the next unit steps up.
    assert.equal(decimal(999_960), '1 MB')
    assert.equal(decimal(9_960), '10 kB')
    assert.equal(decimal(1234, 'de'), '1,2 kB')
    assert.equal(decimal(512, 'de'), '512 Byte')
  })
  it('reads a missing or negative size as nothing', () => {
    assert.equal(formatFileSize(Number.NaN, 'en'), '0 B')
    assert.equal(formatFileSize(-5, 'en'), '0 B')
    assert.equal(formatFileSize(-5, 'en', { binary: false }), '0 bytes')
  })
})
