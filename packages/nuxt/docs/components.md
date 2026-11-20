# Components

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
| `<ZRepeatingList v-model item-label :new-row row-key? min? max? errors? compact?>` | A generic (`T`) list editor: rows of the caller's fields in `#row`, Add under them and Remove on each, an optional folded `#summary` that opens on an error, focus into a new row, and the count change announced — [docs](repeating-list.md) |
| `<ZNumberInput v-model unit? step? min? max? spin? calc? prefix? suffix? min-fraction-digits? max-fraction-digits? freeform? currency? locale?>` | One number input for money, percent, count and hours, formatting as it is typed for the locale: unit marks in fixed slots so a column lines up, its own chevrons and arrow keys moving by `step` from the current value, clamped and rounded on commit, a `calc` mode for `+ - * /`, decimal arithmetic, the caller's string, number or `Decimal` handed back. [Docs](number-input.md) |
| `<ZDateField v-model model-type? min-value? max-value? is-date-unavailable? format? locale? clearable? placeholder? size? icon? calendar-icon? highlight? portal? clear-label? choose-label?>` | A calendar-day field: a `Temporal.PlainDate` or `CalendarDate` v-model, handed back in its own type; typed entry (`5`, `0512`, `5/12/26`), shortcut keys, a `UPopover` + `UCalendar` picker; Nuxt UI's limit props, with a refused typed date kept out and the field marked invalid; `@date-update` when a date settles, `@invalid`, `@clear`, `@icon-click`, exposed `focus()`. [Docs](date-field.md) |
| `<ZSelectMenu v-model items highlight-selected-on-open? typeahead? close-on-tab? open-on-focus?>` | Nuxt UI's `USelectMenu`, generic (`T`) over its items, with every prop, slot, event and v-model passed through, and the keyboard of a data-entry form: it opens on the selected item; typing on the closed menu picks the first match as a native `<select>` does (announced; with `multiple` it opens on the match instead); Tab closes it and moves on, taking the highlighted item in a single-select search menu once you have typed or arrowed; `open-on-focus` opens it on keyboard focus. Exposed `triggerRef`, `viewportRef`. [Docs](select-menu.md) |

The colored-edge wrappers (`ZCard`, `ZModal`, `ZSlideover`, `ZDrawer`) are in [Accents and colored edges](accents-and-edges.md#colored-edges). Everything else is Nuxt UI's
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
