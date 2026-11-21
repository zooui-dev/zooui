# ZStatus

A status as a mark and a label (`components/Status.vue`). Five states are built in and drawn by **shape** — healthy
(filled circle), warn (triangle), suspended (square), unreachable (dashed ring), quiet (hollow ring) — so they read in
grayscale; color only reinforces them. A product adds its own statuses once, as a map from a key to a label, an icon
and a color, and every `ZStatus`, select and filter reads the same entry.

```vue
<ZStatus state="healthy" />
<ZStatus state="warn" pill />
<ZStatus state="healthy" glow />
<ZStatus state="shipped" />                                   <!-- from app.config -->
<ZStatus state="scheduled" :states="{ scheduled: { label: 'Queued' } }" />
<ZStatus :state="post.status">{{ post.statusName }}</ZStatus>  <!-- the product's own text -->
```

## Props

| Prop | Default | |
| --- | --- | --- |
| `state` | `'healthy'` | The key to show. Typed as the built-ins plus the keys of app.config's `zooui.status.states`, so it autocompletes; any other string is accepted and falls back. |
| `states` | — | Statuses for this one use, over app.config's and the built-ins. |
| `pill` | `false` | The mark and label on a tinted chip, for a table row or a card header. |
| `glow` | `false` | A soft glow around the healthy dot, in its own color. Only the healthy shape lights up. |

The default slot replaces the label; the mark stays.

## A product's own statuses

Set them once in the product's app.config:

```ts
export default defineAppConfig({
  zooui: {
    status: {
      states: {
        draft: { label: 'Draft', icon: 'i-lucide-pencil-line', color: 'neutral' },
        review: { label: 'In review', icon: 'i-lucide-eye', color: 'info' },
        scheduled: { label: 'Scheduled', icon: 'i-lucide-calendar-clock', color: 'warning' },
        shipped: { label: 'Shipped', icon: 'i-lucide-rocket', color: 'success' },
        archived: { label: 'Archived', color: 'neutral' },
      },
      fallback: { label: 'Other' },   // optional
    },
  },
})
```

- **`color`** is one of Nuxt UI's semantic colors (`primary`, `secondary`, `success`, `info`, `warning`, `error`,
  `neutral`), so the status takes the product's palette and dark mode. The label stays in the default ink; the icon is
  drawn in the color.
- **`icon`** is any Iconify name. Give every status one: without it the status is a dot in its color, and two dots
  are told apart by color alone.
- **Merging.** The built-ins come first, then app.config's map, then the `states` prop, each over the last **field by
  field**: `{ warn: { label: 'Almost full' } }` renames the built-in and keeps its triangle. A built-in keeps its shape
  until it is given an `icon` or a different `color`; then it is drawn like a product status. A key keeps the place it
  first appeared, so new keys follow the built-ins in the order they were written. A new key without a `label` shows
  the key itself.
- **An unknown key** — a value from the server the map doesn't know — shows `zooui.status.fallback`, by default
  "Unknown" with a help icon in neutral, and the root carries `data-state-known="false"`. Pass the product's own text
  in the default slot to keep its name.

## `useStatusStates()`

The same map for the rest of the product: a select of statuses, a filter, a board's columns.

```ts
const { states, keys, info, options } = useStatusStates()      // or useStatusStates(() => extraStates)
info('shipped')        // { label: 'Shipped', icon: 'i-lucide-rocket', color: 'success', known: true }
info('nope')           // the fallback, known: false
keys.value             // every key, built-ins first, in map order
options(['draft', 'review', 'scheduled', 'shipped', 'archived'])
//   [{ label, value, icon?, color, chip?, iconClass, ui: { itemLeadingIcon } }, …] in the order given
```

`options()` items go straight into `USelectMenu` / `USelect` (`value-key="value"`; each icon takes its status's color
through `ui.itemLeadingIcon`, and a status without an icon gets a `chip` in its color) and into `ZFilterSelect`
(`icon-class-key="iconClass"`). With no keys it lists the whole map, built-ins included.

The framework-free half is `utils/status-states.ts`: `mergeStatusStates`, `statusInfo`, `statusOptions`,
`BUILT_IN_STATUS_STATES` and `STATUS_FALLBACK`.

## Accessibility

The label is the status's name; the mark is `aria-hidden`. Built-in shapes and product icons are told apart without
color. Labels use text inks that clear 4.5:1, and marks Nuxt UI's color shades (3:1 for graphics) — on Forest,
`apps/forest/tests/status.spec.ts` checks both in light and dark.
