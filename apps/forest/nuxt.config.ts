import { fileURLToPath } from 'node:url'

// The Forest theme layer, `@zooui/theme-forest` (over the base), showing the SAME specimens as the untouched baseline: the kitchen sink's section components
// are registered from their one source rather than copied, so the two pages can only differ by the theme.
export default defineNuxtConfig({
  extends: ['@zooui/theme-forest'],

  // nu-grid for the grid specimens, which show the layer's `nuGrid` styling. The layer itself does not depend on
  // nu-grid; only this app installs it (as v1's playground does).
  modules: ['@nu-grid/nuxt'],

  // the layer ships the stylesheet; the app registers it, and adds @source for the shared specimens
  css: ['~/assets/css/main.css'],

  compatibilityDate: '2025-06-01',
  devtools: { enabled: false },

  components: [
    { path: fileURLToPath(new URL('../kitchen-sink/app/components', import.meta.url)), pathPrefix: false },
    { path: '~/components', pathPrefix: false },
  ],
})
