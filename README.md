# Zoo UI

Zoo UI is a component layer for Nuxt products: **Nuxt UI exactly as it ships**, plus `Z*` components for what Nuxt
UI has no equivalent of, colored-edge surfaces, and the mechanisms every product needs. Looks come as separate
theme layers. Forest is the first.

| Package | Use it when |
| --- | --- |
| [`@zooui/nuxt`](packages/nuxt/README.md) | The product has a look of its own. Theme-free: Nuxt UI's defaults until the product sets its own `ui.colors`, and every `Z*` component in the product's colors. |
| [`@zooui/theme-forest`](packages/theme-forest/README.md) | The product wants a ready-made look. Forest extends `@zooui/nuxt` with its colors, page ground, typefaces, accent schemes and Nuxt UI restyling, and carries a plain-CSS/Tailwind design source for non-Nuxt pages. |

Both are MIT-licensed and publishable. Neither has been released yet; inside this repository the apps take them from
the workspace.

## Quick start

A product extends **one** layer and keeps a single Tailwind entry of its own. Don't add `@nuxt/ui`, `tailwindcss` or
`@tailwindcss/vite`: the layer owns them. Wrap the app in `<UApp>`.

**Theme-free:**

```ts
// nuxt.config.ts
export default defineNuxtConfig({ extends: ['@zooui/nuxt'], css: ['~/assets/css/main.css'] })
```

```css
/* app/assets/css/main.css */
@import "@zooui/nuxt/assets/css/base.css";
```

The palette goes in the product's `app.config.ts` (`ui.colors`), as with plain Nuxt UI.

**Forest:**

```ts
// nuxt.config.ts
export default defineNuxtConfig({ extends: ['@zooui/theme-forest'], css: ['~/assets/css/main.css'] })
```

```css
/* app/assets/css/main.css */
@import "@zooui/theme-forest/assets/css/forest.css";
@import "@zooui/theme-forest/schemes/slate-cobalt.css";   /* optional: teal is the default */
```

Forest's schemes: `teal`, `slate-cobalt`, `graphite-violet`, `paper-olive`, `ink-indigo` and `ember`.

## Fonts

Forest's faces are **Inter** and **JetBrains Mono** (SIL Open Font License), self-hosted from fontsource
dependencies, so nothing is fetched from a font CDN. They sit behind six hooks: `--zoo-font-sans`, `--zoo-font-mono`,
`--zoo-font-display` and their OpenType sets `--zoo-features-*`.

Faces that are licensed separately can ship as their own package that sets the six hooks and is imported after
Forest's stylesheet. No `@zooui/*` package depends on any such package.

## Workspace

```
packages/nuxt           @zooui/nuxt: the theme-free layer
packages/theme-forest   @zooui/theme-forest: the Forest theme, and design/, its plain-CSS/Tailwind source
apps/forest             Forest's test app, on the kitchen sink's specimens        (:3001)
apps/base               the theme-free layer in a product with its own look       (:3004)
apps/starter            the smallest product on Forest: copy it to start one      (:3002)
apps/kitchen-sink       Nuxt UI's defaults, untouched: the baseline               (:3003)
scripts                 node --test checks: schemes, icons, the stylesheet guard
```

## Commands

Node 22 or later and pnpm. From the repository root:

```bash
pnpm install
pnpm dev                 # apps/forest on :3001 (also pnpm forest:dev)
pnpm build               # apps/forest (also pnpm forest:build)
pnpm test                # apps/forest's Playwright tests (also pnpm forest:test)
pnpm lint                # ESLint over the whole tree
pnpm scripts:test        # the node --test checks in scripts/
```

Each app has `<app>:dev`, `<app>:build`, `<app>:typecheck` and `<app>:test`, for `forest`, `base`, `starter` and
`ks` (the kitchen sink).

## More

- [`packages/nuxt/README.md`](packages/nuxt/README.md): the theme-free layer and its components; [`docs/`](docs/) has releasing and upgrading Nuxt UI.
- [`packages/theme-forest/README.md`](packages/theme-forest/README.md): Forest's colors, schemes, typefaces and edges.
- [`packages/theme-forest/design/readme.md`](packages/theme-forest/design/readme.md): the design source, for pages without Nuxt.
- The docs site (`apps/docs`), not yet published.
