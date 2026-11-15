---
title: Card
description: Nuxt UI's UCard with a colored left edge.
component: ZCard
wraps: UCard
preview: CardParts
---

`ZCard` is `UCard` with one addition: `color` gives it a 3px left edge in that color, Zoo UI's callout. With no `color` it is a plain `UCard`.

::component-example{name="CardEdges"}
::

## With header and footer

The edge runs the card's full height.

::component-example{name="CardParts"}
::

## In a section's accent

`color="accent"` takes the edge from the surrounding [`data-accent`](/guide/theming#per-section-accent) section, and the primary outside one.

::component-example{name="CardAccent"}
::
