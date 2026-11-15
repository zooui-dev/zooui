// The BASELINE for Zoo UI: Nuxt UI exactly as it ships. It deliberately does NOT extend a Zoo UI layer —
// this is the thing we compare against, and the thing the layers start from (defaults first, Forest's colors on top).
// Nothing here themes anything: no app.config overrides, no extra CSS beyond Tailwind + Nuxt UI's own.
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],

  compatibilityDate: '2025-06-01',
  devtools: { enabled: false },

  css: ['~/assets/css/main.css'],
})
