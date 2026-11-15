# Mechanisms the base carries

**`color-scheme` on the root, for `light-dark()`.** Tailwind 4's production build (Lightning CSS) compiles
`light-dark()` into variables it defines only where `color-scheme` is declared. color-mode only toggles the `dark`
class, and Nuxt UI declares `color-scheme` on `<body>` — but `@theme` tokens live on `:root`, so a token like
`--color-x: light-dark(#fff, #000)` came out empty in production while dev looked right. The base declares
`:root { color-scheme: light } .dark { color-scheme: dark }`. On a Forest product it changes nothing on the page (the
Forest app and the starter were compared pixel for pixel, light and dark, before and after); the browser's own page
scrollbar now follows dark mode.

**UFormField labels after hydration.** Nuxt strips `onServerPrefetch` from the client production bundle, but Vue
counts each component that registers one (every `UIcon` in svg mode) as an async boundary when it hands out
`useId()` ids. Stripped on the client only, the ids after an icon drift: hydration re-sets a `UInput`'s id while its
label keeps the server's `for`, and the field loses its name. The base removes `onServerPrefetch` from
`optimization.treeShake.composables.client.vue` — filtered out of Nuxt's list, so every other composable it
tree-shakes still is.

**Z\* icons in the client bundle.** The icons the `Z*` components render (`ZThemeToggle`'s, `ZTokenReveal`'s) are
added to the consumer's client icon bundle through `@nuxt/icon`'s `icon:clientBundleIcons` hook, as Nuxt UI adds its
own — whatever the product's `icon` options, and without touching its list. A product need not list them.
`scripts/check-icons.test.mjs` holds the layer's list to what `components/` uses. Most of them (sun, moon, monitor,
triangle-alert, check, circle-check, x, plus, chevron-up, chevron-down) are also Nuxt UI's own default icons,
which Nuxt UI bundles anyway; `ZRepeatingList`'s pencil and trash-2 and `ZDateField`'s calendar are not, so only the
layer's registration puts them in the bundle. The base app's tests hold the outcome
(Z\* icons render with no request for icon data), and a `ZDateField` that mounts in the browser on a page of its own
(`apps/base/app/pages/date-field-later.vue`) fails that test when `lucide:calendar` is taken out of the list.

**Shipping as source.** The package is TypeScript and `.vue`, not built output, and needs nothing from a product:
Nuxt adds every layer root under `node_modules` to `build.transpile` and transpiles component directories there
itself, and neither layer has a `server/` directory or module of its own for Nitro to parse, so no `nitro.esbuild`
setting is needed either. The workspace apps consume it as
`workspace:*`, which resolves outside `node_modules`; an npm install is the `node_modules` case above.
