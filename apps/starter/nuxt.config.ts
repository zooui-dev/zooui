// A product on Zoo UI's Forest theme, at its smallest. The theme layer (over the base) brings everything UI: Nuxt UI (registered and colored by Forest),
// the Z* components, the AT fonts and the schemes. This app adds no UI module and no Tailwind of its own — the
// layer fails the build if a second Tailwind registration appears.
export default defineNuxtConfig({
  extends: ['@zooui/theme-forest'],

  compatibilityDate: '2025-06-01',
  devtools: { enabled: false },

  // The app's ONE Tailwind entry: the layer's stylesheet, then the product's scheme.
  css: ['~/assets/css/main.css'],
})
