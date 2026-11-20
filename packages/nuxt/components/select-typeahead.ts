/**
 * ZSelectMenu's typeahead, apart from the component so the rules read in one place: which items a typed search can
 * land on, how an item's label and value are read (as Nuxt UI's USelectMenu reads them, by `labelKey` and `valueKey`,
 * dotted paths included), and which item a search matches. The matching searches from the top of the list, whatever
 * is selected: a search matches the first item whose label starts with it; pressing one letter again and again cycles
 * through the items that start with it, onward from the current one.
 */

/** How the menu reads its items: the props of the same names on USelectMenu. */
export interface TypeaheadKeys {
  labelKey?: string
  valueKey?: string
  /** USelectMenu's `by`: the field, or the function, that tells two values apart. */
  by?: string | ((a: unknown, b: unknown) => boolean)
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

function get(item: unknown, path: string): unknown {
  let v: unknown = item
  for (const key of path.split('.')) v = isObject(v) ? v[key] : undefined
  return v
}

/** The items a search can land on: groups flattened, without labels, separators and disabled items. */
export function selectableItems<T>(items: readonly (T | readonly T[])[] | undefined): T[] {
  const out: T[] = []
  for (const entry of items ?? []) {
    for (const item of (Array.isArray(entry) ? entry : [entry]) as T[]) {
      const v: unknown = item
      if (v == null) continue
      if (isObject(v) && (v.type === 'label' || v.type === 'separator' || v.disabled)) continue
      out.push(item)
    }
  }
  return out
}

/** An item's label: `labelKey` (default `label`) on an object, the item itself otherwise. */
export function itemLabel(item: unknown, keys: TypeaheadKeys = {}): string {
  if (!isObject(item)) return item == null ? '' : String(item)
  const label = get(item, keys.labelKey ?? 'label')
  return label == null ? '' : String(label)
}

/** What choosing an item puts in the model: its `valueKey` field when there is one, the item itself otherwise. */
export function itemValue(item: unknown, keys: TypeaheadKeys = {}): unknown {
  return keys.valueKey && isObject(item) ? get(item, keys.valueKey) : item
}

/** Whether two model values are the same choice, by `by` when given, as USelectMenu compares them. */
export function sameValue(a: unknown, b: unknown, keys: TypeaheadKeys = {}): boolean {
  if (a === b) return true
  if (!isObject(a) || !isObject(b)) return false
  if (typeof keys.by === 'function') return keys.by(a, b)
  if (typeof keys.by === 'string') return get(a, keys.by) === get(b, keys.by)
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * The item a typed search lands on, or undefined when nothing matches (or the match is the current item).
 * `search` is everything typed since the last pause; `current` is the model's value.
 */
export function typeaheadMatch<T>(items: readonly T[], search: string, current: unknown, keys: TypeaheadKeys = {}): T | undefined {
  if (!search) return undefined
  const lower = search.toLocaleLowerCase()
  const startsWith = (prefix: string) => (item: T) => itemLabel(item, keys).toLocaleLowerCase().startsWith(prefix)
  const isCurrent = (item: T) => sameValue(itemValue(item, keys), current, keys)
  let match: T | undefined
  if (lower.length > 1 && [...lower].every((c) => c === lower[0])) {
    // "bbb" is pressing b three times: the next item that starts with b after the current one, round to the first.
    const matches = items.filter(startsWith(lower[0]!))
    match = matches[(matches.findIndex(isCurrent) + 1) % matches.length]
  } else {
    // From the top of the list, not from the current item.
    match = items.find(startsWith(lower))
  }
  return match === undefined || isCurrent(match) ? undefined : match
}
