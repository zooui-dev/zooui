# Adopting Forest across several products

The whole point of this layout is that a change made once reaches every product. That only works if products never edit the design source's files.

## Three ways to consume Forest — pick ONE per application

Forest ships the same design three times, because it has to serve very different runtimes. Shipping
two into one app is the mistake this section exists to prevent: you get two definitions of a
button and two places to change it.

| | Use it when | What you import | What you write |
| --- | --- | --- | --- |
| **The Nuxt layer** — `@zooui/theme-forest` (over the base `@zooui/nuxt`) | the app is Nuxt | the theme's `forest.css` and a scheme, from the package | Nuxt UI components and utilities, plus the layer's `Z*` components |
| **Tailwind + `@theme`** — *canonical for Vue/React and other build-step apps* | the app has a build step and isn't Nuxt | `design/tailwind.css` → `tokens.css` only | utilities, taking the string for each component from `RECIPES.md` |
| **The `ui-*` class layer** | there is no build step — Go `templ`, plain HTML, an email | `design/styles.css` → tokens + components | `class="ui-btn" data-variant="primary"` |

**A Nuxt product uses the layer and nothing else from here.** The layer is Nuxt UI as it ships, with
Forest's colors, ground and typefaces on top; it takes only the raw ramps and the scheme files, and
none of the design source's semantic tokens, utilities or recipes. Setup is in `../README.md` ("Using it"), and
`readme.md` ("In a Nuxt product") maps the design source's vocabulary to Nuxt UI's. The rest of this document is about
the other two routes, except where it says otherwise.

**In a Tailwind application, do not ship the `ui-*` layer.** Every `ui-*` class duplicates what
utilities already express, so shipping it means one large stylesheet you maintain in parallel with
your components. Build each component once as an SFC using utilities, and let `RECIPES.md` be the
source for what those utilities are.

**There is no exception.** Everything in the `ui-*` layer is expressible as utilities, including
the parts that look like they need CSS:

| | utilities |
| --- | --- |
| status circle | `w-2.5 h-2.5 rounded-full bg-ok` |
| status triangle | `w-0 h-0 border-l-[5.5px] border-l-transparent border-r-[5.5px] border-r-transparent border-b-[10px] border-b-warn` |
| dashed ring | `w-2.5 h-2.5 rounded-full border-[1.5px] border-dashed border-danger box-border` |
| bracketed kicker | `before:content-['[_'] before:text-accent after:content-['_]'] after:text-accent` |
| monogram corner geometry | `rounded-[3px_3px_50%_3px]` |
| the hatch | the `hatch` utility in `tailwind.css` |

**One trap when you wire this up.** Forest's base sets `html { font: var(--type-body) }`, which makes
the root font-size 14px — so Tailwind's default `--spacing: 0.25rem` silently renders every spacing
utility at 87.5% of intent (`p-4` becomes 14px). `tailwind.css` pins `--spacing: 4px` to make the
scale immune to it. Keep that.

**Tokens are shared by both routes.** `styles.css` holds the `:root` token sheet and
`tailwind.css` only maps those names onto Tailwind's namespaces, so a token change reaches both
without a second edit.

## The layering rule

Three layers, loaded in this order. Each product owns only the third.

```html
<link rel="stylesheet" href="design/styles.css">            <!-- 1. Forest — NEVER edit downstream -->
<link rel="stylesheet" href="schemes/ink-indigo.css">       <!-- 2. scheme — pick one, don't edit -->
<link rel="stylesheet" href="app.css">                      <!-- 3. yours — product-specific only -->
```

1. **Forest** (`styles.css`, `tailwind.css`) — tokens, base styles, `ui-*` components. Identical byte-for-byte in every product. A fix here is a fix everywhere.
2. **Scheme** (`../schemes/*.css`) — nothing but a `:root` block overriding the raw ramps: neutrals, accent, the success/info pair, and for Ember amber. One per product; see the schemes table in `readme.md`.
3. **Product layer** (`app.css`) — only what is genuinely unique to that product: its own composite components, page layouts, one-off marketing sections. If you find yourself redefining a token or restyling a `ui-*` class here, that belongs in the design source instead — see below.

Corner style is an attribute, not a file: `<html data-corners="tight">`. (Not in Nuxt: there corners are Nuxt UI's `--ui-radius`, and a product that wants squarer ones sets it in its own CSS.)

**In Nuxt**, the package enforces this for you: `extends: ['@zooui/theme-forest']` makes Forest a dependency rather than a copy. The layers are the same three — the theme's `forest.css`, then `@zooui/theme-forest/schemes/<slug>.css`, then the product's own CSS, all in the product's one `main.css` — and a product writes `<UButton>`, not a hand-built button. See `../README.md`.

## Making a change that should reach every product

1. Edit the design source's file in **this** folder — the canonical copy. Schemes and the raw ramps have one copy, in the theme's `../schemes/` (`ramps.css` for the ramps, which `tokens.css` imports): edit them there.
2. Record the change for `@zooui/theme-forest` (`changerig add -p @zooui/theme-forest`; see `docs/releasing.md`): the design source versions with the theme package.
3. Non-Nuxt products take the change by upgrading `@zooui/theme-forest` and importing `@zooui/theme-forest/design/*` (or by copying `design/*.css` and `schemes/` over what's there: nothing to merge, because nobody edited them). Nuxt products take it by upgrading `@zooui/theme-forest`.

Because products never fork the design source, the copy is a straight overwrite — the reason the layering rule matters more than the tooling. However you move the files (submodule, npm package, a copy script in CI, or by hand) the guarantee is the same.

## When a product needs something Forest doesn't have

Two honest options:

- **It's product-specific** — build it in the product layer out of tokens and `ui-*` classes. A billing page's plan-comparison grid belongs to that product.
- **A second product will want it** — add it to the design source as a new `ui-*` class, bump the minor version, and roll it out. Two products hand-rolling the same table variant is the failure mode this structure exists to prevent.

The test: if you'd have to copy it to the next product, it belongs in the design source.

## Things that must not drift

- **Semantic tokens.** Products read `--fg-muted`, not `--pine-600` (in Nuxt, `text-muted`, not `text-pine-600`). Redefining a semantic token in the product layer silently breaks dark mode.
- **The two schemes tables.** The one in `readme.md` and the one in `../README.md`; `scripts/check-schemes.test.mjs` fails when they disagree.
- **The shape exemptions.** `.ui-status .glyph` and `.ui-eco` tiles carry meaning in their geometry and ignore the corner dial. Don't restyle them.
- **The fonts.** Set faces only through the six `--zoo-*` hooks (`readme.md`, "Typefaces"), so a face and its OpenType set change together; don't pick new stylistic sets per product.
- **Voice.** `readme.md`'s voice section applies to every product; consistency in error copy across a family is worth more than a local turn of phrase.

## Derived tokens: re-declare, don't just re-scale

`--radius-*` are computed from `--radius-scale`. A `var()` inside a custom-property
declaration resolves **at the element that declares it**, so descendants inherit the
resolved value, not the formula. Overriding only the input variable therefore does nothing:

```css
/* inert below :root — --radius-sm was already resolved there */
[data-corners="flat"] { --radius-scale: 0; }

/* correct — the radii re-resolve against the local scale */
[data-corners="flat"] {
  --radius-scale: 0;
  --radius-xs: calc(3px * var(--radius-scale));
  --radius-sm: calc(5px * var(--radius-scale));
  --radius-md: calc(8px * var(--radius-scale));
  --radius-lg: calc(12px * var(--radius-scale));
  --radius-pill: calc(999px * var(--radius-scale));
}
```

This applies to any future derived token. If you add one, re-declare it in every block
that overrides its input, and test the override on a container as well as on `<html>`.
