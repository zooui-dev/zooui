// The base layer registers the icons its Z* components and composables render for the consumer's client bundle (Z_ICONS in
// packages/nuxt/nuxt.config.ts), so they render without a request to the icon endpoint. A component that starts using an
// icon the list lacks would fetch it at runtime, silently; this holds the list to what components/ and composables/ use,
// and the utils/ they draw from.
// Run: node --test 'scripts/*.test.mjs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const layer = fileURLToPath(new URL('../packages/nuxt/', import.meta.url))

/** `i-lucide-triangle-alert` in any component or composable → `lucide:triangle-alert`, the form the bundle list takes. */
function used() {
  const icons = new Set()
  for (const dir of ['components', 'composables', 'utils']) {
    for (const file of readdirSync(`${layer}${dir}`).filter((f) => /\.(vue|ts)$/.test(f))) {
      for (const [, collection, name] of readFileSync(`${layer}${dir}/${file}`, 'utf8').matchAll(/['"]i-([a-z0-9]+)-([a-z0-9-]+)['"]/g)) {
        icons.add(`${collection}:${name}`)
      }
    }
  }
  return [...icons].sort()
}

function registered() {
  const list = readFileSync(`${layer}nuxt.config.ts`, 'utf8').match(/const Z_ICONS = \[([^\]]*)\]/)
  assert.ok(list, 'Z_ICONS not found in packages/nuxt/nuxt.config.ts')
  return [...list[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort()
}

test('Z_ICONS lists exactly the icons the Z* components render', () => {
  const found = used()
  assert.ok(found.length > 0, 'found no icons in packages/nuxt/components or composables: the pattern no longer matches how they are written')
  assert.deepEqual(registered(), found)
})
