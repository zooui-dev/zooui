# `@zooui/nuxt`

Zoo UI's theme-free Nuxt layer: **Nuxt UI exactly as it ships**, Zoo UI's `Z*` components for what Nuxt UI has no
equivalent of, colored-edge surfaces, and the mechanisms every product needs. It has no look of its own: everything
is written on Nuxt UI's semantic tokens, so it takes the product's colors, typefaces and color-mode key.

For a ready-made look, extend a theme layer instead: Forest, [`@zooui/theme-forest`](https://github.com/zooui-dev/zooui/blob/main/packages/theme-forest/README.md),
extends this layer with its colors, ground, typefaces and schemes.

## Using it

```bash
pnpm add @zooui/nuxt
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@zooui/nuxt'],
  css: ['~/assets/css/main.css'],
  colorMode: { preference: 'light', fallback: 'light', storageKey: 'product-color-mode' },
})
```

```css
/* app/assets/css/main.css — the app's one Tailwind entry */
@import "@zooui/nuxt/assets/css/base.css";
/* the product's own @theme tokens, @utility and @layer base rules go after it */
```

The palette goes in the product's `app.config.ts` (`ui.colors: { primary: 'sky', neutral: 'slate', … }`), as with
plain Nuxt UI. Three rules:

- **One Tailwind entry.** The layer registers Nuxt UI but not the stylesheet, so the app owns its single entry and
  can add `@source` for components outside its root.
- **No `@nuxt/ui`, `tailwindcss` or `@tailwindcss/vite` in the product.** The layer owns them, and a second
  Tailwind registration fails the build.
- **Wrap the app in `<UApp>`.** Nuxt UI mounts toasts, tooltips and overlays through it.

## Versions

| | Minimum | |
| --- | --- | --- |
| Nuxt | 4.1 | The layer's peer range (`^4.1.0`); tested on 4.5 |
| Nuxt UI | 4.11 (`~4.11.1`) | The layer's dependency; products don't add their own |
| Tailwind CSS | 4.3.3 | Comes with Nuxt UI |
| Node | 22 | Nuxt UI 4.11 needs ≥ 22.12 on the 22 line |

## Components

| Component | What it is |
| --- | --- |
| `ZCard`, `ZModal`, `ZSlideover`, `ZDrawer` | Nuxt UI's surfaces with a `color` that draws a 3px colored edge |
| `ZKicker` | The mono label over a section: `[ DEPLOYMENTS ]` |
| `ZIdentifier` | A package, version or hash in the mono face |
| `ZStatus` | Status by shape, so it survives grayscale |
| `ZSlots` | One named chip per slot of capacity |
| `ZQuotaMeter` | Usage against a limit |
| `ZCodeBlock` | The near-black code surface, with copy |
| `ZTokenReveal` | A shown-once secret, with a warning and an optional acknowledgement |
| `ZEcosystemMark` | A package manager as a two-letter tile |
| `ZThemeToggle` | Light / dark / system |
| `ZRepeatingList` | A generic list editor |
| `ZOrderList` | An ordered list with one selected row and a move toolbar, for master-detail editors |
| `ZNumberInput` | One number input for money, percent, count and hours, with a calc mode |
| `ZDateField` | A calendar-day field on `Temporal.PlainDate` or `CalendarDate`, with Nuxt UI's limit props |
| `ZFileDropOverlay` | Files dropped anywhere in the window, or contained in a dialog or region; nested overlays defer to the innermost |
| `ZFileList` | A form's files, stored and newly added, with an async remove, thumbnails and row slots |
| `ZConfirmDialog`, `ZConfirmButton` | `useConfirm()`'s promise-based questions, and a button that asks in a popover |
| `ZOptionalDate` | A checkbox in front of a `ZDateField`: the date can be edited only while it's ticked |
| `ZSelectMenu` | Nuxt UI's `USelectMenu` with typeahead from the top of the list, Tab that moves on, a focus ring on any focus, and optional open on focus |
| `ZFilterSelect` | A faceted multi-select filter for list and table toolbars: search, counts, All and Clear |
| `ZSearchInput` | A search box for list and table toolbars: handed back once typing pauses, with a clear button and Escape |
| `useNotify()`, `errorMessage()` | Toasts in one line per tone (success, info, warning, error, primary), and readable text for a caught fetch error |

## Docs

- [Components](https://github.com/zooui-dev/zooui/blob/main/packages/nuxt/docs/components.md): every prop, the select-none helpers and the nav marker
  - [ZRepeatingList](https://github.com/zooui-dev/zooui/blob/main/packages/nuxt/docs/repeating-list.md),
    [ZOrderList](https://github.com/zooui-dev/zooui/blob/main/packages/nuxt/docs/order-list.md),
    [ZNumberInput](https://github.com/zooui-dev/zooui/blob/main/packages/nuxt/docs/number-input.md),
    [ZDateField](https://github.com/zooui-dev/zooui/blob/main/packages/nuxt/docs/date-field.md),
    [useConfirm and ZConfirmButton](https://github.com/zooui-dev/zooui/blob/main/packages/nuxt/docs/confirm.md),
    [ZOptionalDate](https://github.com/zooui-dev/zooui/blob/main/packages/nuxt/docs/optional-date.md),
    [ZSelectMenu](https://github.com/zooui-dev/zooui/blob/main/packages/nuxt/docs/select-menu.md),
    [ZFilterSelect](https://github.com/zooui-dev/zooui/blob/main/packages/nuxt/docs/filter-select.md),
    [ZSearchInput](https://github.com/zooui-dev/zooui/blob/main/packages/nuxt/docs/search-input.md),
    [useNotify and errorMessage](https://github.com/zooui-dev/zooui/blob/main/packages/nuxt/docs/notify.md)
- [The base and a theme](https://github.com/zooui-dev/zooui/blob/main/packages/nuxt/docs/base-and-theme.md): what each layer carries, and why they're two layers
- [Accents and colored edges](https://github.com/zooui-dev/zooui/blob/main/packages/nuxt/docs/accents-and-edges.md): `data-accent` sections and the `color` edge
- [Mechanisms](https://github.com/zooui-dev/zooui/blob/main/packages/nuxt/docs/mechanisms.md): `light-dark()`, the hydration label fix, icon bundling, shipping as source
- [Guards and tests](https://github.com/zooui-dev/zooui/blob/main/packages/nuxt/docs/testing.md)
- [Releasing](https://github.com/zooui-dev/zooui/blob/main/docs/releasing.md) and [upgrading Nuxt UI](https://github.com/zooui-dev/zooui/blob/main/docs/upgrading-nuxt-ui.md)

## Developing

```bash
pnpm base:dev                   # → http://localhost:3004 — this layer alone, in a product's own look
pnpm base:build && pnpm base:test
pnpm ks:dev                     # → http://localhost:3003 — the baseline: Nuxt UI as it ships
```

`apps/base` is this layer in a product with its own look; `apps/starter` is the smallest product on Forest.
