// ZOrderList's ordering, framework-free: where a move takes an item, the array after it, and which row a typed
// prefix lands on. components/OrderList.vue is the only caller; scripts/order-list.test.mjs tests it.

/** The four moves: to the top, one up, one down, to the bottom. */
export type OrderMove = 'top' | 'up' | 'down' | 'bottom'

/** Where `move` takes the item at `index` in a list of `length`, or null when it has nowhere to go (already at that
 *  end, or `index` is not a row). */
export function moveTarget(index: number, length: number, move: OrderMove): number | null {
  if (!Number.isInteger(index) || index < 0 || index >= length) return null
  const to = move === 'top' ? 0 : move === 'up' ? index - 1 : move === 'down' ? index + 1 : length - 1
  return to < 0 || to >= length || to === index ? null : to
}

/** A new array with the item at `from` taken out and put back at `to`; the items themselves are the same objects. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item as T)
  return next
}

/**
 * The row a typed prefix selects, given the row `start` it is typed on (-1 for none): the first title, searching
 * forward and wrapping, that starts with `query` (case- and accent-insensitive, leading space ignored). One letter
 * searches from the row after `start`, so the same letter typed over and over ("sss") cycles through the rows starting
 * with it, as a native select does; a longer query includes `start`, so the row it is on stays while it still matches.
 * -1 when nothing matches.
 */
export function typeaheadIndex(titles: readonly string[], query: string, start: number): number {
  const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').trimStart().toLocaleLowerCase()
  let q = fold(query)
  if (!q) return -1
  if ([...q].every((c) => c === q[0])) q = q[0]!
  const n = titles.length
  const from = start < 0 || start >= n ? 0 : q.length > 1 ? start : start + 1
  for (let k = 0; k < n; k++) {
    const i = (from + k) % n
    if (fold(titles[i]!).startsWith(q)) return i
  }
  return -1
}
