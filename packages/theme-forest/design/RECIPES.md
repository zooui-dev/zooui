# Forest × Tailwind v4 — recipes

Wire-up:

```css
@import "tailwindcss";
@import "./tailwind.css";   /* tokens.css (tokens + base, in @layer base) and the @theme mapping — no ui-* layer */
```

Fonts: none ship here. The faces are the `--zoo-font-*` hooks in `tokens.css`; `readme.md`, "Typefaces", says how to load Inter and JetBrains Mono, or licensed faces.

**In a Nuxt app, don't use these strings: use `@zooui/theme-forest`.** The layer is Nuxt UI as
it ships, in Forest's colors and typefaces, and it reads none of the design source's semantic utilities — a Nuxt product
writes Nuxt UI components and Nuxt UI's utilities (`readme.md`, "In a Nuxt product", maps the names). The
strings stay canonical for everything else — Go templ with Tailwind, React, plain markup.
Dark mode: set `data-theme="dark"|"light"` on `<html>`; omit it to follow the OS. `dark:` utilities work in both cases.

Naming: colors are semantic, never raw — `bg-bg bg-sunken bg-raised bg-code`, `text-fg text-fg-muted` (never `text-fg-subtle` — not a text color), `text-accent-text bg-accent border-accent`, `text-warn-text bg-warn-soft`, `text-danger-text border-danger`, `border-border border-border-strong`. Type composites are one class: `type-h1 type-body-sm type-kicker type-code type-ident`. Spacing is a 4px scale matching `--space-*`. `tailwind.css` pins `--spacing: 4px` explicitly so the scale holds even if a host app changes the root font-size.

**`text-fg-subtle` is not a text color** — see the Contrast section of `readme.md`. Use it for rules, tick outlines and disabled chrome; quiet prose is `text-fg-muted` at a smaller size.

---

## Never stack a `type-*` composite with a size, weight, family or leading utility

`type-label text-xs` is **order-dependent**: the composite sets `font:` shorthand — family, size,
weight and line-height at once — and both classes land in Tailwind's utilities layer, so the
generated order decides which font-size wins, not the order you wrote them in. The same hazard as
writing `px-3 px-2`.

When you need a composite at a different size or weight, use the longhands instead:

| instead of | write |
| --- | --- |
| `type-label text-xs` | `font-sans font-medium text-xs leading-[1.2]` |
| `type-kicker normal-case text-xs` | `font-mono font-medium text-xs leading-[1.2] features-mono` |
| `type-code text-lg` | `font-mono font-normal text-lg leading-code` |

Longhand expansions of every composite:

```
type-display   font-display font-medium text-4xl leading-tight
type-h1        font-display font-medium text-3xl leading-tight
type-h2        font-display font-medium text-2xl leading-snug
type-h3        font-sans    font-semibold text-lg leading-snug
type-body      font-sans    font-normal text-md leading-normal
type-body-sm   font-sans    font-normal text-sm leading-normal
type-label     font-sans    font-medium text-sm leading-[1.2]
type-kicker    font-mono    font-medium text-xs leading-[1.2]   (+ tracking-kicker uppercase)
type-code      font-mono    font-normal text-sm leading-code
type-code-sm   font-mono    font-normal text-xs leading-code
type-ident     font-mono    font-medium text-sm leading-[1.3]
```

Use the composite when you want it whole; use longhands the moment you override one part of it.

**Every `type-*` composite needs an explicit `@utility` rule.** `@utility type-* { font: --value(--type-*) }` resolves against `@theme` keys, but the composites live in `:root` as `font` shorthand — so that form generates nothing and the class silently does nothing. All eleven are declared explicitly in `tailwind.css`; add a rule there if you add a composite.

**A family utility travels with its feature set.** Stylistic-set numbers are per face, so `font-sans`, `font-mono` and `font-display` each go with `features-sans` (or `features-sans-tabular`), `features-mono` and `features-display` — a bare family class switches the face and keeps the INHERITED set (a sans pill in a code block renders with the mono sets). A `font:` shorthand resets features, so anything declaring one declares its set after it. Check computed, not by reading: compare each text element's `font-family` with its `font-feature-settings`.

**Arbitrary values cannot contain spaces.** A `class` attribute splits on whitespace, so `[mask-image:url("…<svg xmlns='…'/>")]` silently becomes several invalid classes and Tailwind generates none of them. Use `_` for spaces, or — for anything as long as a data URL — put the value in a custom property via `:style` and reference it: `[mask-image:var(--chevron)]`.

## Tailwind traps in this system

**Mutually exclusive, not base + override.** A selected state must replace the unselected classes, not sit on top of them: `cx(opt, selected ? on : off)`, never `cx(opt, off, selected && on)`. Two classes setting one property in the same layer let generated order decide, and the selected item silently stays muted. Same rule for variant vs base (border color), size vs base (padding, height, font-size) and elevation vs base (border color) — the property must be set in exactly one place.

Three things that render without error but wrongly.

**Type is set on `body`, not `html`.** `font: var(--type-body)` is 14px, and putting it on `html` would make `1rem = 14px` — silently shrinking every rem-based value Tailwind emits (text sizes, container widths, radii, blur, arbitrary rems) to 87.5% of intent. The design source's tokens are all px, so nothing needs a 14px root. `tailwind.css` also pins `--spacing: 4px` as belt-and-braces.

**Never `all: unset`, or any broad `[property:value]` arbitrary utility.** `[all:unset]` resets every
property including `display`, and Tailwind's *generated* order — not class order — decides the
winner, so it silently clobbers `flex`/`items-center`/`justify-between` on the same element. To strip
UA chrome from a `<button>` use explicit resets: `appearance-none font-[inherit] text-[inherit]
text-left m-0`, plus `bg-transparent border-0 p-0` where the element does not declare its own.
Narrow single-property arbitraries (`[animation:…]`, `[container-type:inline-size]`) are fine.

**Utilities beat the `ui-*` layer only by accident.** If you are in a Tailwind app you should not
have imported `components.css` at all — import `tokens.css` via `tailwind.css`. Mixing the two
gives you specificity races that depend on stylesheet order.

## Kicker (bracketed section label)

```html
<div class="type-kicker text-fg-muted whitespace-nowrap before:content-['[_'] before:text-accent after:content-['_]'] after:text-accent">client setup</div>
```
Or the component class: `<div class="ui-kicker">client setup</div>`

## Button

Base: `inline-flex items-center gap-2 h-control px-3 rounded-sm border type-label whitespace-nowrap transition-colors duration-[120ms] disabled:opacity-45 disabled:pointer-events-none focus-ring`

| variant | add |
|---|---|
| primary | `bg-accent text-on-accent border-accent hover:bg-accent-hover hover:border-accent-hover active:bg-accent-active` |
| secondary | `bg-raised text-fg border-border-strong hover:bg-sunken active:bg-border` |
| ghost | `bg-transparent text-fg-muted border-transparent hover:bg-sunken hover:text-fg` |
| danger | `bg-transparent text-danger-text border-danger hover:bg-danger hover:text-on-accent` |
| sm | `h-[26px] px-2 text-xs` · lg `h-control-lg px-4 text-md` · icon-only `w-control p-0 justify-center` |

```templ
templ Button(variant string, attrs templ.Attributes) {
  <button class={ "inline-flex items-center gap-2 h-control px-3 rounded-sm border type-label whitespace-nowrap focus-ring disabled:opacity-45",
    templ.KV("bg-accent text-on-accent border-accent hover:bg-accent-hover", variant == "primary"),
    templ.KV("bg-raised text-fg border-border-strong hover:bg-sunken", variant == "secondary"),
    templ.KV("text-fg-muted border-transparent hover:bg-sunken hover:text-fg", variant == "ghost"),
    templ.KV("text-danger-text border-danger hover:bg-danger hover:text-on-accent", variant == "danger") }
    { attrs... }>{ children... }</button>
}
```

## Input

`flex items-center h-control w-full px-3 rounded-sm border border-border-strong bg-sunken text-fg type-body-sm placeholder:text-fg-muted hover:border-fg-subtle focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] aria-invalid:border-danger disabled:opacity-45`
Mono value: add `type-code`. Field wrapper: `flex flex-col gap-1` · label `type-label` · hint `text-xs text-fg-muted` (error: `text-danger-text`).

## Segmented

Wrapper `inline-flex p-0.5 gap-0.5 rounded-sm border border-border-strong bg-sunken` · option `h-6 px-2 rounded-xs font-sans font-medium text-xs leading-[1.2] text-fg-muted hover:text-fg aria-pressed:bg-raised aria-pressed:text-fg aria-pressed:shadow-sm`

## Switch

`relative inline-flex w-8 h-[18px] rounded-pill bg-border-strong aria-checked:bg-accent after:content-[''] after:absolute after:left-0.5 after:top-0.5 after:size-3.5 after:rounded-[min(50%,var(--radius-pill))] after:bg-raised after:shadow-sm after:transition-transform aria-checked:after:translate-x-3.5`

## Tag

`inline-flex items-center gap-1.5 h-5 px-2 rounded-xs font-mono font-medium text-xs leading-[1.2] features-mono border border-border text-fg-muted bg-raised`
Tones: accent `text-accent-text bg-accent-soft border-transparent` · warn `text-warn-text bg-warn-soft border-transparent` · danger `text-danger-text bg-danger-soft border-transparent` · dark `text-on-code bg-code border-transparent`

## Card

`flex flex-col gap-3 p-4 rounded-md border border-border bg-raised` · elevated: swap border for `border-transparent shadow-sm` / `shadow-md`
Kicker inside: `type-kicker text-fg-muted` · title `type-h3`

## Tabs

Row `flex gap-1 border-b border-border` · tab `h-9 px-3 -mb-px border-b-2 border-transparent type-label text-fg-muted hover:text-fg aria-selected:text-fg aria-selected:border-accent`

## Code block (line / block)

```html
<div class="relative flex items-start gap-3 py-3 pr-3 pl-4 rounded-md border border-border-code bg-code text-on-code type-code">
  <span class="text-accent-on-code select-none shrink-0">$</span>
  <pre class="m-0 flex-1 min-w-0 whitespace-pre-wrap break-all font-[inherit] text-[inherit]">winget source add -n acme -a https://…/t/<span class="text-accent-on-code">tk_…</span>/winget/</pre>
  <button class="shrink-0 h-6 px-2 rounded-xs border border-border-code text-on-code-muted font-sans font-medium text-xs leading-[1.2] hover:text-on-code hover:border-on-code-muted data-[done=true]:text-accent-on-code data-[done=true]:border-accent-on-code">Copy</button>
</div>
```
Comment lines inside: `text-on-code-muted`. Language label: `type-kicker text-on-code-muted self-center`.

## Inline identifier

`type-ident px-1.5 py-px rounded-xs bg-code-inline text-fg whitespace-nowrap` · version `text-accent-text` · hash `text-fg-muted font-normal` · plain `bg-transparent px-0`

```templ
templ Ident(kind, s string) {
  <span class={ "type-ident whitespace-nowrap", templ.KV("px-1.5 py-px rounded-xs bg-code-inline", kind != "plain"),
    templ.KV("text-accent-text", kind == "version"), templ.KV("text-fg-muted font-normal", kind == "hash") }>{ s }</span>
}
```

## Meter (usage against a limit)

```html
<span class="inline-flex items-center gap-2 type-code-sm text-fg-muted min-w-0" role="meter">
  <span class="relative block flex-1 min-w-[60px] h-1.5 rounded-[2px] bg-meter-track overflow-hidden">
    <span class="block h-full rounded-[2px] bg-meter-fill" style="width:32%"></span>
    <span class="absolute -top-0.5 -bottom-0.5 w-px bg-fg-subtle" style="left:80%"></span>
  </span>
  <span class="whitespace-nowrap tabular-nums">3.2 / 10 GB</span>
</span>
```
warn (≥80%): fill `bg-warn`, value `text-warn-text` · over (100%): fill `bg-danger hatch text-[color-mix(in_oklab,var(--bg-raised)_55%,transparent)]`, value `text-danger-text` · large: track `h-2.5`, value `type-ident`

## Status

`inline-flex items-center gap-1.5 type-body-sm whitespace-nowrap` + glyph `size-2.5 shrink-0 inline-block`
healthy `rounded-full bg-ok` · warn `size-0 border-x-[5.5px] border-x-transparent border-b-[10px] border-b-warn` · suspended `rounded-[1px] bg-stopped` + text `text-fg-muted` · unreachable `rounded-full border-[1.5px] border-dashed border-danger` + text `text-danger-text` · quiet `rounded-full border-[1.5px] border-fg-subtle` + text `text-fg-muted`
Pill: `h-[22px] pl-[7px] pr-2 rounded-pill bg-sunken border border-border text-xs`

## Table (dense rows with expansion)

table `w-full border-collapse type-body-sm` · th `text-left type-kicker text-fg-muted px-3 h-row-dense border-b border-border-strong whitespace-nowrap` · td `px-3 h-row border-b border-border align-middle features-sans-tabular` (dense: `h-row-dense`) · numeric `text-right font-mono tabular-nums whitespace-nowrap` · expandable row `cursor-pointer hover:[&>td]:bg-sunken data-[open=true]:[&>td]:bg-sunken` · chevron `inline-block w-3.5 text-fg-muted font-mono transition-transform group-data-[open=true]:rotate-90` · detail row td `h-auto py-3 pl-[34px] pr-3 bg-sunken border-b border-border-strong`

**Cells wrap by default (since 1.3.0).** Put `whitespace-nowrap` on the ATOM that must not break, never on the cell — a cell cannot know whether it holds a commit SHA or a sentence. `.ui-ident`, `.ui-status`, `.ui-tag`, `.ui-meter` and `td.num` already carry it.

**Corollary: an unbreakable atom must still FIT.** `nowrap` on the atom only helps if its container can accommodate it. In a fixed-layout table the column is exactly its declared width, so an over-long chip overhangs and — because `.ui-ident` and `.ui-tag` have opaque backgrounds — paints over the next cell rather than merely crowding it. When the content is a *list* (a label set, a tag series), opt that atom back into wrapping: `<code class="ui-ident" style="white-space:normal;">[self-hosted, Windows, ARM64]</code>`. Reserve `nowrap` for atoms that are single indivisible tokens — an id, a version, a SHA.

**With `table-layout: fixed`, a column is exactly its declared width.** A 19% column cannot hold a 250px literal like `[self-hosted, Windows, ARM64]`: it wraps (fine) or, if something forces `nowrap`, overflows into its neighbor and — because `.ui-ident` has an opaque background — paints over it. Widen the column or let it wrap. Give the table a `min-w-[…]` floor inside an `overflow-x-auto` wrapper so it scrolls rather than crushing every column.

## Banner (hatched edge)

`relative grid grid-cols-[auto_1fr_auto] gap-4 items-start px-5 py-4 rounded-md border border-border bg-raised overflow-hidden before:content-[''] before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:hatch before:text-accent`
warn `before:text-warn` · danger `before:text-danger` · title `type-h3` · body `type-body-sm text-fg-muted`

## Dialog / Drawer

Backdrop `fixed inset-0 z-50 flex items-center justify-center p-6 bg-overlay` · dialog `flex flex-col gap-4 w-[min(480px,100%)] p-6 rounded-lg bg-raised text-fg shadow-lg` (danger: `border-t-[3px] border-danger`) · title `type-h2` · actions `flex gap-2 justify-end pt-2`
Drawer backdrop `fixed inset-0 z-50 flex justify-end bg-overlay` · panel `flex flex-col h-full w-[min(440px,100%)] bg-raised border-l border-border shadow-lg` · head `flex items-center justify-between px-5 py-4 border-b border-border type-h3` · body `flex-1 overflow-auto p-5 flex flex-col gap-4` · foot `flex gap-2 justify-end px-5 py-4 border-t border-border`

## Toast

`inline-flex items-center gap-3 px-3 py-2 rounded-md bg-code text-on-code type-body-sm shadow-lg border-l-[3px] border-accent-on-code` · warn `border-warn` · danger `border-danger`

## Nav

`flex items-center gap-6 h-[52px] px-6 border-b border-border bg-bg` · brand `flex items-center gap-1 text-fg no-underline` with `[` `]` in `font-mono text-lg text-accent` and wordmark `font-display text-xl font-semibold -tracking-[0.03em]` · links `type-label text-fg-muted px-2.5 py-1.5 rounded-sm hover:text-fg hover:bg-sunken aria-[current=page]:text-fg aria-[current=page]:bg-sunken`

## Page scaffold

Customer app page: `min-h-screen bg-bg text-fg type-body` → content `max-w-content mx-auto px-10 pt-7 pb-16 flex flex-col gap-7` → two-column detail `grid grid-cols-[minmax(0,1fr)_320px] gap-7 items-start`
Marketing: `max-w-[1280px] mx-auto` with `px-16` sections separated by `border-t border-border`.

---

## Corner style

Every radius token is `calc(<n>px * var(--radius-scale))`. One dial flattens the system:

```html
<html data-corners="flat">          <!-- square edges everywhere -->
<html data-corners="tight">         <!-- half radius: 1.5 / 2.5 / 4 / 6 -->
<div data-corners="flat"> … </div>  <!-- or just one region -->
<div class="corners-flat"> … </div> <!-- Tailwind utility, same effect -->
```

`rounded-*` utilities and `ui-*` classes both follow it. Status glyphs and monogram tiles keep their literal radii — their shape is the information, not decoration.

## Extending

The system deliberately ships only generic parts. Product-specific components are built the same way — compose utilities, keep the token names. Two examples from the system's first product, for shape:

- **Monogram tile** — two-letter mono monogram in a `1.5px` outlined box, a different corner geometry per category, so a set reads apart at 20px with no brand color: `inline-flex items-center justify-center size-5 font-mono font-semibold text-[9px] border-[1.5px] border-fg bg-raised` + one of `rounded-none` / `rounded-full` / `rounded-xs rounded-br-full` / …
- **Reveal panel** — for a secret shown once: `flex flex-col gap-3 p-4 rounded-md bg-code text-on-code border border-accent-on-code`, kicker `type-kicker text-accent-on-code`, the value `font-mono font-normal text-lg leading-code break-all select-all`.
