// ZStatus's status map: a key → { label, icon, color }, so a product names its own statuses once (app.config
// `zooui.status.states`, or a component's `states` prop) and every ZStatus, select and filter reads the same entry.
//
// Layers merge field by field, later over earlier: the built-ins, then app.config, then the prop. A key keeps the
// place it first appeared in, so a product overriding a built-in leaves it where it was and new keys follow in the
// order they were written — that order is the one a select lists them in. An unknown key resolves to the fallback.
//
// Framework-free: Nuxt auto-imports it in a product.

/** Nuxt UI's semantic colors: a status is tinted with the product's palette, never a hard-coded one. */
export type StatusColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

/** The five states ZStatus draws by shape. */
export type BuiltInStatus = 'healthy' | 'warn' | 'suspended' | 'unreachable' | 'quiet'

/** One status as a product writes it. Every field is optional on an override; a new key's label defaults to the key. */
export interface StatusStateInput {
  label?: string
  /** An Iconify name (`i-lucide-pencil-line`). Without one, a product status is a dot in its color. */
  icon?: string
  color?: StatusColor
}

/** One status, resolved. `shape` names the built-in drawing it keeps (a built-in whose icon and color are untouched). */
export interface StatusState {
  label: string
  icon?: string
  color: StatusColor
  shape?: BuiltInStatus
}

export type StatusStateMap = Record<string, StatusStateInput>

/** What a product sets once, in its app.config under `zooui.status`. */
export interface StatusConfig {
  states?: StatusStateMap
  /** What an unknown key shows: `Unknown` with a help icon, in neutral, unless the product says otherwise. */
  fallback?: StatusStateInput
}

export const BUILT_IN_STATUS_STATES: Readonly<Record<BuiltInStatus, StatusState>> = {
  healthy: { label: 'Healthy', color: 'success', shape: 'healthy' },
  warn: { label: 'Near limit', color: 'warning', shape: 'warn' },
  suspended: { label: 'Suspended', color: 'neutral', shape: 'suspended' },
  unreachable: { label: 'Unreachable', color: 'error', shape: 'unreachable' },
  quiet: { label: 'Quiet', color: 'neutral', shape: 'quiet' },
}

export const STATUS_FALLBACK: Readonly<StatusState> = { label: 'Unknown', icon: 'i-lucide-circle-help', color: 'neutral' }

/** Merge status maps, later over earlier, field by field; the first map is usually BUILT_IN_STATUS_STATES. */
export function mergeStatusStates(...maps: (StatusStateMap | undefined)[]): Record<string, StatusState> {
  const out: Record<string, StatusState> = {}
  for (const map of maps) {
    for (const [key, input] of Object.entries(map ?? {})) {
      const prev = out[key]
      const next: StatusState = {
        label: input.label ?? prev?.label ?? key,
        color: input.color ?? prev?.color ?? 'neutral',
      }
      const icon = input.icon ?? prev?.icon
      if (icon) next.icon = icon
      // A built-in keeps its shape only while it still looks like itself: a new icon or color is the product's drawing.
      const shape = (input as StatusState).shape ?? prev?.shape
      if (shape && !icon && next.color === BUILT_IN_STATUS_STATES[shape].color) next.shape = shape
      out[key] = next
    }
  }
  return out
}

/** The entry for `key`, or the fallback (merged over STATUS_FALLBACK) when the map has none. */
export function statusInfo(states: Record<string, StatusState>, key: string | null | undefined, fallback?: StatusStateInput): StatusState & { known: boolean } {
  const hit = key != null && Object.hasOwn(states, key) ? states[key] : undefined
  if (hit) return { ...hit, known: true }
  return { ...mergeStatusStates({ fallback: STATUS_FALLBACK }, fallback && { fallback }).fallback!, known: false }
}

export interface StatusOption {
  label: string
  value: string
  icon?: string
  color: StatusColor
  /** For an entry without an icon, a USelectMenu chip in its color. */
  chip?: { color: StatusColor }
}

/** The map as items for a select or filter, in map order — or in the order of `keys`, when given. */
export function statusOptions(states: Record<string, StatusState>, keys?: readonly string[]): StatusOption[] {
  return (keys ?? Object.keys(states)).map((value) => {
    const info = statusInfo(states, value)
    const option: StatusOption = { label: info.label, value, color: info.color }
    if (info.icon) option.icon = info.icon
    else option.chip = { color: info.color }
    return option
  })
}
