# The base and a theme

## Using the base on its own

A product with a look of its own (say sky and slate, Nuxt UI's sans stack, its own color-mode key) extends this
layer and imports `base.css`. Nuxt UI, the `Z*` components and the mechanisms below arrive; no look does.

```ts
// nuxt.config.ts — a product with its own look: its own color mode and icons stay its own
export default defineNuxtConfig({
  extends: ['@zooui/nuxt'],
  css: ['~/assets/css/main.css'],
  colorMode: { preference: 'light', fallback: 'light', storageKey: 'product-color-mode' },
  icon: { mode: 'svg', clientBundle: { scan: true, icons: [/* the app's own */] } },
})
```

```css
/* app/assets/css/main.css — the app's one Tailwind entry */
@import "@zooui/nuxt/assets/css/base.css";
@theme { --text-sm: 0.9375rem; --color-val-input: light-dark(var(--color-sky-900), var(--color-sky-200)); }
@utility section-label { /* … */ }
@layer base { [data-accent='teal'] { --a-600: var(--color-teal-600); /* … */ } }
```

The palette goes in the product's `app.config.ts` (`ui.colors: { primary: 'sky', neutral: 'slate', … }`), as with
plain Nuxt UI. Tokens, utilities and base rules go after the `base.css` import, in the same entry: one Tailwind
compile, and the product's `@theme` overrides Tailwind's own tokens there.

The layer registers Nuxt UI but **not** the stylesheet: the app owns its single Tailwind entry so it can add
`@source` for components outside its root (and, on a theme, pick a scheme). Two entries would mean two Tailwind
compiles. `apps/forest` shows why it matters: its specimens come from `apps/kitchen-sink`, and until it
declared `@source` for them the page had the right colors and no spacing at all.

Do **not** add `@nuxt/ui`, `tailwindcss` or `@tailwindcss/vite` to a product: the layer owns them, and a second
Tailwind registration fails the build. Wrap the app in `<UApp>`: Nuxt UI mounts toasts, tooltips and overlays
through it. `apps/base` is this layer in a product with its own look; `apps/starter` is the smallest product
on Forest.

## What each layer carries

| | Base — `@zooui/nuxt`, `base.css` | Theme — `@zooui/theme-forest`, `theme.css` |
| --- | --- | --- |
| Nuxt UI | registered (the one Tailwind registration, and the guard against a second) | — |
| Components | every `Z*` component, on Nuxt UI's semantic tokens | — |
| Colors | none: Nuxt UI's defaults until the product's `ui.colors` | `ui.colors` → Forest's palettes; ramps, schemes, per-scheme success/info |
| Typefaces | none: `@nuxt/fonts` on, as Nuxt UI ships | `ui.fonts: false`; Inter and JetBrains Mono (fontsource), behind the six `--zoo-font-*` / `--zoo-features-*` hooks |
| Ground | Nuxt UI's (`--ui-bg`) | Forest's paper under light pages |
| Nuxt UI restyling | none | mono badges, kbd and table headers; striped alerts; toast edges, no progress bar; nu-grid |
| Color mode | untouched: the product's key and default | `storageKey: 'zooui-color-mode'` |
| Also | `color-scheme` on the root, `data-accent` roles, `hatch`, the SSR label fix, Z\* icons bundled, `testing/find-conflicts` | — |

**Why two layers, not an option.** Nuxt merges every layer's `app.config` into the product's, and a product's
app.config can override a key but never remove one: a base that carried Forest's `ui.colors` or its alert restyling
would carry them into every product, and a product could only paint over them one key at a time. A module option
could not help either — the theme is mostly app.config and CSS, which are merged, not executed. So the theme is a
layer of its own that extends the base, and adding it (or not) is the whole choice. The CSS splits the same way:
`forest.css` is `base.css` then `theme.css`.

**The layer and the stylesheet must agree**, and the base fails the build if they don't: an app whose CSS imports
`forest.css` but extends only the base
would get Forest's typefaces and ramps with Nuxt UI's default colors, and the theme layer over `base.css` is half a
theme too. The error names the fix. The guard follows each `css` entry's active `@import` rules (comments aside) to
the files they resolve to, package specifiers included, so it judges what the CSS reaches, not how it is spelled:
`base.css` then `theme.css` counts as `forest.css` (`stylesheet-guard.js`, tested by
`scripts/check-stylesheet-guard.test.mjs`).

**Z\* components in a product's colors.** They are written on Nuxt UI's semantic tokens and palettes (`text-muted`,
`bg-elevated`, `--ui-color-primary-700` …), never on a theme's ramps, so on the base they take the product's primary,
neutral and status colors, in both modes. Where they set a value in mono (`ZKicker`, `ZIdentifier`, `ZCodeBlock`,
`ZQuotaMeter`, `ZEcosystemMark`) they use `font-mono`, which on the base is Tailwind's system mono stack
(`ui-monospace, …`) — the product's, if it sets `--font-mono`. `ZTokenReveal`'s warning is Nuxt UI's outline alert,
unstriped. `apps/base` is the base in a product with its own look, and its tests hold all of this.
