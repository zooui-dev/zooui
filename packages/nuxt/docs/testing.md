# Guards and tests

## The guards every product runs

One check ships with the base layer, for any page's Playwright test (it runs inside the page):

```ts
import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'

expect(await page.evaluate(findConflicts)).toEqual([])          // no element with two same-property utilities
```

## The tests

`apps/base/tests/base.spec.ts` holds the base alone, in a product with its own look (its own palette, typefaces,
color-mode key, CSS and accent map), against its production build: none of Forest's colors, ramps, typefaces,
ground or restyling arrive; the color-mode key and default stay the product's and no `data-theme` is written;
every Z\* component paints in the product's colors in both modes, and `font-mono` falls back to the system mono
stack; the product's `@theme` tokens, `@utility` and `@layer base` rules work after `base.css`; `light-dark()`
tokens resolve in both modes in the compiled CSS; a `data-accent` hue map paints the roles and `ZCard
color="accent"` in both modes; `UFormField` labels still name their inputs after hydration; and Z\* icons render
with no request for icon data.

Forest's own tests, which also run every `Z*` component on every scheme, are in
[its README](../../theme-forest/README.md#the-tests-prove-color-only).

## Open — decide one at a time

**Corners.** Nuxt UI's `--ui-radius` (4px base) is close to the design source's `tight` corners; its
`soft`/`tight`/`flat` dial is not carried into Nuxt. A product that wants squarer corners sets `--ui-radius` itself.
