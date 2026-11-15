// A product with its OWN look on the theme-free base — modeled on the kind of product
// the base exists for: its palette (sky / slate, app.config.ts), Nuxt UI's own Public Sans, its color-mode key and
// default, its icon setup, and its one CSS entry adding tokens, utilities, base rules and a data-accent hue map
// (app/assets/css/main.css). The tests prove none of the Forest theme's look leaks in and that what the product adds works.
export default defineNuxtConfig({
  extends: ['@zooui/nuxt'],

  css: ['~/assets/css/main.css'],

  compatibilityDate: '2025-06-01',
  devtools: { enabled: false },

  // The product's: light unless the user picks dark, remembered under its own key (the base must not move it — a new key
  // resets every user's saved choice).
  colorMode: { preference: 'light', fallback: 'light', storageKey: 'product-color-mode' },

  // The product's icon setup, less its `scan`: scanning finds the icon names written in the layer's components too, so
  // with it on, the test that Z* icons reach the client bundle could pass without the layer registering them.
  icon: {
    mode: 'svg',
    clientBundle: { icons: ['lucide:calendar-days', 'lucide:circle-check', 'lucide:landmark', 'lucide:info'] },
  },
})
