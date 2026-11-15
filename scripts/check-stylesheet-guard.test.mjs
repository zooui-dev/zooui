// The base layer's stylesheet guard (packages/nuxt/stylesheet-guard.js): an app whose CSS brings in the Forest
// theme's look must extend the theme layer, and an app on the theme must not stop at base.css. Each case is a small
// app in a temp directory with `@zooui/nuxt` and `@zooui/theme-forest` linked into its node_modules, so package
// specifiers resolve as they do for a product.
// Run: node --test 'scripts/*.test.mjs'
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cssImports, isThemeLayer, stylesheetMismatch } from '../packages/nuxt/stylesheet-guard.js'

const base = fileURLToPath(new URL('../packages/nuxt', import.meta.url))
const theme = fileURLToPath(new URL('../packages/theme-forest', import.meta.url))
const root = mkdtempSync(join(tmpdir(), 'zooui-guard-'))
mkdirSync(join(root, 'node_modules/@zooui'), { recursive: true })
symlinkSync(base, join(root, 'node_modules/@zooui/nuxt'), 'dir')
symlinkSync(theme, join(root, 'node_modules/@zooui/theme-forest'), 'dir')
mkdirSync(join(root, 'app'))
after(() => rmSync(root, { recursive: true, force: true }))

const FOREST = '@import "@zooui/theme-forest/assets/css/forest.css";'
const BASE = '@import "@zooui/nuxt/assets/css/base.css";'
const THEME = '@import "@zooui/theme-forest/assets/css/theme.css";'

let n = 0
/** The verdict for an app whose main.css is `css` (plus any other files), extending the theme layer or not. */
function verdict({ css, files = {}, entries, themed }) {
  const name = `main-${n++}.css`
  writeFileSync(join(root, 'app', name), css ?? '')
  for (const [file, body] of Object.entries(files)) writeFileSync(join(root, 'app', file), body)
  return stylesheetMismatch({ entries: entries ?? [`~/${name}`], alias: { '~': join(root, 'app'), '@': join(root, 'app') }, rootDir: root, themed })
}

test('a Forest product on the theme layer, and a product with its own look on the base, both pass', () => {
  assert.equal(verdict({ css: `${FOREST}\n@import "@zooui/theme-forest/schemes/ink-indigo.css";`, themed: true }), null)
  assert.equal(verdict({ css: `${BASE}\n@theme { --text-sm: 0.9375rem; }`, themed: false }), null)
})

test('forest.css without the theme layer fails, naming the fix', () => {
  assert.match(verdict({ css: FOREST, themed: false }) ?? '', /extends only the base layer.*Extend '@zooui\/theme-forest'/)
})

test('a css entry that IS a package specifier is resolved, not skipped', () => {
  assert.match(verdict({ entries: ['@zooui/theme-forest/assets/css/forest.css'], themed: false }) ?? '', /extends only the base layer/)
  assert.equal(verdict({ entries: ['@zooui/theme-forest/assets/css/forest.css'], themed: true }), null)
})

test('forest.css reached through a local stylesheet is found', () => {
  assert.match(verdict({ css: '@import "./forest-bits.css";', files: { 'forest-bits.css': FOREST }, themed: false }) ?? '', /extends only the base layer/)
})

test('theme.css reached by a relative path into the package is found too', () => {
  assert.match(verdict({ css: `@import "../node_modules/@zooui/theme-forest/assets/css/theme.css";`, themed: false }) ?? '', /extends only the base layer/)
})

test('base.css then theme.css is forest.css, spelled out', () => {
  assert.equal(verdict({ css: `${BASE}\n${THEME}`, themed: true }), null)
  assert.match(verdict({ css: `${BASE}\n${THEME}`, themed: false }) ?? '', /extends only the base layer/)
})

test('the theme layer over base.css alone fails', () => {
  assert.match(verdict({ css: BASE, themed: true }) ?? '', /imports base\.css.*Import '@zooui\/theme-forest\/assets\/css\/forest\.css' instead/)
})

test('commented-out imports are not imports', () => {
  assert.deepEqual(cssImports(`/* ${FOREST} */\n${BASE}\n/*\n${THEME}\n*/`), ['@zooui/nuxt/assets/css/base.css'])
  assert.equal(verdict({ css: `/* was: ${FOREST} */\n${BASE}`, themed: false }), null)
})

test('CSS that reaches neither stylesheet, or entries that resolve to nothing, say nothing either way', () => {
  assert.equal(verdict({ css: '@import "tailwindcss";', themed: true }), null)
  assert.equal(verdict({ entries: ['~/missing.css', '@nowhere/pkg/x.css', { src: 'x' }], themed: false }), null)
})

test('the theme layer is recognized by its package, not its path; the base and an app are not it', () => {
  assert.equal(isThemeLayer(theme), true)
  assert.equal(isThemeLayer(join(root, 'node_modules/@zooui/theme-forest')), true)
  assert.equal(isThemeLayer(base), false)
  assert.equal(isThemeLayer(root), false)
})
