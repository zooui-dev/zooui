---
title: Nuxt UI as it ships, with themes on top
description: Zoo UI is a Nuxt layer over Nuxt UI. It keeps Nuxt UI's components, geometry and behavior exactly as they ship, adds the few components Nuxt UI has no equivalent of, and puts a look on top as a separate theme you opt into.
navigation: false
---

## What Zoo UI is

Nuxt UI is already a polished, accessible component library. Zoo UI does not restyle it. It adds three things:

- **Themes, as layers you opt into.** A theme chooses colors, typefaces and the page ground, and stops there: radius, spacing, shadows, motion and focus rings stay Nuxt UI's. This site wears **Forest**, the first theme. Pick another scheme from the header and every component repaints.
- **Components Nuxt UI doesn't have.** Status by shape, quota meters, shown-once tokens, a code surface with copy, package-ecosystem marks, and a few more, all written on Nuxt UI's semantic tokens so they take whatever colors your product gives Nuxt UI.
- **Colored edges.** One addition to Nuxt UI's surfaces: a 3px edge in the surface's color, on cards, dialogs, slideovers and drawers.

::warning
Zoo UI is **not released yet**. The packages below are not on npm; these docs describe them as they will ship.
::

## Two packages

| Package | What you get |
| --- | --- |
| `@zooui/nuxt` | The **theme-free base**: Nuxt UI as it ships, every `Z*` component, the colored-edge wrappers, and the mechanisms every product needs. No colors, typefaces or ground of its own: your product's look stays yours. |
| `@zooui/theme-forest` | The **Forest theme**: a layer that extends `@zooui/nuxt` and adds Forest's colors, six accent schemes, Inter and JetBrains Mono, and the page ground. Extend this one layer to get both. |

## Quick start

Extend the theme layer:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  extends: ['@zooui/theme-forest'],
  css: ['~/assets/css/main.css'],
})
```

Make the layer's stylesheet the first line of your one CSS entry:

```css [app/assets/css/main.css]
@import "@zooui/theme-forest/assets/css/forest.css";
```

Wrap the app in Nuxt UI's `UApp` and use any component:

```vue [app/app.vue]
<template>
  <UApp>
    <ZCard color="primary">
      <ZKicker>deployments</ZKicker>
      <ZStatus state="healthy" pill />
    </ZCard>
  </UApp>
</template>
```

The [getting started guide](/guide/getting-started) covers the theme-free base, schemes and the versions you need.

## Components

::component-gallery
::
