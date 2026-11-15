# `@zooui/theme-forest`

Forest, Zoo UI's first theme: a quiet, dense look for developer-facing products. It is ink on a green-tinted neutral
ground, with one accent per scheme and near-black code surfaces in both modes. It is a Nuxt layer that extends the
theme-free [`@zooui/nuxt`](https://github.com/zooui-dev/zooui/blob/main/packages/nuxt/README.md) with Forest's colors, page ground, typefaces, accent schemes and a few
Nuxt UI restylings. Geometry (radius, spacing, shadows, motion, focus) stays Nuxt UI's.

The package also carries Forest's plain-CSS/Tailwind **design source** in [`design/`](design/readme.md), for pages
that aren't Nuxt: tokens, the `ui-*` component classes, specimens and React reference components.

```bash
pnpm forest:dev                 # → http://localhost:3001 (the baseline: pnpm ks:dev → :3003)
pnpm forest:build && pnpm forest:test
pnpm starter:dev                # → http://localhost:3002 — the smallest product on Forest
```

## Using it

A Forest product extends this layer (which brings `@zooui/nuxt` with it) and imports `forest.css`, which is the
base's `base.css` then the theme's `theme.css`:

```ts
// nuxt.config.ts
export default defineNuxtConfig({ extends: ['@zooui/theme-forest'], css: ['~/assets/css/main.css'] })
```

```css
/* app/assets/css/main.css — the app's ONE Tailwind entry */
@import "@zooui/theme-forest/assets/css/forest.css";
@import "@zooui/theme-forest/schemes/ink-indigo.css";   /* the product's scheme (Teal if none) */
```

Everything in [`@zooui/nuxt`'s README](https://github.com/zooui-dev/zooui/blob/main/packages/nuxt/README.md) applies: one Tailwind entry, no `@nuxt/ui` or
`tailwindcss` of the product's own, `<UApp>` at the root, the `Z*` components and the guards. The layer and the
stylesheet must agree: extending this layer with only `base.css`, or the base with `forest.css`, fails the build.
`../../apps/starter` is the smallest product on Forest; copy it to start one.

## How the color gets in

Nuxt UI chooses its semantic colors from Tailwind palettes by name. `assets/css/theme.css` registers Forest's ramps
as palettes, and `app.config.ts` points Nuxt UI at them:

| Nuxt UI | Forest ramp | Palette |
| --- | --- | --- |
| `primary` | the scheme's accent (`--teal-*`) | `accent` |
| `neutral` | the pine grays (`--pine-*`) — every surface, text and border | `pine` |
| `secondary` | the pine grays — Forest's secondary is muted, not a second hue | `pine` |
| `success`, `info` | **per scheme** — each scheme file declares its own pair (below) | `pine-success`, `pine-info` |
| `warning` | amber | `pine-amber` |
| `error` | clay red | `pine-red` |

The neutral ramp keeps its name: `--pine-*` and the `pine-*` palettes are Forest's grays (a pine is a forest tree).
The accent ramp is `--teal-*` in every scheme; a scheme redefines its values.

**Success and info, per scheme.** They carry fixed meanings, so they must never read as the primary. But Forest's
accents span most of the hue wheel, so no single green and blue can stay clear of all of them. Each scheme file
therefore declares a pair (`--success-*`, `--info-*`, Tailwind's palette values) chosen to sit at least 30° of OKLCH
hue away from its accent, and the layer's `pine-success` / `pine-info` palettes read them — so a static scheme import
and `apps/forest`'s live switcher both carry the right pair.

| Scheme | Accent | Success | Info |
| --- | --- | --- | --- |
| Teal | teal | green | sky |
| Slate · Cobalt | cobalt | green | cyan |
| Graphite · Violet | violet | green | blue |
| Paper · Olive | olive | teal | blue |
| Ink · Indigo | indigo | green | cyan |
| Ember · Amber | amber | green | blue |

Chosen by measurement (smallest primary-to-status hue gap): mapping them to the accent
made success purple on Ink · Indigo; pinning a teal success and a cobalt info put success at **0°** on Teal and info
at **0°** on Slate · Cobalt; Nuxt UI's green and blue put info at **3°** on Slate · Cobalt. Per scheme's tightest
case is green success on Teal at **36°**. A test holds every scheme to ≥30°.

Everything downstream is Nuxt UI's own logic: which shade paints a hover, picking 400 instead of 500 in dark
mode, the alpha steps behind soft and subtle variants. Where Forest's ramps are sparse (amber and red have only
100/300/500/700/900) the missing shades are interpolated with `color-mix`, so a scheme change still carries
through every shade.

**Ground.** Nuxt UI paints the light page with `--ui-bg` (white), the same token its cards, inputs, menus and
overlays use. Forest separates the two, so the layer changes the *page ground* to Forest's paper (`--pine-50`) and
leaves `--ui-bg` white: everything Nuxt UI draws on `bg-default` stays white and reads as raised. Dark mode keeps Nuxt
UI's ground — its neutral-900 already is Forest's dark ground. An app that paints its own wrapper with `bg-default`
hides the ground; let the body show through.

## Schemes

A scheme only redefines raw ramps (`--pine-*`, `--teal-*`, its success/info pair, and for Ember `--amber-*`), so
importing it after the layer's stylesheet is all it takes. The same table is in
[`design/readme.md`](design/readme.md#schemes); `scripts/check-schemes.test.mjs` fails when the two disagree.

| Scheme | File | Accent 500 | Character |
| --- | --- | --- | --- |
| Teal | `schemes/teal.css` | `#117d72` | green-tinted gray, teal accent; the default |
| Slate · Cobalt | `schemes/slate-cobalt.css` | `#2a63d8` | cool blue-gray, cobalt accent (the starter's) |
| Graphite · Violet | `schemes/graphite-violet.css` | `#8c4ec6` | neutral gray, violet accent |
| Paper · Olive | `schemes/paper-olive.css` | `#40701f` | warm paper, olive accent |
| Ink · Indigo | `schemes/ink-indigo.css` | `#5a51d4` | violet-tinted gray, indigo accent (`apps/forest`'s) |
| Ember · Amber | `schemes/ember.css` | `#a85410` | warm gray, amber accent |

## Typefaces

Forest's faces are **Inter** (interface and display) and **JetBrains Mono** (code and values), both under the SIL
Open Font License and self-hosted from `@fontsource-variable/inter` and `@fontsource-variable/jetbrains-mono`, which
the theme depends on: the files ship with the build and nothing is fetched from a font CDN (the theme sets
`ui.fonts: false`, so Nuxt UI's `@nuxt/fonts` fetches nothing either). Inter is the opsz build, upright and drawn
italic, so display sizes get Inter's display cut.

Each role is two hooks, a family and its OpenType set, declared in a cascade layer (`@layer base`) so any
unlayered override wins whatever the import order:

| Hook | Forest's default |
| --- | --- |
| `--zoo-font-sans`, `--zoo-font-display` | `"Inter Variable"`, then system faces |
| `--zoo-font-mono` | `"JetBrains Mono Variable"`, then system monos |
| `--zoo-features-sans`, `--zoo-features-display` | `normal` (these Inter files carry no stylistic sets) |
| `--zoo-features-mono` | `"calt" 0`: JetBrains Mono's code ligatures off, so pasted text reads as typed |

Every place the theme sets a face reads the hooks: Tailwind's `--font-sans`, `--font-mono` and `--font-display`
and their `--font-*--font-feature-settings`, and preflight's page and `code`/`kbd`/`pre` defaults, so switching the
face switches the set. Mono is also where Forest sets a value in Nuxt UI: **badges, table and grid headers**
(Forest's kicker: mono, xs, uppercase, tracked, muted) and **keyboard keys**, the face only; table and grid cells
take tabular figures. `font-display` is available but not applied: Nuxt UI doesn't style headings, so where it
goes is a product decision (the starter's heading uses it at 500 with `tracking-tight`).

**Licensed faces.** Faces that are licensed separately can ship as their own package (here `@acme/licensed-fonts`)
that a product installs and imports after Forest; it sets the six hooks, so its faces and their sets replace Inter and
JetBrains Mono. Its own conflict checks can sit beside `findConflicts`.

```css
@import "@zooui/theme-forest/assets/css/forest.css";
@import "@zooui/theme-forest/schemes/ink-indigo.css";
@import "@acme/licensed-fonts/fonts.css";
```

## Colored edges

`@zooui/nuxt` gives cards and overlays a 3px edge in their color ([its colored edges](https://github.com/zooui-dev/zooui/blob/main/packages/nuxt/docs/accents-and-edges.md#colored-edges)).
Forest adds the same edge to the two surfaces Nuxt UI already colors, through `app.config.ts`, so there is nothing
new to learn:

| Surface | How | Edge |
| --- | --- | --- |
| Toast | `useToast().add({ color })`; no progress bar | left |
| Banner | `<UAlert color="…" variant="outline">` | left, **striped** |

**Striping.** Alerts take Forest's hatched edge (the design source's RECIPES, "Banner (hatched edge)"): a 6px strip
of diagonal stripes in the alert's color, drawn as a `::before` with the `hatch` utility (stripes in
`currentColor`). It is on every variant; on `solid`, where the surface is already the color, the strip goes white
so it still shows. `variant="outline"` is Forest's banner itself — a plain raised surface, neutral text and border,
with only the strip and icon carrying the color. Use Nuxt UI's `orientation="horizontal"` to put the actions on the
right.

## nu-grid

For products that use nu-grid (`@nu-grid/nuxt`), the theme's `app.config.ts` carries a `nuGrid` key — inert
otherwise, and the layer does not depend on nu-grid (`apps/forest` installs it):

| | |
| --- | --- |
| Color | free — nu-grid themes through Nuxt UI's tokens |
| Density | nu-grid's own: `default` unless a grid or app picks `compact` |
| Header | Forest's kicker, in the mono face — through `ui.table`, which nu-grid inherits — and group labels the same |
| Group band | neutral (`bg-elevated/50`), **3px** accent leading edge on both modes |
| Cells | tabular figures |

The band overrides spell out `dark:` too: tailwind-merge only replaces a class with the same variant, and
`compact` tints its band `dark:bg-primary/12`. Tests check the band and edge in light and dark on both modes.

## The tests prove "color only"

`../../apps/forest/tests/forest.spec.ts`: Forest's accent, red and amber are what the buttons paint; Forest's
neutrals drive border and text; `--ui-radius` and a button's height, padding, radius and weight are Nuxt UI's
measured values; the specimen layout matches the baseline; overlays still trap and return focus; and dark mode picks
the 400 accent shade by Nuxt UI's own rule. `../../apps/forest/tests/components.spec.ts` covers the `Z*` components
on every scheme in both modes, the mono placements, and runs the guards over the whole page; `fonts.spec.ts` holds
the faces, their sets and the hook contract.

## The design source

[`design/`](design/readme.md) is Forest for pages without Nuxt: `styles.css` (tokens, base styles and the `ui-*`
classes, for plain HTML or Go templ), `tailwind.css` (the Tailwind v4 mapping, with [`RECIPES.md`](design/RECIPES.md)
giving each component as a utility string), specimen pages, and React reference components. It shares the raw ramps
and the scheme files (`schemes/`) with the Nuxt theme. [`design/ADOPTING.md`](design/ADOPTING.md) says which of the
three routes to use, and why only one per app.

Releasing is shared with the base: [docs/releasing.md](https://github.com/zooui-dev/zooui/blob/main/docs/releasing.md). Record design source
changes with `changerig add -p @zooui/theme-forest`.
