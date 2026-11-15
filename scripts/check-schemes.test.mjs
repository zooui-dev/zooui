// The Forest theme's scheme files and raw ramps have one copy, in packages/theme-forest/schemes/, shared by the Nuxt
// theme and its plain-CSS design source (packages/theme-forest/design/). What can still drift is held here:
//   - the two "Schemes" tables (the design source's readme, the theme's README): one row per scheme file, same names;
//   - the design source's links into schemes/ and its own stylesheets: every relative href, src, @import and url()
//     in its pages and stylesheets must name a file that exists, so renaming a scheme can't leave a specimen dead;
//   - tokens.css importing ramps.css rather than carrying a second copy of the ramps.
// Run: node --test 'scripts/*.test.mjs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const theme = join(root, 'packages/theme-forest')
const design = join(theme, 'design')
const schemes = join(theme, 'schemes')
const read = (path) => readFileSync(path, 'utf8')

// ramps.css holds the raw ramps every scheme starts from; it is not a scheme.
const schemeFiles = readdirSync(schemes).filter((f) => f.endsWith('.css') && f !== 'ramps.css').sort()

// Scheme file → scheme name, from the table under "## Schemes".
function schemesTable(markdown) {
  const section = markdown.split(/^## Schemes$/m)[1]?.split(/^## /m)[0]
  assert.ok(section, 'no "## Schemes" section')
  const rows = section.split('\n').filter((line) => line.startsWith('|')).map((line) => line.split('|').slice(1, -1).map((c) => c.trim()))
  const [header, , ...body] = rows
  const at = header.indexOf('File')
  assert.ok(at > 0, 'the table has no "File" column')
  return Object.fromEntries(body.map((cells) => {
    const file = cells[at].match(/schemes\/([\w-]+\.css)/)?.[1]
    assert.ok(file, `no scheme file in the row for ${cells[0]}`)
    return [file, cells[0]]
  }))
}

test('the design source and the theme README list every scheme file, under the same names', () => {
  const source = schemesTable(read(join(design, 'readme.md')))
  const readme = schemesTable(read(join(theme, 'README.md')))
  assert.deepEqual(Object.keys(source).sort(), schemeFiles, 'one row per scheme file in packages/theme-forest/schemes/')
  assert.deepEqual(readme, source)
})

// Relative references in a page or stylesheet: href/src attributes, @import and url(). Anchors, absolute URLs and
// data: URIs are not files here.
function references(file) {
  const text = read(file).replace(/\/\*[\s\S]*?\*\//g, '')
  const refs = [
    ...[...text.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((m) => m[1]),
    ...[...text.matchAll(/@import\s+(?:url\()?["']([^"']+)["']/g)].map((m) => m[1]),
    ...[...text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((m) => m[1]),
  ]
  return refs.filter((r) => !/^(#|[a-z][a-z0-9+.-]*:|\/\/)/i.test(r)).map((r) => r.split(/[?#]/)[0])
}

const pages = (dir) => readdirSync(dir).filter((f) => /\.(html|css)$/.test(f)).map((f) => join(dir, f))

for (const file of [...pages(design), ...pages(join(design, 'reference'))]) {
  const name = file.slice(theme.length + 1)
  test(`${name}: every relative link resolves`, () => {
    for (const ref of references(file)) {
      assert.ok(existsSync(join(dirname(file), ref)), `${name} links ${ref}, which does not exist`)
    }
  })
}

// Every `--name:` declared in a stylesheet.
const declared = (css) => new Set([...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]))

test("tokens.css imports the theme's ramps.css and declares no ramp of its own", () => {
  const tokens = read(join(design, 'tokens.css'))
  assert.match(tokens, /@import\s+["']\.\.\/schemes\/ramps\.css["']/)
  const ramps = declared(read(join(schemes, 'ramps.css')))
  assert.ok(ramps.size > 0, 'ramps.css declares nothing')
  const own = declared(tokens)
  assert.deepEqual([...ramps].filter((name) => own.has(name)), [], 'tokens.css redeclares ramps that ramps.css owns')
})
