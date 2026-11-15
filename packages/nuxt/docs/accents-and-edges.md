# Accents and colored edges

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
and striped alert banners: [Forest's colored edges](../../theme-forest/README.md#colored-edges).
