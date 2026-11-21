import type { AppConfig } from 'nuxt/schema'
import type { MaybeRefOrGetter } from 'vue'
import { status } from '../components/recipes'
import {
  BUILT_IN_STATUS_STATES, mergeStatusStates, statusInfo, statusOptions,
  type BuiltInStatus, type StatusColor, type StatusConfig, type StatusOption, type StatusState, type StatusStateMap,
} from '../utils/status-states'

/** The keys a product put under `zooui.status.states` in its app.config, read from Nuxt's generated types. */
type ConfiguredStatus = AppConfig extends { zooui: { status: { states: infer S } } } ? Extract<keyof S, string> : never

/** Every status a product has: the built-ins and its own, for autocomplete. Any other string still works and falls back. */
export type StatusKey = BuiltInStatus | ConfiguredStatus

export interface StatusOptionWithClass extends StatusOption {
  /** The icon's color class, for ZFilterSelect's `icon-class-key` or a `#leading` slot. */
  iconClass: string
  /** The same class where USelectMenu and USelect read it, so their items' icons take the status's color. */
  ui: { itemLeadingIcon: string }
}

/**
 * The product's status map: the five built-ins, then app.config `zooui.status.states`, then `states` (a prop, a ref or
 * a getter), each over the last. `info(key)` is one entry, with the fallback for a key the map lacks; `options()` the
 * map as select or filter items, in its order (or the order of the keys given); `keys` the map's keys in that order.
 */
export function useStatusStates(states?: MaybeRefOrGetter<StatusStateMap | undefined>) {
  const config = useAppConfig() as { zooui?: { status?: StatusConfig } }
  const own = computed(() => config.zooui?.status ?? {})
  const map = computed<Record<string, StatusState>>(() => mergeStatusStates(BUILT_IN_STATUS_STATES, own.value.states, toValue(states)))

  return {
    states: map,
    keys: computed(() => Object.keys(map.value) as (StatusKey | (string & {}))[]),
    info: (key: StatusKey | (string & {}) | null | undefined) => statusInfo(map.value, key, own.value.fallback),
    options: (keys?: readonly (StatusKey | (string & {}))[]): StatusOptionWithClass[] =>
      statusOptions(map.value, keys).map((o) => {
        const iconClass = statusIconClass(o.color)
        return { ...o, iconClass, ui: { itemLeadingIcon: iconClass } }
      }),
  }
}

/** The icon ink for a status color (recipes.ts holds the classes, where Tailwind sees them). */
export const statusIconClass = (color: StatusColor) => status.ink[color]
