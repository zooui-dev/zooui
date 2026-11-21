// What EntryField.vue needs to know about the value it holds: how to write it, read it back from typed text, compare
// it, check it against the limits and move it with a shortcut key. ZDateField gives it a PlainDate's (date-entry.ts),
// ZMonthField a PlainYearMonth's (month-entry.ts), ZYearField a year number's (year-entry.ts). Everything else — the
// box, the commit on Enter, Tab and blur, the invalid mark, `dateUpdate`, the clear button and the popover — is the
// field's, the same for all three.
import type { Temporal } from 'temporal-polyfill/implementation'

/** A value the limits refuse: why, the value, and the limit it crossed (null when it isn't a limit, as for a day
 *  that is unavailable). */
export interface EntryProblem<V> {
  readonly reason: string
  readonly date: V
  readonly limit: V | null
}

export interface EntryEngine<V> {
  /** The pattern the box writes and reads, `MM/DD/YYYY`; the placeholder unless one is given. A change redraws the box. */
  readonly pattern: string
  /** The value as the box writes it; empty for none. */
  show(value: V | null): string
  /** What typed text names, or null. */
  parse(text: string, today: Temporal.PlainDate): V | null
  /** The value once the text is committed: `current` while the text is untouched, else what it names, or null. */
  commit(text: string, current: V | null, today: Temporal.PlainDate): V | null
  same(a: V | null, b: V | null): boolean
  /** Why the limits refuse the value, or null. */
  check(value: V): EntryProblem<V> | null
  /** An English sentence for a refusal. */
  message(problem: EntryProblem<V>): string
  /** Whether the key is a shortcut, taken even when it has nowhere to go. */
  isShortcut(key: string): boolean
  /** Where a shortcut key moves `current` (today's period when null), or null when it has nowhere to go. */
  shortcut(key: string, current: V | null, today: Temporal.PlainDate): V | null
  /** Today's period, which the calendar shows when the field is empty. */
  today(today: Temporal.PlainDate): V
}

type SlotClass = (options?: { class?: unknown }) => string
/** The `ui` UInput hands its `#leading` slot: a class function per slot of the input. `leadingIcon` and `trailingIcon`
 *  are named, so a slot can call them without checking for undefined. */
export type InputSlotUi = { leadingIcon: SlotClass, trailingIcon: SlotClass } & Record<string, SlotClass>
