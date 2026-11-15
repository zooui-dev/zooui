// Zoo UI's Forest theme, `@zooui/theme-forest`: a layer of its own over the base, `@zooui/nuxt`, which it extends — so
// a Forest product extends this one layer and gets both. It is a layer, not an option on the base, because a product's
// app.config can override a layer's keys but never remove them: a base that carried Forest's `ui.colors`, badge and
// alert restyling would carry them into every product. What it adds:
//   - app.config.ts: Nuxt UI pointed at Forest's palettes; the mono face on badges, kbd and table headers; striped
//     alerts; toast edges and no progress bar; nu-grid styling;
//   - the two settings below.
// Its stylesheet half is assets/css/theme.css (Forest's typefaces, ramps, palettes and ground), which forest.css
// imports after the base's base.css — so a Forest product extends this layer and imports forest.css; the base layer
// refuses the mix.
export default defineNuxtConfig({
  extends: ['@zooui/nuxt'],

  // Forest ships its own typefaces (Inter and JetBrains Mono from fontsource, imported by assets/css/theme.css), so
  // Nuxt UI's @nuxt/fonts is off: nothing resolves or fetches web fonts beside them. The base leaves it on, as Nuxt
  // UI ships.
  ui: { fonts: false },

  // color-mode owns light/dark (Nuxt UI installs it, and reads the `dark` class it writes). The theme stores the
  // reader's choice under its own key; the base sets none, so a product with its own look keeps its own.
  colorMode: { storageKey: 'zooui-color-mode' },
})
