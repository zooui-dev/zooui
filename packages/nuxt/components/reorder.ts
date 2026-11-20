/**
 * ZRepeatingList's reordering, apart from the component (tests: scripts/reorder.test.mjs): where a move takes a row,
 * which keys ask for one, and the list after it. A move hands back a new array of the same row objects, so a row's
 * key (and its error, and whether it is folded) goes with it.
 */

/** Up and down one place, or to either end. */
export type Move = 'up' | 'down' | 'top' | 'bottom'

export const MOVES: readonly Move[] = ['top', 'up', 'down', 'bottom']

/** Each move's button icon. */
export const MOVE_ICONS: Record<Move, string> = {
  up: 'i-lucide-arrow-up',
  down: 'i-lucide-arrow-down',
  top: 'i-lucide-arrow-up-to-line',
  bottom: 'i-lucide-arrow-down-to-line',
}

/** Where `move` takes the row at `index` in a list of `length`, or `null` when it is already at that edge. */
export function moveTarget(move: Move, index: number, length: number): number | null {
  if (index < 0 || index >= length) return null
  const to = move === 'up' ? index - 1 : move === 'down' ? index + 1 : move === 'top' ? 0 : length - 1
  return to === index || to < 0 || to >= length ? null : to
}

/**
 * The move a key press asks for, or `null`: Alt+ArrowUp and Alt+ArrowDown move a row one place; Alt+Home and Alt+End
 * (or Alt+Shift+ArrowUp and Alt+Shift+ArrowDown, for keyboards without Home and End) move it to the top or bottom.
 * With Ctrl or Meta held as well it is some other shortcut, and left alone.
 */
export function moveForKey(e: { key: string; altKey: boolean; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }): Move | null {
  if (!e.altKey || e.ctrlKey || e.metaKey) return null
  if (e.key === 'ArrowUp') return e.shiftKey ? 'top' : 'up'
  if (e.key === 'ArrowDown') return e.shiftKey ? 'bottom' : 'down'
  if (e.shiftKey) return null
  if (e.key === 'Home') return 'top'
  if (e.key === 'End') return 'bottom'
  return null
}

/** `list` with the item at `from` moved to `to`: a new array of the same items. */
export function moved<T>(list: readonly T[], from: number, to: number): T[] {
  const next = list.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item as T)
  return next
}
