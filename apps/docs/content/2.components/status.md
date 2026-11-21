---
title: Status
description: A status as a mark and a label — five built-in states drawn by shape, so they survive grayscale, plus a product's own statuses from one map.
component: ZStatus
preview: StatusPills
---

Each state has its own **shape**, so status reads without color: in grayscale, for color-blind readers, on a bad projector. Color only reinforces it. The label is always there, too.

::component-example{name="StatusStates"}
::

## Pills

`pill` puts the dot and label on a tinted chip, for a status inside a table row or a card header.

::component-example{name="StatusPills"}
::

## Glow

`glow` lights the healthy dot with a soft glow in its own color, a way of saying "live". The other states stay unlit.

::component-example{name="StatusGlow"}
::

## Your own statuses

A product names its statuses once, in its app.config under `zooui.status.states`: a key, a label, an icon and one of Nuxt UI's semantic colors. Every `ZStatus` then takes the key, and `state` autocompletes it.

```ts [app.config.ts]
export default defineAppConfig({
  zooui: {
    status: {
      states: {
        draft: { label: 'Draft', icon: 'i-lucide-pencil-line', color: 'neutral' },
        review: { label: 'In review', icon: 'i-lucide-eye', color: 'info' },
        scheduled: { label: 'Scheduled', icon: 'i-lucide-calendar-clock', color: 'warning' },
        shipped: { label: 'Shipped', icon: 'i-lucide-rocket', color: 'success' },
        archived: { label: 'Archived', icon: 'i-lucide-archive', color: 'neutral' },
      },
    },
  },
})
```

::component-example{name="StatusCustom"}
::

The five built-ins stay. The product's map is laid over them field by field, and the `states` prop over that for one use: `{ warn: { label: 'Almost full' } }` renames the built-in and keeps its triangle. A key the map doesn't know, such as a value from the server, shows "Unknown" with a help icon (`zooui.status.fallback` changes it), and the default slot can still show the product's own text.

Give each status an icon, so two of them are never told apart by color alone.

## In a select

`useStatusStates()` returns the same map for the rest of the product. `options()` gives items for `USelectMenu`, with each icon in its status's color, or for `ZFilterSelect` (`icon-class-key="iconClass"`), in the map's order or the order of the keys you pass.

```vue
<script setup lang="ts">
const { options, info } = useStatusStates()
const items = options(['draft', 'review', 'scheduled', 'shipped', 'archived'])
const status = ref('draft')
</script>

<template>
  <USelectMenu v-model="status" :items="items" value-key="value" />
  <ZStatus :state="status" />
</template>
```
