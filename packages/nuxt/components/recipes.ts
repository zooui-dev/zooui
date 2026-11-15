/**
 * Class strings for Zoo UI's own components — the few things Nuxt UI has no equivalent of: Kicker, Identifier,
 * Status, QuotaMeter, CodeBlock, TokenReveal and EcosystemMark (Slots is Nuxt UI badges, and needs none). Everything
 * else is Nuxt UI's own component, colored by the layer.
 *
 * They are written on Nuxt UI's semantic tokens (text-muted, bg-elevated, border-default …) and its palettes
 * (`--ui-color-<color>-<shade>`), never on raw ramps, so a scheme or a dark-mode switch carries through them as it
 * does through Nuxt UI's components. Where Zoo UI needs more contrast than Nuxt UI's 500/400 text shades give — the
 * status and accent inks, which must clear 4.5:1 — they use 700 in light mode and 300 in dark, as v1 did.
 *
 * One rule keeps them order-independent: never put two utilities for the same property on one element. Tailwind
 * resolves that by its GENERATED order, never by the order the classes are written, so a base string holds only
 * what no variant changes and what varies lives in exactly one map entry. apps/forest runs
 * testing/find-conflicts on every rendered element to hold it.
 */

/** Keyboard focus, as Nuxt UI draws it on its own controls. */
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

/** Accent ink that clears 4.5:1 on Nuxt UI's surfaces in both themes. */
const accentText = 'text-(--ui-color-primary-700) dark:text-(--ui-color-primary-300)'

export const kicker = {
  base: 'font-mono font-medium text-xs leading-[1.2] tracking-[0.08em] uppercase',
  variant: {
    /** Zoo UI's own: a muted label in primary brackets */
    bracket: "text-muted before:content-['[_'] before:text-primary after:content-['_]'] after:text-primary",
    /** The eyebrow: the label itself in the accent ink, no brackets (they would be a second accent mark) */
    eyebrow: accentText,
  },
} as const

export const ident = {
  /* `kind` owns weight, color, background and padding: plain has no chip */
  base: 'font-mono text-sm leading-[1.3] rounded-sm py-px whitespace-nowrap',
  kind: {
    package: 'font-medium text-highlighted bg-elevated px-1.5',
    version: `font-medium ${accentText} bg-elevated px-1.5`,
    /** never tinted: a hash is read character by character */
    hash: 'font-normal text-highlighted tracking-[0.01em] bg-elevated px-1.5',
    plain: 'font-medium text-highlighted',
  },
} as const

export const status = {
  /* no text-* here: `state` owns the color, `pill` owns the size */
  base: 'inline-flex items-center gap-1.5 font-normal leading-normal whitespace-nowrap',
  size: { plain: 'text-sm', pill: 'text-xs' },
  state: {
    healthy: 'text-default',
    warn: 'text-default',
    suspended: 'text-muted',
    quiet: 'text-muted',
    unreachable: 'text-(--ui-color-error-700) dark:text-(--ui-color-error-300)',
  },
  pill: 'h-[22px] pl-[7px] pr-2 rounded-full bg-elevated ring ring-inset ring-default',
  /** shape carries the state; color only reinforces it, so it survives grayscale */
  glyph: 'flex-none inline-block relative',
  shape: {
    healthy: 'w-2.5 h-2.5 rounded-full bg-success',
    warn: 'w-0 h-0 border-l-[5.5px] border-l-transparent border-r-[5.5px] border-r-transparent border-b-[10px] border-b-warning',
    suspended: 'w-2.5 h-2.5 rounded-[1px] bg-(--ui-color-neutral-500)',
    unreachable: 'w-2.5 h-2.5 rounded-full border-[1.5px] border-dashed border-error box-border',
    quiet: 'w-2.5 h-2.5 rounded-full border-[1.5px] border-(--ui-text-dimmed) box-border',
  },
  /** `glow`: a soft light around the healthy dot, in its own color. Only healthy lights up — a glow
   *  says "live", and the other states are the ones that are not. */
  glow: 'shadow-[0_0_12px_var(--ui-success)]',
} as const

export const meter = {
  /* no text-* / no height here: `size` owns both */
  base: 'inline-flex items-center gap-2 font-mono font-normal leading-[1.6] text-muted min-w-0 whitespace-nowrap',
  size: { md: 'text-xs', lg: 'text-sm' },
  track: 'block flex-1 min-w-[60px] rounded-[2px] bg-accented overflow-hidden relative',
  trackSize: { md: 'h-1.5', lg: 'h-2.5' },
  /* the hatch stripes paint in currentColor, so the fill sets a text color for them */
  fill: 'block h-full rounded-[2px] transition-[width] text-white/55 dark:text-black/45',
  level: {
    ok: 'bg-(--ui-color-neutral-700) dark:bg-(--ui-color-neutral-200)',
    warn: 'bg-warning',
    over: 'bg-error hatch',
  },
  mark: 'absolute -top-0.5 -bottom-0.5 w-px bg-(--ui-text-dimmed)',
  value: 'whitespace-nowrap tabular-nums',
  valueLevel: {
    ok: '',
    warn: 'text-(--ui-color-warning-700) dark:text-(--ui-color-warning-300)',
    over: 'text-(--ui-color-error-700) dark:text-(--ui-color-error-300)',
  },
} as const

/** Zoo UI's code surface: near-black in BOTH themes — the one surface that does not follow the page. */
export const code = {
  wrap: 'relative flex items-start gap-3 py-3 pr-3 pl-4 bg-(--ui-color-neutral-900) dark:bg-(--ui-color-neutral-950) text-(--ui-color-neutral-100) border border-(--ui-color-neutral-700) rounded-md font-mono font-normal text-sm leading-[1.6] [container-type:inline-size]',
  prompt: 'text-(--ui-color-primary-300) select-none flex-none',
  pre: 'm-0 flex-1 min-w-0 overflow-x-auto [font:inherit]',
  lang: 'flex-none order-2 self-center font-mono font-medium text-xs leading-[1.2] tracking-[0.08em] uppercase text-(--ui-color-neutral-400)',
  copy: `appearance-none flex-none order-3 h-6 px-2 inline-flex items-center gap-1.5 bg-transparent border border-(--ui-color-neutral-700) rounded-sm text-(--ui-color-neutral-400) font-sans font-medium text-xs leading-[1.2] cursor-pointer hover:text-(--ui-color-neutral-100) hover:border-(--ui-color-neutral-400) data-[done=true]:text-(--ui-color-primary-300) data-[done=true]:border-(--ui-color-primary-300) ${focus}`,
  /** the secret: one click selects all of it, the fallback when the clipboard refuses */
  tok: 'text-(--ui-color-primary-300) select-all',
} as const

/** The shown-once secret: Zoo UI's code surface for the token, a banner for the warning, Nuxt UI's buttons. */
export const tokenReveal = {
  root: 'flex flex-col gap-3 min-w-0',
  /* `hidden` owns the filter: after acknowledgment the secret blurs and stops being selectable */
  secret: 'transition-[filter] duration-200',
  hidden: 'blur-sm select-none',
  actions: 'flex flex-wrap items-center gap-2',
} as const

/** Ecosystem monogram tiles: shape (corner geometry) tells them apart, never color. */
export const eco = {
  /* no text-* color, border color or style here: `state` owns them; `size` owns box, font size and tracking */
  base: 'inline-flex flex-none items-center justify-center box-border border-[1.5px] bg-default font-mono font-semibold leading-none',
  size: {
    sm: 'size-5 text-[9px] tracking-[-0.02em]',
    md: 'size-7 text-[11.5px] tracking-normal',
    lg: 'size-10 text-[15px] tracking-normal',
  },
  state: {
    enabled: 'text-highlighted border-inverted border-solid',
    /** dashed means disabled: not available yet */
    disabled: 'text-muted border-accented border-dashed',
  },
  /** every corner written out: a single `rounded-full` corner would scale its neighbors to zero */
  shape: {
    square: 'rounded-none',
    circle: 'rounded-[50%]',
    leaf: 'rounded-tl-xs rounded-tr-xs rounded-br-[50%] rounded-bl-xs',
    arch: 'rounded-tl-[50%] rounded-tr-[50%] rounded-br-xs rounded-bl-xs',
    lens: 'rounded-tl-[50%] rounded-tr-xs rounded-br-[50%] rounded-bl-xs',
    drop: 'rounded-tl-xs rounded-tr-[50%] rounded-br-[50%] rounded-bl-[50%]',
    rounded: 'rounded-xs',
  },
  wrap: 'inline-flex items-center gap-2 text-sm whitespace-nowrap',
  label: { enabled: 'text-default', disabled: 'text-muted' },
} as const

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')
