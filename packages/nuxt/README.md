# `@zooui/nuxt`

Zoo UI's theme-free Nuxt layer: **Nuxt UI exactly as it ships**, Zoo UI's `Z*` components for what Nuxt UI has no
equivalent of, colored-edge surfaces, and the mechanisms every product needs. It has no look of its own: everything
is written on Nuxt UI's semantic tokens, so it takes the product's colors, typefaces and color-mode key.

For a ready-made look, extend a theme layer instead. Forest, [`@zooui/theme-forest`](https://github.com/zooui-dev/zooui/blob/main/packages/theme-forest/README.md),
extends this layer with its colors, ground, typefaces and schemes. Radius, spacing, shadows, motion, focus rings and
component geometry stay Nuxt UI's in both: anything beyond that is added one deliberate decision at a time, judged
against the untouched baseline in `../../apps/kitchen-sink`.

```bash
pnpm base:dev                   # → http://localhost:3004 — this layer alone, in a product's own look
pnpm base:build && pnpm base:test
pnpm ks:dev                     # → http://localhost:3003 — the baseline: Nuxt UI as it ships
```

## Using it

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
compiles. `apps/forest` shows why it matters: its specimens come from `../../apps/kitchen-sink`, and until it
declared `@source` for them the page had the right colors and no spacing at all.

Do **not** add `@nuxt/ui`, `tailwindcss` or `@tailwindcss/vite` to a product: the layer owns them, and a second
Tailwind registration fails the build. Wrap the app in `<UApp>`: Nuxt UI mounts toasts, tooltips and overlays
through it. `../../apps/base` is this layer in a product with its own look; `../../apps/starter` is the smallest product
on Forest.

## The base and a theme

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
unstriped. `../../apps/base` is the base in a product with its own look, and its tests hold all of this.

## Per-section accent (`data-accent`)

A product can paint each section in its own hue: `data-accent="teal"` on a container, and everything inside reads
six **roles** instead of a fixed color. The base defines the roles; the **product supplies the hues**.

| Role | For | Light | Dark |
| --- | --- | --- | --- |
| `--accent` | the solid: an icon tile, a band's rule, a colored edge | `--a-600` | `--a-400` |
| `--accent-on` | text or an icon on the solid | white | `--a-950` |
| `--accent-strong` | titles and labels in the accent | `--a-800` | `--a-200` |
| `--accent-soft` | a band or panel tint | `--a-50` | `--a-500` at 12% |
| `--accent-muted` | chips | `--a-100` | `--a-500` at 24% |
| `--accent-line` | a rule or border | `--a-200` | `--a-500` at 40% |

A hue is eight stops, `--a-50 … --a-950`, set under `[data-accent='<name>']` in the product's CSS (in `@layer base`
or unlayered: either wins over the base's rule). They are inputs to the roles, not a palette, so a hue may point one
elsewhere or set a role outright — a cyan hue can use cyan-500 for its solid and set `--accent-on` to cyan-950.
Each role carries both modes in one `light-dark()` declaration, so the product writes no `.dark` rules. A name with no
hue map reads as the product's primary. Components read the roles with arbitrary values (`bg-(--accent)
text-(--accent-on)`, `border-(--accent-line)`), and the colored-edge wrappers take `color="accent"`: `<ZCard
color="accent">` inside a section gets that section's edge (the primary outside any section). Overlays portal to
`<body>`, out of the section, so `ZModal`, `ZSlideover` and `ZDrawer` read the section they are rendered in and put
its `data-accent` on the overlay's content: a dialog opened from a teal section has a teal edge.

## Mechanisms the base carries

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

## Versions

| | Minimum | Why |
| --- | --- | --- |
| Nuxt | 4.1 | Nuxt UI 4's own floor; the layer's peer range (`^4.1.0`). Tested on 4.5. |
| Nuxt UI | 4.11 (`~4.11.1`) | The layer's dependency — products do **not** add their own. |
| Tailwind CSS | 4.3.3 | What Nuxt UI 4.11 depends on; it comes with Nuxt UI, not from the product. |
| Node | 22 | `engines` (Nuxt UI 4.11 itself needs ≥ 22.12 on the 22 line). |

A product on an older Nuxt UI moves to the layer's when it adopts Zoo UI: it removes its own `@nuxt/ui` (and
`tailwindcss`) and gets 4.11 through the layer. A product on 4.10 moves to 4.11 that way. See [Upgrading Nuxt
UI](#upgrading-nuxt-ui).

## Colored edges

A **3px edge in the surface's color**: on the **left** for inline surfaces (cards) and on the **top** for overlays
(dialogs, slideovers, drawers). Everything else about the surface — padding, radius, shadow, motion, focus — is
Nuxt UI's. No color, no edge.

| Surface | How | Edge |
| --- | --- | --- |
| Card | `<ZCard color="…">` | left |
| Dialog | `<ZModal color="…">` | top |
| Side drawer | `<ZSlideover color="…">` | top |
| Bottom drawer | `<ZDrawer color="…">` | top |

Only `UToast` has a `color` of its own, so these four get a thin `Z*` wrapper (`components/`) that adds
`color` and passes every other prop, `v-model`, event and slot straight through to the Nuxt UI component —
tests hold each overlay to its Nuxt UI behavior (focus, Escape, focus return). Colors are the semantic ones
(`primary` … `neutral`), so edges follow the product's palette and switch shade in dark mode on their own — plus
`accent`, the section's [`data-accent`](#per-section-accent-data-accent) color. Forest adds the same edge to toasts
and striped alert banners: [Forest's colored edges](https://github.com/zooui-dev/zooui/blob/main/packages/theme-forest/README.md#colored-edges).

## Components

For what Nuxt UI has no equivalent of — built on Nuxt UI's tokens, so a product's palette, a theme's schemes and
dark mode carry through them as they do through Nuxt UI's own components. Inks that carry text use the 700 shade in
light mode and 300 in dark, so they clear 4.5:1 on every Forest scheme (Nuxt UI's 500 does not, on Teal or Slate · Cobalt).

| Component | What it is |
| --- | --- |
| `<ZKicker variant="bracket \| eyebrow">` | The mono label over a section: `[ DEPLOYMENTS ]`, brackets in the primary (default); `eyebrow` is the label itself in the accent ink, no brackets |
| `<ZIdentifier kind="package \| version \| hash \| plain">` | A value set in the mono face, on a chip except `plain`; `version` in the accent |
| `<ZStatus state="healthy \| warn \| suspended \| unreachable \| quiet" pill? glow?>` | Status by **shape** (circle, triangle, square, dashed ring, hollow ring), so it survives grayscale; color only reinforces it. `glow` lights the healthy dot with a soft 12px glow in its own color; the other states stay unlit |
| `<ZSlots :slots="[{ label, available, title? }]" label size?>` | One **named** chip per slot of capacity, as a labeled list: open slots a solid primary badge ("slot 1 · free"), held ones an outline neutral badge saying what holds them ("slot 2 · build 4812"). Nuxt UI's `UBadge` (in the mono face on the theme) |
| `<ZQuotaMeter :used :quota unit warn-at?>` | Usage against a limit: a `meter`, amber from the mark, red and hatched over |
| `<ZCodeBlock variant="inline \| line \| block" code token? lang?>` | The code surface — near-black in both themes — with a copy button; `token` marks the secret. The copy result is announced (`role="status"`), a refused copy says so, and `@copy` fires only on success |
| `<ZTokenReveal token name? require-ack? ack-label? title?>` | The shown-once secret: the token on the code surface (copy, one-click select) under a `[ token · name · shown once ]` kicker, with a warning banner (`UAlert` outline; the default slot is its text). `require-ack` adds a button that blurs the secret and makes it inert; `@copy`, `@ack`, `#actions` |
| `<ZEcosystemMark ecosystem size? with-label? disabled? label? monogram? shape?>` | A package manager as a two-letter mono tile, told apart by **corner shape**, not brand color (npm square, NuGet circle, winget one round corner …); dashed when `disabled`. Named for assistive tech by its label. Six known ecosystems (`components/ecosystems.ts`); any other is drawn from `label`/`monogram`/`shape` (`square`, `circle`, `leaf`, `arch`, `lens`, `drop`, `rounded`) |
| `<ZThemeToggle>` | Light / dark / system as Nuxt UI buttons; `useZooTheme()` is the same over color-mode |
| `<ZRepeatingList v-model item-label :new-row row-key? min? max? errors? compact?>` | A generic (`T`) list editor: rows of the caller's fields in `#row`, Add under them and Remove on each, an optional folded `#summary` that opens on an error, focus into a new row, and the count change announced — [below](#zrepeatinglist) |
| `<ZNumberInput v-model unit? step? min? max? spin? calc? prefix? suffix? min-fraction-digits? max-fraction-digits? freeform? currency? locale?>` | One number input for money, percent, count and hours, formatting as it is typed for the locale: unit marks in fixed slots so a column lines up, its own chevrons and arrow keys moving by `step` from the current value, clamped and rounded on commit, a `calc` mode for `+ - * /`, decimal arithmetic, the caller's string, number or `Decimal` handed back. [Below](#znumberinput) |
| `<ZDateField v-model format? locale? clearable? placeholder? size? icon? calendar-icon? highlight? portal? clear-label? choose-label?>` | A calendar-day field: a `Temporal.PlainDate` v-model, typed entry (`5`, `0512`, `5/12/26`), shortcut keys, a `UPopover` + `UCalendar` picker; `@date-update` when a date settles, `@clear`, `@icon-click`, exposed `focus()`. [Below](#zdatefield) |

The colored-edge wrappers (`ZCard`, `ZModal`, `ZSlideover`, `ZDrawer`) are above. Everything else is Nuxt UI's
own component: `UAlert variant="outline"` is the banner, `UTable` the table, `UTabs` the segmented control.

**Select "none" (`utils/select-none.ts`, auto-imported).** reka-ui, under `USelect` and `USelectMenu`, throws during render
on a `SelectItem` with `value=""`, so an explicit "None" option holds `SELECT_NONE` (`'__none__'`) and is translated back
at the edge: `selectNoneToUndefined(v)` (a create), `selectNoneToNull(v)` (an update that clears the field) and
`emptyToSelectNone(v)` (the value to show for one that may be absent). The names are safe as globals, unlike a bare
`NONE` or `orNull`. Tested by `scripts/select-none.test.mjs`.

**The current-page marker.** On the theme (`@zooui/theme-forest`'s `app.config.ts`; the base leaves `UNavigationMenu` as
Nuxt UI ships it), where a `UNavigationMenu` asks for Nuxt UI's `highlight`, the bar's thickness and the current
item's weight read `--nav-highlight-size` and `--nav-current-weight`. A product sets them in its own CSS (say `2px` and
`700`); unset, they fall back to exactly what Nuxt UI ships (1px, medium), so no menu changes until it does.
`variant="link" color="neutral" highlight highlight-color="primary"` gives no pill, the current page a neutral label
over a primary underline (`highlight-color` must be named: unset, Nuxt UI takes it from `color`, and the bar goes
neutral).

### ZRepeatingList

```vue
<ZRepeatingList v-model="sources" item-label="referral source" :new-row="() => ({ name: '' })" :row-key="(s) => s.id" :errors="errors">
  <template #row="{ row, errorId }"><UFormField label="Name"><UInput v-model="row.name" :aria-describedby="errorId" /></UFormField></template>
  <template #summary="{ row }">{{ row.name }}</template>
</ZRepeatingList>
```

Generic over the row type (`T extends object`), so `row` in `#row` and `#summary` is the list's own type. Rows are
told apart by `rowKey`, or by object identity for rows without one. `min` rows are always on screen (Remove hides at
it); at `max` Add is disabled and `max-label` says so. `errors` is keyed by row key; a row's message is a
`role="alert"` under it, and its id reaches the slot as `errorId`. With `#summary`, rows present at mount fold to one
line with Edit; new rows and rows with an error are open. `compact` is one line per row with an icon-only Remove.
Focus goes to the first `focus-selector` match in an added or opened row, and to Add after a remove; a polite live
region announces each add and remove. The words are props: `add-label`, `remove-label`, `edit-label`, `max-label`,
`row-title`, `announce`. The list carries `data-testid="repeating-list"` and each row `data-row`, for e2e selectors.

### ZDateField

The date field (`components/DateField.vue`), with its parser (`utils/date-entry.ts`) and `useToday()`. The model is
a `Temporal.PlainDate` or `null`, the same type a `date` column comes back as, and **no JavaScript `Date` is made
anywhere**: a `Date` is an instant, and every conversion to a day goes through a time zone. The calendar's `CalendarDate`
is converted by its fields alone.

```vue
<UFormField label="Ends"><ZDateField v-model="form.endDate" clearable class="w-full" /></UFormField>
<ZDateField v-model="due" locale="de" />                <!-- DD.MM.YYYY, a German calendar -->
<ZDateField v-model="due" format="YYYY-MM-DD" />
```

- **Typing**, in MM/DD/YYYY: `5` or `12` is that day this month, `0512` May 12, `051226`, `5/12/26` and `5/12/2026`
  carry the year (a two-digit year lands within 20 years ahead and 79 behind; a four-digit one must be 1000 or later).
  A year of all zeros is not a date: `5/12/0`, `5/12/00` and `051200` clear the field rather
  than land on 2000. Other formats read the same shapes in their own order. Enter, Tab or leaving commits; text that
  isn't a date clears the field; untouched text keeps its date, even one it couldn't read back (a stored year before
  1000).
- **Shortcut keys**: `t` today; `m`/`h` first and last of the month, `y`/`r` of the year (again to keep walking); `+`
  or `=` the next day, `-` or `_` the day before. The format's separator is never a shortcut, so in `YYYY-MM-DD`, `-`
  types a dash and `_` is the day before. Alt+↓ opens the calendar. Shortcuts stop at 1000-01-01 and 9999-12-31.
- **Format and locale.** `format` is a pattern of `MM`, `DD` and `YYYY` in month-day-year, day-month-year or
  year-month-day order with one separator: `MM/DD/YYYY`, `DD/MM/YYYY`, `DD.MM.YYYY`, `YYYY-MM-DD` …
  `locale` is the calendar's language. **By default** the locale is Nuxt UI's (`<UApp :locale>`,
  `en` unless set) and the format is that locale's own numeric order (`dateEntryFormatFor`: `en` → `MM/DD/YYYY`,
  `en-GB` → `DD/MM/YYYY`, `de` → `DD.MM.YYYY`, `sv` → `YYYY-MM-DD`), so a product on `en` gets `MM/DD/YYYY` with
  no props. The placeholder is the pattern. The two buttons are named by `clear-label` and `choose-label` (English
  by default) for a product in another language.
- **`@date-update`** fires once per settle (picked, cleared, a shortcut, Enter, or focus leaving for somewhere other
  than its own calendar) and always carries the date just settled, even before a parent-owned v-model has caught up:
  the moment an inline editor should save.
- **Icons.** `icon` puts a leading icon in the field, and a click on it emits
  **`@icon-click`** with the `MouseEvent` (the field's own handling is untouched: the click still blurs the input, so
  a typed date settles first). `calendar-icon` replaces the calendar button's icon (`i-lucide-calendar` by default).
  The layer bundles only its default; an icon a product passes is the product's to bundle (its `icon.clientBundle`) or
  to serve from its icon endpoint.
- **The calendar** heads its columns with the locale's narrow weekdays (`S M T W T F S` in `en`, `M D M D F S S` in
  `de`).
- **Today** is `useToday()`: the browser's day, in the browser's time zone, client-only (it throws on the server,
  where the zone is the server's). Server code that needs the business's today wants
  `Temporal.Now.plainDateISO(companyZone)` instead.
- **Look.** Nuxt UI's `UInput` and `UCalendar` in the product's colors; while the calendar is open the field takes
  Nuxt UI's `highlight` ring. The placeholder keeps the input's own ink: a product that wants it darker (its own
  placeholder color token) passes `:ui="{ base: 'placeholder:…' }"` or sets it on `ui.input` in `app.config`.

**The parser** is framework-free TypeScript, auto-imported in a product and importable anywhere as
`@zooui/nuxt/date-entry` (a server route, a domain package): `parseDateEntry`, `formatDateEntry`, `commitDateEntry`,
`applyDateShortcut`, `dateEntryFormat`, `dateEntryFormatFor`, `entryDay`, `US_DATE_ENTRY`, `FIRST_ENTRY_DATE`,
`LAST_ENTRY_DATE`. Each takes "today" from its caller and the format last (default `MM/DD/YYYY`), so a call that
relies on the default reads the same. Its tests are `scripts/date-entry.test.mjs` (`node:test`, every format).

**Temporal** is `temporal-polyfill`'s `/implementation` entry (^1.0.5), never the bare entry, which becomes the
engine's own `Temporal` where one exists. A product builds its `PlainDate`s from the same subpath, so there is one
class; a product that already installs `temporal-polyfill` imports from that subpath too, and one that doesn't adds
it.

### ZNumberInput

One number input, so every figure looks and moves the same, formatting as it is typed. It is Nuxt UI's `UInput` (`type="text"`, `inputmode="decimal"`): every other attribute, `size`,
`color`, `highlight`, `disabled`, `readonly`, `ui`, `aria-*`, falls through to it, the marks and chevrons sit in its
`leading` and `trailing` slots, and calc's preview in its default slot. It is on Nuxt UI's tokens: marks and chevrons
in `text-dimmed`, hover `text-default`, the preview `bg-inverted`/`text-inverted`.

| Prop | | |
| --- | --- | --- |
| `modelValue` | `string \| number \| Decimal \| null` | Every change hands back the caller's kind: a string stays a string (as typed: `"1.0"` on the way to `"1.05"`; written to the places on commit, `"1234.50"`), a number a number, a decimal.js `Decimal` a `Decimal` of the caller's own class. Cleared: `''` for a string, `null` otherwise. Strings and Decimals never pass through a float |
| `modelType` | `'string' \| 'number' \| 'decimal'` | The kind to hand back when the model starts empty (it has no value to take a kind from). A `Decimal` v-model that can start null needs `model-type="decimal"`; without it, empty starts as a string |
| `unit` | `money \| percent \| count \| hours` | `count` by default. Money puts the currency symbol on the left; percent `%` and hours `hrs` on the right, in a slot kept the same width when empty, so values end on one edge |
| `locale`, `currency` | BCP 47, ISO 4217 | The grouping and decimal marks typed and shown (`de`: `1.234,56`), the money symbol, and the chevrons' labels ("Add $5,000", "Subtract 0.5 hours") |
| `minFractionDigits`, `maxFractionDigits` | `number` | Decimal places: the minimum written on commit, the maximum rounded to on commit and the most that can be typed. Money is `2`/`2`; every other unit `0`/none (as typed). A minimum above an explicit maximum comes down to it |
| `min`, `max` | `number \| string` | Clamp a nudge and a commit. Out of range otherwise (between keystrokes, or a model that arrives so) the field is `:invalid` (`setCustomValidity`), following the model as a parent changes it; a minus can't be typed where `min` is 0 or more |
| `step` | `number` | What the chevrons and ArrowUp/ArrowDown add, from the current value, never snapped to a multiple |
| `spin` | `boolean` | `true` by default. `false`: no chevrons, ArrowUp/ArrowDown do nothing, and the field is a plain text box rather than a `spinbutton` |
| `prefix`, `suffix` | `string` | Free text beside the marks: `prefix="~"` shows `~$`, `suffix="/mo"` shows `/mo` after the value. Kept out of the text, in the mark slots, which grow to fit |
| `highlightOnFocus` | `boolean` | Select the whole value on focus, by click or key (on by default in `calc`) |
| `calc` | `boolean` | Take `+ - * /` expressions ([below](#calc)) |
| `commitOnBlur` | `boolean` | `true` by default. `false` for a grid editor that commits itself with `evaluate()` |
| `freeform` | `boolean` | A text box that takes "$125,000" or "24 %" as typed and hands the text back as it is, for a product that tidies it itself; the arrows read the figure out of it (in the field's locale) and leave anything else ("forty") untouched. No live formatting, clamping or rounding |

Emits `update:modelValue`; no slots. Exposes `evaluate()`, which commits what is typed and returns the model's value,
and `inputRef`. Keeps `data-number-input` on the `<input>` (and adds `data-unit`), `data-number-mark` on the
marks, and the chevrons' labels.

**Typing.** Each keystroke, paste and deletion is worked out before the browser applies it (`beforeinput`): the
locale's grouping comes and goes (`12,345`), the caret stays on its digit, one decimal mark, a minus only at the
front, no leading zeros. Backspace or Delete over a separator takes the digit beyond it; a fixed decimal mark is
stepped over rather than deleted; typed into a full fraction, a digit overwrites the next; typed before a minus, a
digit goes after it. A key that would add nothing (a letter, a second decimal mark, a minus where none may go) is
refused, and leaves a selection selected. A paste keeps the figure's digits (`$1,234.50` arrives as `1,234.50`).
Anything else (an IME, undo, autofill) is tidied after it lands, and keys an IME is composing with are left to it.
The model follows the typing; a **commit** (blur, Enter, Tab, or a nudge, by key or chevron alike: a chevron doesn't
take the focus) rounds to the places (half away from zero, in decimal.js), keeps the result within `min`/`max`, and
shows the value in full (`38,500.00`). A rounded value past a bound becomes the nearest value inside it that the
places can write (`max="1.235"` at two places commits `1.23`, never `1.24`); if the places can write none (`min` 0.004,
`max` 0.006, two places), the bound itself is kept.

**Marks.** The currency symbol and `prefix` stay to the left of the text and `%`, `hrs` and `suffix` to the right,
in the input's own padding, so a column of values still ends on one edge and typing only ever meets digits. A
locale that writes its symbol after the number (`de`: `1.234,56 €`) still shows `€` on the left, with the money.

**Accessibility.** While it spins the input is a `spinbutton` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`
and an `aria-valuetext` with its marks ("$38,500.00"); the chevrons are named buttons, out of the tab order (the
arrow keys do the same). With `:spin="false"` it is a plain text box.

#### Calc

`calc` makes the field a small calculator: `+ - * /` with the usual precedence, read by a small
recursive-descent parser (never `eval`) and worked in decimal.js, so `0.1+0.2` is `0.3`.
Each number is grouped as it is typed, for the locale, keeping the caret. While focused, the result shows under the
field (`= $1,250.00`, with the unit's marks), absolutely placed in `UInput`'s slot so nothing moves, and announced
politely. Enter, Tab or blur (unless `:commit-on-blur="false"`) puts it in, rounded and kept in range like any commit.
The result is rounded once, at the field's places (ten where the field has no maximum), so a sum is never
rounded twice: whole dollars only is `calc :max-fraction-digits="0"`. A line break in a paste is a space. Incomplete or invalid input (`678+`, `abc`) or a division
by zero gives no value. An operator typed over a selection is added at the end (the value is
selected on focus, so `+50` adds to it), except a minus over everything, which starts a negative number. A grid
cell editor:

```vue
<ZNumberInput ref="cell" v-model="value" unit="money" calc :spin="false" :commit-on-blur="false" />
<!-- on Enter, Tab or an arrow: cell.value.evaluate(), then move -->
```

**Defaults, and a product's own.** Without props: money moves by 1, percent and count by 1, hours by 0.5, in US
dollars, `en-US` (fixed, so the server and the browser render the same text), money to 2 places. A product sets its
own once in its `app.config.ts`; a prop still wins. A product's own $5,000 step:

```ts
export default defineAppConfig({ zooui: { numberInput: { steps: { money: 5000 } } } })
// also: currency, locale, fractionDigits: { money: { min: 0, max: 0 } }
```

**Decimal.** A database client may return Postgres `numeric` as decimal.js `Decimal`s, and a schema may check
`instanceof Decimal`. ZNumberInput recognizes a `Decimal` with `Decimal.isDecimal` (which knows another copy's
instances too), reads it from its string, and builds every value it hands back with the caller's own class, so
`instanceof` holds even with two copies installed. A `Decimal.clone()` comes back the clone, with its precision, and
a subclass (`class Money extends Decimal`) comes back a subclass: decimal.js writes the class it extends onto each
instance, so for a subclass the class is read from the instance's prototype instead. The layer depends on decimal.js
`^10.6.0`, so a product that also installs decimal.js itself gets one copy: keep the product's own range compatible
with it.

**Where it lives.** The component is thin; the rules are pure TypeScript beside it: `number-format.ts` (the locale's
marks, live formatting and the caret, commits, the caller's kind of value), `number-calc.ts` (the evaluator and
expression editing) and `number-input.ts` (config, labels, nudges, freeform reading). Their tests are
`scripts/number-input.test.mjs` and `scripts/number-calc.test.mjs`.

## The guards every product runs

One check ships with the base layer, for any page's Playwright test (it runs inside the page):

```ts
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

expect(await page.evaluate(findConflicts)).toEqual([])          // no element with two same-property utilities
```

## The tests

`../../apps/base/tests/base.spec.ts` holds the base alone, in a product with its own look (its own palette, typefaces,
color-mode key, CSS and accent map), against its production build: none of Forest's colors, ramps, typefaces,
ground or restyling arrive; the color-mode key and default stay the product's and no `data-theme` is written;
every Z\* component paints in the product's colors in both modes, and `font-mono` falls back to the system mono
stack; the product's `@theme` tokens, `@utility` and `@layer base` rules work after `base.css`; `light-dark()`
tokens resolve in both modes in the compiled CSS; a `data-accent` hue map paints the roles and `ZCard
color="accent"` in both modes; `UFormField` labels still name their inputs after hydration; and Z\* icons render
with no request for icon data.

Forest's own tests, which also run every `Z*` component on every scheme, are in
[its README](https://github.com/zooui-dev/zooui/blob/main/packages/theme-forest/README.md#the-tests-prove-color-only).

## Open — decide one at a time

**Corners.** Nuxt UI's `--ui-radius` (4px base) is close to the design source's `tight` corners; its
`soft`/`tight`/`flat` dial is not carried into Nuxt. A product that wants squarer corners sets `--ui-radius` itself.

## Releasing

Both layers, `@zooui/nuxt` and `@zooui/theme-forest`, release to the public npm registry
(`publishConfig.access: public`) through **shiprig**. Neither has been published yet. The theme
ships no font files of its own.

1. **In each PR with a user-facing change**, record it: `changerig add -t fix -p @zooui/nuxt -m "…"` (or `-p @zooui/theme-forest`)
   (`feat` for features). The entry is written for the changelog's reader, and links its commit and PR.
2. **To release: merge the release PR, approve the publish run, done.** shiprig's action
   (`.github/workflows/release.yml`, `rigsmith/shiprig-action`, settings in `.github/shiprig-action.jsonc`) works the
   way release-please does, on every push to `main` of zooui-dev/zooui (anywhere else it does nothing):
   - With changesets pending, it keeps a standing **release PR** (`chore: release …`) up to date: `shiprig version`
     bumps the versions and writes each package's `CHANGELOG.md`. This needs no approval and no secret.
   - Merge that PR, and the run for the merge has something to publish: its **Publish** job waits for approval in
     the protected `release` environment. Approve it (the run's page → Review deployments). It checks every package
     it would publish has a `## <version>` entry in its `CHANGELOG.md` (the GitHub release is made from it) and stops
     with nothing published if one doesn't, then `shiprig publish` packs each layer with pnpm (which rewrites the
     theme's `workspace:*` dependency on the base to the exact version) and npm publishes it with provenance. It
     pushes the tags and makes a GitHub release per package from its changelog entry.
   - Any other push does nothing.
   - **Rehearse** any time: Actions → **Release** → Run workflow, with `dry_run` ticked (the default). It shows the
     release PR it would open or what it would publish, with no approval and no secret, and changes nothing. With
     `dry_run` unticked, a manual run does what a push does: the way to retry a publish that failed or was rejected.
   - **Locally**, `shiprig release --dry-run` previews the whole pipeline (`.changeset/release.jsonc`). A real local
     publish is refused: `node.provenance` is `"always"` (`.changeset/config.json`), and npm provenance can only be
     made in GitHub Actions.
3. **Design source changes** (`packages/theme-forest/design/`) are `@zooui/theme-forest` changes: record them with
   `changerig add -p @zooui/theme-forest`. Like any change to `@zooui/theme-forest`, it is recorded in the theme's changeset and appears in the theme's changelog.

Don't edit the version or changelog by hand, and don't `pnpm publish` directly: `changerig` owns both (0.1.0, below, was the one exception).

### The first release, 0.1.0

Both layers are already at `0.1.0` and have never been published, and the public repository starts with no
changesets and empty changelogs. `releaseAs` in `.github/shiprig-action.jsonc` names each at `0.1.0`, which makes
every push open a `chore: release 0.1.0` PR anyway. npm trusted publishing can only be set up for a package that
already exists, and npm no longer issues tokens a CI publish can use, so 0.1.0 is published by hand and the workflow
takes over from there. Once, in zooui-dev/zooui:

1. **The `release` environment.** Settings → Environments → New environment, named `release`, with **Required
   reviewers** (John). Only the Publish job runs in it, so only a real release waits for that approval.
2. **Let workflows open PRs.** Settings → Actions → General → Workflow permissions: tick **Allow GitHub Actions to
   create and approve pull requests**, or the action can't open the release PR. (In an organization that forbids
   it, allow it at the organization first.)
3. **Push `main`.** The push opens `chore: release 0.1.0`, in which
   `shiprig version --release-as @zooui/nuxt=0.1.0 --release-as @zooui/theme-forest=0.1.0` writes each package's
   `## 0.1.0` changelog entry ("Initial release") and changes no version. Don't merge it yet.
4. **Publish 0.1.0 by hand**, from a clean checkout of that `main`, logged in to npm as an owner of the `@zooui`
   scope: `pnpm publish -r --access public`. pnpm publishes the base before the theme and rewrites the theme's
   `workspace:*` dependency to `0.1.0`. This is the only publish that isn't the workflow's.
5. **Trusted publishing.** On npmjs.com, each package → Settings → Trusted publishing → GitHub Actions: repository
   `zooui-dev/zooui`, workflow `release.yml`, environment `release`. Do both packages.
6. **Merge the release PR.** A PR the default token opens doesn't start its own checks: approve them on the PR
   (**Approve workflows to run**) first. The merge's run waits for approval in `release`; approve it. It finds 0.1.0
   already on npm and skips the publish, then pushes the `@zooui/nuxt@0.1.0` and `@zooui/theme-forest@0.1.0` tags
   and makes their GitHub releases. Every later release publishes from the workflow with the run's OIDC token.

The `releaseAs` entries can stay: once a package has its `## 0.1.0` entry and tag, the action skips them.

### Upgrading Nuxt UI

The layer depends on `@nuxt/ui` with a **tilde** range (`~4.11.1`): patches arrive by themselves, minors don't.
The `apps/forest` tests pin Nuxt UI's measured geometry, so a Nuxt UI minor can change what the layer delivers, and
a caret range would let products resolve a version the tests never saw. A minor is a deliberate upgrade of the
layer: bump `@nuxt/ui` here and in `apps/kitchen-sink/package.json` (the baseline, always the same range), run the
`apps/forest` suite against the kitchen sink, record it with `changerig add`, and release.
