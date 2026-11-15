/**
 * Zoo UI's colored edge — the one piece of Zoo UI styling the base adds to Nuxt UI's surfaces. A 3px stripe in the
 * surface's color: on the TOP for overlays (dialog, slideover, drawer — Zoo UI's danger dialog), on the LEFT for
 * inline surfaces (card, toast — Zoo UI's toast and callout). Everything else about the surface is Nuxt UI's.
 *
 * The class strings are written out in full so Tailwind's scan finds them. `border-<color>` sets every side's
 * color, but only the edge side has width, so only the edge shows; Nuxt UI's semantic colors switch to their
 * 400 shade in dark mode on their own.
 *
 * `accent` is the section's accent (`data-accent`, base.css): the `--accent` role, which carries its own dark value.
 * Outside any `data-accent` container it falls back to the primary. Overlays portal to <body>, outside the section,
 * so their wrappers carry the section's name onto the overlay's content (useSectionAccent).
 */
import { getCurrentInstance, onMounted, onUpdated, ref } from 'vue'

export const EDGE_COLORS = ['primary', 'secondary', 'success', 'info', 'warning', 'error', 'neutral', 'accent'] as const
export type EdgeColor = (typeof EDGE_COLORS)[number]

const edgeColor: Record<EdgeColor, string> = {
  primary: 'border-primary',
  secondary: 'border-secondary',
  success: 'border-success',
  info: 'border-info',
  warning: 'border-warning',
  error: 'border-error',
  neutral: 'border-inverted',
  accent: 'border-[color:var(--accent,var(--ui-primary))]',
}

/** The edge classes for a surface, or '' for no color (a plain Nuxt UI surface). */
export const edge = (side: 'top' | 'left', color?: EdgeColor) =>
  color ? `${side === 'top' ? 'border-t-3' : 'border-l-3'} ${edgeColor[color]}` : ''

/** Prepend the edge to one slot of a Nuxt UI `ui` object, keeping whatever the caller passed for it. */
export function withEdge<T extends Record<string, unknown>>(ui: T | undefined, slot: string, classes: string): T {
  if (!classes) return (ui ?? {}) as T
  const existing = ui?.[slot]
  return { ...(ui ?? {}), [slot]: existing ? `${classes} ${existing}` : classes } as T
}

/**
 * The `data-accent` name of the section a component sits in, read from the DOM where it renders — for an overlay
 * wrapper to put on its content, which Nuxt UI portals to <body> and so out of the section's reach. Read after mount
 * and after every update (the wrapper re-renders when its `open` or other attributes change), so it is current
 * whenever the overlay opens; undefined on the server and outside any section.
 */
export function useSectionAccent() {
  const instance = getCurrentInstance()
  const name = ref<string>()
  const read = () => {
    const el = instance?.proxy?.$el as Node | null | undefined
    name.value = (el?.parentElement?.closest('[data-accent]') as HTMLElement | null)?.dataset.accent
  }
  onMounted(read)
  onUpdated(read)
  return name
}

/** An overlay's `content` props with the section's accent added, for `color="accent"`; the caller's kept otherwise. */
export function withSectionAccent(content: unknown, color: EdgeColor | undefined, accent: string | undefined) {
  const props = content as Record<string, any> | undefined
  return color === 'accent' && accent ? { ...(props ?? {}), 'data-accent': accent } : props
}
