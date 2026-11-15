// The Forest theme's app.config — the theme layer's, never the base's: a product's app.config can override these
// keys but not remove them. Nuxt UI resolves everything else — hover shades, dark-mode shade choice, alpha
// variants — from these palettes, which is the point: we are choosing colors, not re-specifying components.
//
//   primary  → the scheme's accent: the brand color, and the one that changes most between schemes
//   secondary → the pine grays: Forest's secondary is muted, not a second hue
//   success   → the scheme's own success ramp } declared in each scheme file, chosen to sit ≥30° of hue away
//   info      → the scheme's own info ramp    } from that scheme's accent so neither reads as the primary
//   warning, error → amber and clay red
//
// The colored edge (components/edge.ts) on the one surface that already has a color: toasts get a 3px
// LEFT edge in their color, as Forest's toast does. Written out per color so Tailwind's scan sees each class.
const toastEdges = [
  { color: 'primary', class: { root: 'border-l-3 border-primary' } },
  { color: 'secondary', class: { root: 'border-l-3 border-secondary' } },
  { color: 'success', class: { root: 'border-l-3 border-success' } },
  { color: 'info', class: { root: 'border-l-3 border-info' } },
  { color: 'warning', class: { root: 'border-l-3 border-warning' } },
  { color: 'error', class: { root: 'border-l-3 border-error' } },
  { color: 'neutral', class: { root: 'border-l-3 border-inverted' } },
]

// Forest's banner: alerts take a STRIPED edge — a 6px hatched strip down the left, painted in the alert's color
// (core RECIPES "Banner (hatched edge)"). On every variant the strip is the color; on `solid`, where the surface
// already IS that color, the strip goes white so it still shows. `outline` becomes Forest's banner itself: a plain
// raised surface with neutral text and border, and only the strip and icon carrying the color.
const ALERT_COLORS = ['primary', 'secondary', 'success', 'info', 'warning', 'error', 'neutral'] as const
const stripe: Record<(typeof ALERT_COLORS)[number], string> = {
  primary: 'before:text-primary', secondary: 'before:text-secondary', success: 'before:text-success', info: 'before:text-info',
  warning: 'before:text-warning', error: 'before:text-error', neutral: 'before:text-inverted',
}
const icon: Record<(typeof ALERT_COLORS)[number], string> = {
  primary: 'text-primary', secondary: 'text-secondary', success: 'text-success', info: 'text-info',
  warning: 'text-warning', error: 'text-error', neutral: 'text-highlighted',
}
const alertStripes = [
  ...ALERT_COLORS.map((color) => ({ color, class: { root: stripe[color] } })),
  { variant: 'solid', class: { root: 'before:text-white/70' } },
  ...ALERT_COLORS.map((color) => ({
    color, variant: 'outline',
    class: { root: 'bg-default text-default ring ring-inset ring-default', title: 'text-highlighted', description: 'text-muted opacity-100', icon: icon[color] },
  })),
]

// Forest's kicker — the mono, uppercase, tracked label it puts over data (core RECIPES "Kicker", "Table"): table and
// grid headers and group labels. Type only; each component keeps its own padding, height and rules.
const KICKER = 'font-mono font-medium text-xs leading-[1.2] tracking-[0.08em] uppercase text-muted whitespace-nowrap'

export default defineAppConfig({
  /**
   * nu-grid (@nu-grid/nuxt), for products that use it. Inert otherwise: nothing reads this key, and the layer
   * does not depend on nu-grid. The same rules as for Nuxt UI's own components:
   *   - color comes free: nu-grid themes through Nuxt UI's tokens, which this layer points at Forest's ramps;
   *   - geometry stays nu-grid's: no forced density (1.x defaulted to 'compact') — whichever nu-grid theme a grid
   *     uses keeps its own spacing; headers and group labels are Forest's kicker, in type only (`ui.table` and the
   *     group slots below);
   *   - the colored-edge rule: a group band never tints a large area with the accent — the band is neutral and
   *     the accent is a 3px leading edge on both themes ('default' ships 4px, 'compact' 3px).
   * `dark:` is spelled out because tailwind-merge only replaces a class with the SAME variant: 'compact' tints the
   * band `dark:bg-primary/12`, which a plain `bg-elevated/50` would leave in place.
   */
  nuGrid: {
    ui: {
      slots: {
        groupHeader: 'bg-elevated/50 hover:bg-elevated dark:bg-elevated/50 dark:hover:bg-elevated',
        groupHeaderLeft: 'border-l-3',
        // headers come from `ui.table` (nu-grid inherits it); the group band's labels are its own slots
        groupLabel: KICKER,
        thGroupInner: KICKER,
        // Forest's tables use tabular figures, so numbers line up down a column
        td: 'tabular-nums',
      },
    },
  },
  ui: {
    // The mono face where Forest sets a value, as 1.x did: badges (a count, a version, a state), table headers
    // (the kicker) and keyboard keys. The face only — size, padding and radius stay Nuxt UI's. Table cells take
    // tabular figures, as the grid's do, so numbers line up down a column.
    badge: { slots: { base: 'font-mono' } },
    kbd: { base: 'font-mono' },
    table: { slots: { th: KICKER, td: 'tabular-nums' } },
    // toasts: the colored left edge, and no progress bar (Forest shows the message, not a countdown)
    toast: { slots: { progress: 'hidden' }, compoundVariants: toastEdges },
    alert: {
      slots: { root: "before:content-[''] before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:hatch" },
      compoundVariants: alertStripes,
    },
    // The current-page marker, opt-in through two CSS variables: on a menu that asks for Nuxt UI's `highlight`, the
    // bar's thickness and the current item's weight read `--nav-highlight-size` and `--nav-current-weight`. A product
    // sets them in its own CSS (say 2px and 700). Unset, they fall back to exactly what Nuxt UI ships (h-px / w-px,
    // font-medium), so no menu changes until a product asks. tailwind-merge swaps these for Nuxt UI's own classes, so
    // no element carries both. `variant="link" color="neutral" highlight highlight-color="primary"` gives no pill, a
    // neutral label over a primary underline (unset, highlight-color follows `color`).
    navigationMenu: {
      compoundVariants: [
        { orientation: 'horizontal', highlight: true, class: { link: 'after:h-[var(--nav-highlight-size,1px)]' } },
        { orientation: 'vertical', highlight: true, level: true, class: { link: 'after:w-[var(--nav-highlight-size,1px)]' } },
        { highlight: true, active: true, class: { link: 'font-[weight:var(--nav-current-weight,500)]' } },
      ],
    },
    colors: {
      primary: 'accent',
      secondary: 'pine',
      success: 'pine-success',
      info: 'pine-info',
      warning: 'pine-amber',
      error: 'pine-red',
      neutral: 'pine',
    },
  },
})
