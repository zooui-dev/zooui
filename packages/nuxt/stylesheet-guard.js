// The check behind the base layer's stylesheet guard (nuxt.config.ts): do the app's CSS entries agree with the layers
// it extends? The Forest theme comes in two halves, its stylesheet (theme.css, which forest.css imports after the
// base's base.css) and its layer (`@zooui/theme-forest`, the app.config half), so an app with one and not the other
// gets half a theme. The CSS side is read by FOLLOWING each entry's active @import rules to the files they resolve to
// — comments stripped, package specifiers and relative paths resolved as Node would — so what counts is which of the
// two stylesheets an entry reaches, not how it spells them: `forest.css`, or `base.css` then `theme.css`, are the
// same thing. The theme is a package of its own that the base does not depend on, so its stylesheet and its layer are
// recognized by the package they sit in, wherever that is installed. Plain JavaScript, so
// scripts/check-stylesheet-guard.test.mjs can test it without a build.
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const real = (p) => (existsSync(p) ? realpathSync(p) : p)
const css = fileURLToPath(new URL('./assets/css/', import.meta.url))
const BASE = real(join(css, 'base.css'))

/** The theme layer the guard knows, and its theme-only stylesheet relative to the package's root. */
export const THEME_PACKAGE = '@zooui/theme-forest'
const THEME_STYLESHEET = join('assets', 'css', 'theme.css')

/** The `name` in `dir`'s own package.json, or null. */
export function packageName(dir) {
  const file = join(dir, 'package.json')
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, 'utf8')).name ?? null
  } catch {
    return null
  }
}

/** Whether a layer's directory is the theme layer's. */
export const isThemeLayer = (dir) => packageName(dir) === THEME_PACKAGE

/** Whether a (real) path is the theme's stylesheet: assets/css/theme.css in the theme package. */
function isThemeStylesheet(path) {
  const root = resolve(dirname(path), '..', '..')
  return join(root, THEME_STYLESHEET) === path && isThemeLayer(root)
}

/** The targets of a stylesheet's active @import rules: commented-out ones are not imports. */
export function cssImports(source) {
  return [...source.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/g)].map((m) => m[1])
}

/** A specifier as Node resolves it from `fromDir` (a relative or absolute path, or a package's export), or null. */
export function locate(specifier, fromDir) {
  if (specifier.startsWith('.') || isAbsolute(specifier)) return resolve(fromDir, specifier)
  try {
    return createRequire(join(fromDir, 'index.js')).resolve(specifier)
  } catch {
    return null
  }
}

/** Which of the two stylesheets (the base's base.css, the theme's theme.css) a CSS file reaches through its @imports, at any depth. */
export function reaches(file, seen = new Set()) {
  const out = { base: false, theme: false }
  const path = real(file)
  if (seen.has(path) || !path.endsWith('.css') || !existsSync(path)) return out
  seen.add(path)
  if (path === BASE) out.base = true
  if (isThemeStylesheet(path)) out.theme = true
  for (const specifier of cssImports(readFileSync(path, 'utf8'))) {
    const target = locate(specifier, dirname(path))
    if (!target) continue
    const r = reaches(target, seen)
    out.base ||= r.base
    out.theme ||= r.theme
  }
  return out
}

/**
 * The guard's verdict: an error message, or null when the CSS and the layers agree (or the CSS reaches neither of the
 * two stylesheets, which says nothing either way). `entries` are the app's `css` entries as written; `alias` is
 * Nuxt's alias map (`~`, `@` …), and `themed` whether the app extends the theme layer.
 */
export function stylesheetMismatch({ entries, alias, rootDir, themed }) {
  const aliases = Object.entries(alias).sort(([a], [b]) => b.length - a.length)
  const file = (entry) => {
    const hit = aliases.find(([a]) => entry === a || entry.startsWith(`${a}/`))
    return hit ? hit[1] + entry.slice(hit[0].length) : locate(entry, rootDir)
  }
  const seen = { base: [], theme: [] }
  for (const entry of entries) {
    if (typeof entry !== 'string') continue
    const path = file(entry)
    if (!path) continue
    const r = reaches(path)
    if (r.base) seen.base.push(entry)
    if (r.theme) seen.theme.push(entry)
  }
  if (!themed && seen.theme.length) {
    return `[zooui] ${seen.theme[0]} brings in the Forest theme's look (theme.css), but the app extends only the base layer. Extend '${THEME_PACKAGE}' instead of '@zooui/nuxt', or import '@zooui/nuxt/assets/css/base.css' for a product with its own look.`
  }
  if (themed && seen.base.length && !seen.theme.length) {
    return `[zooui] The app extends '${THEME_PACKAGE}', but ${seen.base[0]} imports base.css, which has none of the Forest theme's colors or typefaces. Import '${THEME_PACKAGE}/assets/css/forest.css' instead.`
  }
  return null
}
