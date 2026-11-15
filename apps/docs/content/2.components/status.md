---
title: Status
description: A service's state by shape — circle, triangle, square, dashed ring, hollow ring — so it survives grayscale.
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
