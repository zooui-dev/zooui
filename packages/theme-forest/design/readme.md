# Forest — the design source

Forest is Zoo UI's first theme. This folder is its plain-CSS and Tailwind source, for pages without Nuxt. Forest is a quiet, dense interface system for developer-facing products. Ink on a green-tinted neutral ground, one teal accent, near-black code surfaces in both themes, and a single texture. Built for interfaces whose real job is *copying a value* and *checking that a thing arrived* — dashboards, consoles, package and infrastructure tools, admin backoffices — and it holds up on marketing pages for the same products.

Link one stylesheet and you have it:

```html
<link rel="stylesheet" href="design/styles.css">
```

On a page with no bundler, serve the package's `design/` and `schemes/` folders side by side (copy both from
`node_modules/@zooui/theme-forest/` into the served tree): `tokens.css` imports `../schemes/ramps.css`, and a scheme is
linked as `schemes/<slug>.css`. With a bundler, `@import "@zooui/theme-forest/design/styles.css"` instead.

Tailwind v4 instead:

```css
@import "tailwindcss";
@import "@zooui/theme-forest/design/tailwind.css";
```

Open `index.html` to see every component at real size, light and dark.

**Building a Nuxt product?** Use neither: extend `@zooui/theme-forest` (this package: `../`), which is Nuxt UI as
it ships with Forest's colors, ground and typefaces on top ([`../README.md`](../README.md)). (`@zooui/nuxt`, which it extends, is the theme-free base: a
product that extends it alone gets none of Forest's look.) It shares Forest's raw ramps and schemes (`../schemes/`) with this folder and
leaves the design source's semantic tokens and `ui-*` classes behind — see [In a Nuxt product](#in-a-nuxt-product).

## Fundamentals

**Never hard-code a value the tokens carry.** Colors go through semantic names (`--fg-muted`, `--bg-raised`, `--accent-text`, `--border-strong`), never the raw ramps. Spacing is a 4px scale. Type is three composite styles per role, not ad-hoc sizes.

**Theming.** `data-theme="dark"` or `"light"` on `<html>`; omit the attribute to follow the OS. Every semantic token flips; component classes and Tailwind utilities need no dark variants.

**Rebranding.** Two edits, plus one optional dial on plain-HTML and Tailwind pages (`data-corners="flat"` squares every corner in the system; Nuxt products have no dial — see Radius below). Swap the `--teal-*` ramp for your accent hue (keep nine steps, keep the light steps light), and swap the three `--zoo-font-*` families (see Typefaces below). One constraint to check: step 500 is the primary button fill with a white label on the light theme, so it must clear 4.5:1 against white — green and teal hues need a deeper 500 than blues and violets do. The neutral ramp is deliberately near-gray, so most accents sit on it without further work. Leave the semantic layer alone.

## Typefaces

No font files ship with Forest. The faces sit behind six hooks, the same ones the Nuxt theme uses: `--zoo-font-sans`, `--zoo-font-mono`, `--zoo-font-display` and their OpenType sets `--zoo-features-sans`, `--zoo-features-mono`, `--zoo-features-display`. `tokens.css` declares them in a cascade layer, naming Inter and JetBrains Mono with system fallbacks, so a page that loads no webfont renders in the system faces, and any unlayered override wins.

- **Inter and JetBrains Mono** (SIL Open Font License), self-hosted from fontsource: `npm install @fontsource-variable/inter @fontsource-variable/jetbrains-mono` (`@zooui/theme-forest` depends on both), then `@import` their CSS beside Forest's in a Tailwind or bundled entry: `@fontsource-variable/inter/opsz.css`, `@fontsource-variable/inter/opsz-italic.css`, `@fontsource-variable/jetbrains-mono/wght.css` and `@fontsource-variable/jetbrains-mono/wght-italic.css`. With no bundler, copy each package's CSS together with its `files/` folder into the served tree (the CSS loads its fonts from `./files/`) and `<link>` it beside `styles.css`. The hooks already name them.
- **Licensed faces**: faces that are licensed separately can ship as their own package that sets the six hooks and is loaded after Forest's stylesheet, so faces and sets switch together.

## Schemes

Forest is a family system: sibling products share the neutrals, type, spacing and components, and differ by accent ramp. Give each product its own scheme, so two products don't end up with the same accent. The scheme files are the theme's own, in `../schemes/`; there is no second copy here. The same table is in `../README.md`; `scripts/check-schemes.test.mjs` fails when the two disagree.

The neutral ramp keeps its name in every scheme: `--pine-*` (and the `pine` palette in Tailwind) is Forest's gray ramp, because a pine is a forest tree. The accent ramp is `--teal-*`, whatever its hue.

| Scheme | Accent 500 | File | Specimen |
| --- | --- | --- | --- |
| Teal | `#117d72` | `../schemes/teal.css` (the default) | `index.html` |
| Slate · Cobalt | `#2a63d8` | `../schemes/slate-cobalt.css` | `index-slate-cobalt.html` |
| Graphite · Violet | `#8c4ec6` | `../schemes/graphite-violet.css` | `index-graphite-violet.html` |
| Paper · Olive | `#40701f` | `../schemes/paper-olive.css` | `index-paper-olive.html` |
| Ink · Indigo | `#5a51d4` | `../schemes/ink-indigo.css` | `index-ink-indigo.html` |
| Ember · Amber | `#a85410` | `../schemes/ember.css` | `index-ember.html` |

`index-ink-indigo-authored.html` is **not** a scheme — it's a worked example of pushing the tokens harder (mono-led interface, display/label contrast, asymmetric column, flat corners). Read it for technique; it is not a scheme to adopt.

Using a scheme: link `../schemes/<slug>.css` after `styles.css` (a Nuxt product imports `@zooui/theme-forest/schemes/<slug>.css` instead). Nothing else changes — and because the scheme lives in one file, editing an accent updates every product using it. See `ADOPTING.md` for the layering rule and how to make a change that reaches every product.

Each scheme also declares a **success and info pair** (`--success-*`, `--info-*`) chosen to sit at least 30° of OKLCH hue away from its accent, so neither reads as the primary. The design source's own semantic tokens don't read them yet (`--ok` is still the accent); the Nuxt layer does, for Nuxt UI's `success` and `info`. `../README.md` has the pairs and how they were chosen.

## In a Nuxt product

A Nuxt product extends `@zooui/theme-forest` (which brings the theme-free base, `@zooui/nuxt`, with it; the base alone carries none of Forest's look) and writes Nuxt UI, not the design source: no `styles.css`, no `tailwind.css`, no `ui-*` classes and no `RECIPES.md` strings. The layer takes only Forest's raw ramps (`--pine-*`, `--teal-*`, `--amber-*`, `--red-*`) and the scheme files (`../schemes/`), and points Nuxt UI's colors at them; geometry — radius, spacing, shadows, motion, focus — is Nuxt UI's. Setup is in `../README.md`, "Using it".

What follows still holds for a Nuxt product — the voice, the contrast floors, status by shape, code dark in both themes — but the vocabulary is Nuxt UI's. The nearest names:

| Design source (token · Tailwind utility) | Nuxt UI |
| --- | --- |
| `--bg` · `bg-bg` — the page ground | not a utility: the layer paints `body` with Forest's paper. Don't paint a wrapper over it |
| `--bg-raised` · `bg-raised` | `bg-default` |
| `--bg-sunken` · `bg-sunken` | `bg-elevated` |
| `--fg` · `text-fg` | `text-highlighted` (headings, values) / `text-default` (body) |
| `--fg-muted` · `text-fg-muted` | `text-muted` |
| `--fg-subtle` · `text-fg-subtle` (never text) | `text-dimmed` — the same caution applies |
| `--border` · `border-border` | `border-default` |
| `--border-strong` · `border-border-strong` | `border-accented` |
| `--accent`, `--accent-text` · `bg-accent`, `text-accent-text` | `primary`: `bg-primary`, `text-primary`, `color="primary"` |
| `--ok`, `--warn`, `--danger` · `text-ok` … | `success` (the scheme's pair, not the accent), `warning`, `error` |
| `--bg-code`, `--fg-on-code` · `bg-code`, `text-on-code` | no Nuxt UI equivalent: `<ZCodeBlock>` |
| `--radius-*`, `data-corners` · `rounded-*` | Nuxt UI's `--ui-radius` (see Radius below) |
| `type-h1` … `type-body-sm`, `features-*` | Tailwind sizes and weights (`font-display` for display); the face's OpenType set comes with the face |
| `ui-*` classes, `RECIPES.md` strings | Nuxt UI components, plus the layer's `Z*` components for what Nuxt UI lacks |

## Contrast — which inks may carry text

The ramp supports **two** legible text tiers, not three. Both themes:

| Token | Use | Floor |
| --- | --- | --- |
| `--fg` | primary text | passes everywhere |
| `--fg-muted` | secondary and explanatory prose | ≥4.5:1 on `--bg`, `--bg-sunken`, `--bg-raised`, `--bg-code` |
| `--fg-subtle` | **never text** — rules, tick outlines, meter marks, disabled chrome | 2.9–3.7:1 · fails |

`--fg-subtle` looks like a third tier and is not one. It cannot reach 4.5:1 on any surface in
either theme, and it cannot be raised: the only value that clears the floor is `--pine-400`,
which is already `--fg-muted`. **To make prose quieter, reduce its size, not its contrast** —
11.5px `--fg-muted` against 13px body reads as secondary and stays legible. That is also how
the rest of the system expresses rank.

One surface is not in that table on purpose: **`--bg-code-inline` takes `--fg` only.** It is a
mid-tone chip, so `--fg-muted` on it is 3.67:1 — this is why `.ui-ident[data-kind="hash"]`
separates itself by weight and tracking rather than by color.

Two habits follow: don't carry meaning in a color alone (status is shape-coded for the same
reason), and don't tint text that already sits on a tint.

## Voice

- Plain, declarative, competent. State the fact, then the action: “Storage limit reached — 10.0 of 10 GB. Publishes are refused; installs keep working.”
- Sentence case everywhere, including buttons and table headers (the kicker style renders headers uppercase for you).
- Second person, no first-person-plural chattiness. No exclamation marks, no emoji, no “Oops”.
- Errors name the thing that failed and the request id. Irreversible actions say “This cannot be undone” in the body, not just on the button.
- Anything a person might paste is monospace and copyable. Prefer showing the line to describing it.
- Numbers are exact and tabular: “9.1 / 10 GB”, “142 packages · 1,204 versions”.

## Visual foundations

- **Color.** A green-tinted neutral ramp (“pine”, `--pine-0…950`) with one accent, teal, used for the primary action, links, focus, and highlighted values inside code. Amber means *near a limit*, red means *danger or over*; neither is ever decorative. Everything else is ink on ground.
- **Type.** Three roles, each behind a hook: **display** (`--zoo-font-display`, 500 weight, −0.025em, headlines only), **UI** (`--zoo-font-sans`; use the named weights 400/500/600 and let `font-optical-sizing: auto` use an optical-size axis where the face has one), **code** (`--zoo-font-mono`, every identifier, kicker and code block). Each role's OpenType set travels with its face in `--zoo-features-*`: Inter `normal`, JetBrains Mono `"calt" 0` (code ligatures off so pasted text reads literally); tables add tabular figures. See [Typefaces](#typefaces).
- **Code is dark in both themes.** `--bg-code` is near-black even on the light theme. Code blocks are the signature surface; they should look like a terminal, not like a quote.
- **Spacing.** 4px scale. Rows 40px, dense 32. Controls 32, large 40. Content max 1120.
- **Radius.** 3/5/8/12 — soft, never pill-shaped. Pills only for status chips. The whole scale is driven by one dial, `--radius-scale`: leave it at `1` for soft corners, `data-corners="tight"` for half radius (1.5/2.5/4/6 — reads as a chamfer rather than a curve), or `data-corners="flat"` for square edges. Any of the three can go on `<html>` or on a single container. Two things deliberately ignore it — the status glyphs and the monogram tiles — because their shape *is* the information. The dial is the design source's, for plain-HTML and Tailwind pages: in a Nuxt product corners are Nuxt UI's `--ui-radius` (4px base, close to `tight`), set by the product if it wants squarer ones — an open decision in `packages/nuxt/README.md`.
- **Rules & edges.** 1px `--border`; table header rules use `--border-strong`. Elevation is an edge plus a soft ambient shadow, never stacked shadows.
- **The hatch.** `--hatch` (45° 1px stripes in `currentColor`) is the one texture: a consumed meter, a notice's left edge, a blocked region. It reads as “filled” without relying on color.
- **Status by shape.** Circle = healthy, triangle = near limit, square = stopped, dashed ring = unreachable, hollow ring = quiet. Color reinforces; shape carries.
- **Motion.** 120–180ms ease-out, on color and width only. No bounces, no entrance animation.
- **Focus.** A 2px accent ring offset by 2px of ground. Never the browser default.
- **Imagery.** None by default. The hero object on a marketing page is a code block, not an illustration.
- **Layout.** Flush left. Detail pages are a content column plus a narrow right rail. Tables full-width; expansion rows tinted `--bg-sunken`.

## Do

- Let the density work: dense rows, tabular numbers, exact values.
- Use one accent, sparingly, and let the neutrals carry the page.
- Put every pasteable value in mono, with a copy affordance.
- Reinforce state with shape, so the UI survives grayscale and color-blindness.

## Don't

- Don't tint large areas with the accent, or introduce a second hue.
- Don't use color as the only carrier of meaning.
- Don't soften code surfaces to match the page — they stay near-black.
- Don't add a shadow where an edge will do.

## Components

Classes are `ui-*`. Every one is in `index.html`, and `RECIPES.md` gives the equivalent Tailwind utility string (plus templ snippets).

Button · Input · Select · Switch · Segmented · Tag · Kicker · Card · Tabs · Table · Dialog · Drawer · Toast · Tooltip · Banner · Nav — plus the ones that make this system what it is: **CodeBlock** (inline / single copyable line / multi-line block, with a highlighted secret), **Identifier** (a literal string someone will paste), **Meter** (usage against a limit, amber from 80%, hatched red at 100%) and **Status** (shape per state).

Product-specific parts belong in your app, not here; `RECIPES.md` ends with two worked examples of extending the system without breaking it.

## Files

- `styles.css` — the only stylesheet: tokens, base element styles, and the `ui-*` component layer.
- `tailwind.css` — Tailwind v4 `@theme` mapping, `@utility type-*`, `hatch`, `focus-ring`, and a `dark:` variant keyed to `data-theme`.
- `RECIPES.md` — every component as a utility string, with templ snippets.
- `index.html` — the specimen sheet. Open it. `index-*.html` are alternate accent schemes (each overrides only the two ramps); `index-ink-indigo-authored.html` is a deliberately opinionated variant — mono-led interface, 76px display against 10px labels, a 640px asymmetric column, zero radius, edges instead of shadows — kept as a reference for how far the tokens stretch when you want the result to look authored rather than safe.
- `../schemes/` — one file per accent scheme; the only thing a product overrides. The theme's own folder, shared by the Nuxt theme and this design source, with `ramps.css` (the raw ramps `tokens.css` imports).
- `ADOPTING.md` — the three ways to consume Forest, the three-layer rule, and how to make a change that reaches every product.
- `CHANGELOG.md` — the design source's changelog; it versions with `@zooui/theme-forest`.
- The Nuxt layers are not here: Forest's is `@zooui/theme-forest` (`../`, the package this folder is part of), over the theme-free `@zooui/nuxt` in `packages/nuxt/`.
- `reference/` — React reference components (`*.jsx` + `.d.ts` + `.prompt.md`, from `Button` to `EcosystemMark` and `TokenReveal`) and two specimen cards that render them (`core.card.html`, `core-dark.card.html`) on `styles.css`. Read them for behavior and props; nothing imports them, and the package does not ship them. The Nuxt layer's `Z*` components are their counterparts.
- `SKILL.md` — agent skill wrapper.
