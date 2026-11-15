## Upgrading Nuxt UI

The layer depends on `@nuxt/ui` with a **tilde** range (`~4.11.1`): patches arrive by themselves, minors don't.
The `apps/forest` tests pin Nuxt UI's measured geometry, so a Nuxt UI minor can change what the layer delivers, and
a caret range would let products resolve a version the tests never saw. A minor is a deliberate upgrade of the
layer: bump `@nuxt/ui` here and in `apps/kitchen-sink/package.json` (the baseline, always the same range), run the
`apps/forest` suite against the kitchen sink, record it with `changerig add`, and release.

A product on an older Nuxt UI moves to the layer's when it adopts Zoo UI: it removes its own `@nuxt/ui` (and
`tailwindcss`) and gets 4.11 through the layer.
