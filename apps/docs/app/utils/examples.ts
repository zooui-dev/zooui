import type { Component } from 'vue'

/**
 * The live examples: one SFC per example in app/examples/, named by its file (`KickerBracket`). Each is loaded on
 * demand, as a component to render and as its own source text to show beside it, so the source on the page is
 * always exactly the code that rendered above it.
 */
const components = import.meta.glob<{ default: Component }>('../examples/*.vue')
const sources = import.meta.glob<string>('../examples/*.vue', { query: '?raw', import: 'default' })

const file = (name: string) => `../examples/${name}.vue`

export const exampleNames = Object.keys(components).map((path) => path.slice('../examples/'.length, -'.vue'.length))

/** The example's component and source, or a build-failing error for a name with no file, so a typo in a page's
 *  `::component-example` breaks the build instead of shipping an empty box. */
export async function loadExample(name: string, { withSource = true } = {}) {
  const component = components[file(name)]
  const source = sources[file(name)]
  if (!component || !source) {
    throw createError({ statusCode: 500, statusMessage: `No example "${name}" in app/examples/ (have: ${exampleNames.join(', ')})`, fatal: true })
  }
  const [mod, code] = await Promise.all([component(), withSource ? source() : ''])
  return { component: markRaw(mod.default), source: code.trim() }
}
