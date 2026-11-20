// Zoo UI — the BASE layer, `@zooui/nuxt`. Nuxt UI as it ships, Zoo UI's own components (ZKicker, ZIdentifier, ZStatus,
// ZQuotaMeter, ZCodeBlock, ZTokenReveal, ZEcosystemMark, ZThemeToggle) and its colored-edge wrappers (ZCard, ZModal,
// ZSlideover, ZDrawer), written on Nuxt UI's semantic tokens so they take whatever colors the product gives Nuxt UI.
// No colors, typefaces, ground or component restyling: that is a THEME, a layer of its own that extends this one
// (`@zooui/theme-forest`, Forest). A Forest product extends the theme; a product with its own look extends
// this base and keeps it.
// Compare against apps/kitchen-sink (the same specimens with no layer) to see exactly what the theme changes.
//
// The STYLESHEET is not registered here on purpose. The app owns its one Tailwind entry and starts it with
//   @import "@zooui/theme-forest/assets/css/forest.css";   (Forest products: base + theme)
//   @import "@zooui/nuxt/assets/css/base.css";             (products with their own look)
// so it can also add `@source` for component directories outside its own root, and its own tokens after it.
// Two entries would mean two Tailwind compiles.
import { fileURLToPath } from 'node:url'
import { isThemeLayer, stylesheetMismatch } from './stylesheet-guard.js'

/** Absolute path inside THIS layer (a relative path would resolve against the app). */
const resolve = (p: string) => fileURLToPath(new URL(p, import.meta.url))

/** The slice of Nuxt the modules below touch, typed here so the layer needs no @nuxt/schema of its own. */
interface LayerNuxt {
  options: {
    rootDir: string
    css: unknown[]
    alias: Record<string, string>
    _layers: readonly { cwd: string }[]
    optimization: { treeShake: { composables: { client: Record<string, string[]> } } }
  }
  hook(name: 'modules:done', fn: () => void): void
  hook(name: 'icon:clientBundleIcons', fn: (icons: Set<string>) => void): void
}

/** Icons the Z* components render, for the client bundle below. scripts/check-icons.test.mjs keeps it in step with
 *  components/. */
const Z_ICONS = ['lucide:sun', 'lucide:moon', 'lucide:monitor', 'lucide:triangle-alert', 'lucide:check',
  'lucide:circle-check', 'lucide:pencil', 'lucide:x', 'lucide:trash-2', 'lucide:plus', 'lucide:chevron-up', 'lucide:chevron-down', 'lucide:calendar',
  'lucide:file', 'lucide:file-image', 'lucide:file-video', 'lucide:file-audio', 'lucide:file-spreadsheet',
  'lucide:file-archive', 'lucide:file-text',
  'lucide:list-filter', 'lucide:search', 'lucide:check-check', 'lucide:circle-alert']

export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    // Keep `onServerPrefetch` in the CLIENT bundle. A production build strips it there by default, but Vue counts
    // every component that registers one (each UIcon in svg mode) as an async boundary when it hands out useId()
    // ids. Stripped on the client only, the browser counts fewer boundaries than the server, and everything after
    // them gets a different id: hydration re-sets a UInput's id while its UFormField label keeps the server's
    // `for`, so the field loses its name. The hook never runs in the browser; keeping the call keeps the count
    // equal, as it already is under `nuxi dev`. Filtered, not replaced: Nuxt's other tree-shaken composables stay.
    (_options: unknown, nuxt: LayerNuxt) => {
      const client = nuxt.options.optimization.treeShake.composables.client
      if (client.vue) client.vue = client.vue.filter((name) => name !== 'onServerPrefetch')
    },
    // Z* icons in the client bundle, through the hook Nuxt UI uses for its own — so they render without a request
    // to the icon endpoint whatever the product's `icon` options are, and a product's own list is left alone.
    (_options: unknown, nuxt: LayerNuxt) => {
      nuxt.hook('icon:clientBundleIcons', (icons) => { for (const icon of Z_ICONS) icons.add(icon) })
    },
    // The stylesheet and the layers must agree. forest.css is the Forest theme's look, and its app.config half lives in
    // the theme layer; a product that imports forest.css but extends only this base would build in Forest's ramps and
    // typefaces with Nuxt UI's default colors. The reverse — the theme layer over base.css — is half a theme too.
    // Either fails the build, naming the fix. What the CSS brings in is read by following its imports, and the theme
    // layer is recognized by its package name (stylesheet-guard.js).
    (_options: unknown, nuxt: LayerNuxt) => {
      nuxt.hook('modules:done', () => {
        const themed = nuxt.options._layers.some((layer) => isThemeLayer(layer.cwd))
        const mismatch = stylesheetMismatch({ entries: nuxt.options.css, alias: nuxt.options.alias, rootDir: nuxt.options.rootDir, themed })
        if (mismatch) throw new Error(mismatch)
      })
    },
  ],

  // Z* components, prefixed: <ZCard>, <ZStatus> … — .vue only: edge.ts and recipes.ts are their shared helpers.
  components: [{ path: resolve('./components'), prefix: 'Z', extensions: ['.vue'] }],

  /**
   * Exactly ONE @tailwindcss/vite, and it is Nuxt UI's (its module registers it). If anything else also registers
   * Tailwind — @nuxtjs/tailwindcss, a hand-added `vite.plugins` entry — the stylesheet is compiled twice. Fail the
   * build loudly: the fix is to remove the second registration. `vite:extendConfig` is where every registration
   * is visible (it runs after all `vite:extend` hooks, where Nuxt UI registers).
   */
  hooks: {
    'vite:extendConfig'(config) {
      const name = (p: unknown) => (p && typeof p === 'object' ? String((p as { name?: unknown }).name ?? '') : '')
      const counts = new Map<string, number>()
      for (const p of ((config.plugins ?? []) as unknown[]).flat(Infinity)) {
        const n = name(p)
        if (n.startsWith('@tailwindcss/vite')) counts.set(n, (counts.get(n) ?? 0) + 1)
      }
      const dupes = [...counts].filter(([, c]) => c > 1).map(([n, c]) => `${n} ×${c}`)
      if (dupes.length) {
        throw new Error(`[zooui] Tailwind is registered more than once (${dupes.join(', ')}). Nuxt UI registers it; remove the other registration.`)
      }
    },
  },
})
