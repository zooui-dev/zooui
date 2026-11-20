<script setup lang="ts" generic="T extends object">
// A repeating-list editor: rows of the same few fields, with "Add another …" under them and Remove on each. The
// rows' fields are the caller's, in the #row slot, so it holds any input; this owns adding, removing, folding,
// per-row errors, focus and announcing the count. Written on Nuxt UI's tokens.
//
//   <ZRepeatingList v-model="rows" item-label="referral source" :new-row="() => ({ name: '' })" :row-key="(r) => r.id">
//     <template #row="{ row, index, error, errorId }"> …inputs bound to row… </template>
//     <template #summary="{ row }">{{ row.name }}</template>   <!-- optional: fold rows to one line -->
//   </ZRepeatingList>
//
// Rows are edited in place in #row. With a #summary slot, rows already there when it mounts start folded to that
// line with an Edit button (new rows, and any row with an error, are open); without one every row is open.
// `rowKey` keeps a row's identity while it is renamed (rows that carry history); rows it has no key for are told
// apart by object identity, hence `T extends object`.
//
// `reorderable` adds move buttons to each row, and Alt+ArrowUp / Alt+ArrowDown (Alt+Home / Alt+End to the ends) on
// anything focused in it. A move hands v-model a new array of the same row objects, so a row's key, its error and
// whether it is folded go with it; focus stays with the moved row, and the move is announced. The rows slide to their
// new places (Vue's TransitionGroup move), except under prefers-reduced-motion.
//
// With #summary, an open row has Done (fold it, keeping the edits) and Cancel (put back what it held when it opened,
// then fold it; Escape does the same); Cancel on a row added here and never Done removes it.
import { MOVE_ICONS, MOVES, moved, moveForKey, moveTarget, type Move } from './reorder'
import { restore, snapshot } from './row-snapshot'

const props = withDefaults(
  defineProps<{
    /** One row, singular and lower case: "referral source". */
    itemLabel: string
    /** A new row's starting values. */
    newRow: () => T
    /** A stable key per row (a saved record's id). Undefined for a new row. */
    rowKey?: (row: T) => string | null | undefined
    /** Rows always on screen: rows are added up to it when it mounts, and Remove hides at it. */
    min?: number
    /** Most rows allowed: Add is disabled at it, and says so. */
    max?: number
    /** Errors by row key (rowKey, or the key the #row slot is given), shown under the row. */
    errors?: Record<string, string>
    /** Whether a row may be removed (default: every row, down to `min`). */
    removable?: (row: T) => boolean
    /** The row's heading, and the name its buttons carry; "Referral source 2" unless given. Hidden in `compact`. */
    rowTitle?: (row: T, index: number) => string
    /** One line per row, no heading or card: for rows of a single short field. */
    compact?: boolean
    /** The Add button's words; "Add a(n) <item>", then "Add another <item>", unless given. */
    addLabel?: string
    /** The Remove button's word; its accessible name is this and the row's title: "Remove Part 3". */
    removeLabel?: string
    /** The folded row's Edit button's word; named the same way. */
    editLabel?: string
    /** With #summary, the open row's Done button's word (fold it, keeping the edits); named the same way. */
    doneLabel?: string
    /** With #summary, the open row's Cancel button's word (undo the edits and fold it); named the same way. */
    cancelLabel?: string
    /** Shown beside the disabled Add button at `max`; "That's the most you can add here (12)." unless given. */
    maxLabel?: string
    /** What a screen reader hears when a row is added or removed; "Part 3 added. 3 in the list." unless given. */
    announce?: (change: { type: 'added' | 'removed'; title: string; count: number }) => string
    /** Where focus lands in a row that is added or opened: the first match in the row. */
    focusSelector?: string
    /** Rows can be moved: Up and Down on each row, and Alt+ArrowUp / Alt+ArrowDown (Alt+Home / Alt+End to the ends). */
    reorderable?: boolean
    /** With `reorderable`, Move to top and Move to bottom buttons as well (the keys work without them). */
    moveToEnds?: boolean
    /** A move button's accessible name; "Move Part 3 up", "Move Part 3 to the top" unless given. */
    moveLabel?: (change: { move: Move; title: string }) => string
    /** What a screen reader hears when a row is moved; "Moved Part 3 to position 1 of 5." unless given. */
    announceMove?: (change: { title: string; position: number; count: number }) => string
  }>(),
  {
    rowKey: undefined,
    min: 0,
    max: undefined,
    errors: undefined,
    removable: undefined,
    rowTitle: undefined,
    compact: false,
    addLabel: undefined,
    removeLabel: 'Remove',
    editLabel: 'Edit',
    doneLabel: 'Done',
    cancelLabel: 'Cancel',
    maxLabel: undefined,
    announce: undefined,
    focusSelector: 'input, select, textarea, button[role="radio"]',
    reorderable: false,
    moveToEnds: false,
    moveLabel: undefined,
    announceMove: undefined,
  },
)
const rows = defineModel<T[]>({ required: true })
const slots = defineSlots<{
  row(props: { row: T; index: number; key: string; error?: string; errorId?: string }): unknown
  summary?(props: { row: T; index: number }): unknown
}>()

const uid = useId()
// Rows without a rowKey get one of their own, behind this instance's useId() so it cannot match a caller's key.
const ids = new WeakMap<object, string>()
let counter = 0
function keyOf(row: T): string {
  const k = props.rowKey?.(row)
  if (k) return k
  // By the object a reactive proxy wraps: a new row is seen both as the object newRow() made and as the parent ref's
  // proxy of it.
  const raw = toRaw(row)
  let id = ids.get(raw)
  if (!id) ids.set(raw, (id = `${uid}:new-${++counter}`))
  return id
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const titleOf = (row: T, i: number) => props.rowTitle?.(row, i) ?? `${capital(props.itemLabel)} ${i + 1}`
const errorOf = (row: T) => props.errors?.[keyOf(row)]
// The message's DOM id is numbered per key, never the key itself: a key with a space would read as two ids in
// aria-describedby.
const domIds = new Map<string, number>()
const errorIdOf = (row: T) => {
  if (!errorOf(row)) return undefined
  const k = keyOf(row)
  let n = domIds.get(k)
  if (n === undefined) domIds.set(k, (n = domIds.size + 1))
  return `${uid}-error-${n}`
}

// Folded rows, by key. Only with a #summary to fold them to; a row with an error is always open.
const folded = ref(new Set<string>())
const isFolded = (row: T) => !!slots.summary && folded.value.has(keyOf(row)) && !errorOf(row)
// An error unfolds its row for good: when live validation clears it mid-edit, the row must not fold back and take
// the focused input with it.
watch(
  () => props.errors,
  (errs) => {
    if (!errs) return
    const next = new Set(folded.value)
    let changed = false
    for (const k of Object.keys(errs)) {
      if (!errs[k] || !next.delete(k)) continue
      changed = true
      const row = rows.value.find((r) => keyOf(r) === k)
      if (row) opened(row)
    }
    if (changed) folded.value = next
  },
  { deep: true },
)

const root = ref<HTMLElement | null>(null)
const addButton = ref<{ $el: HTMLElement } | null>(null)
const atMax = computed(() => props.max !== undefined && rows.value.length >= props.max)
const canRemove = (row: T) => rows.value.length > props.min && (props.removable?.(row) ?? true)
const addText = computed(() => props.addLabel ?? `Add ${rows.value.length ? 'another' : /^[aeiou]/i.test(props.itemLabel) ? 'an' : 'a'} ${props.itemLabel}`)
const maxText = computed(() => props.maxLabel ?? `That's the most you can add here (${props.max}).`)

// The polite announcement of a row added or removed. Cleared first and set again in a later task, so the same words
// twice are heard twice (a microtask apart, the browser can coalesce the two); a newer announcement replaces one
// still pending.
const announcement = ref('')
let announceTimer: ReturnType<typeof setTimeout> | undefined
function say(type: 'added' | 'removed', title: string, count: number) {
  speak(props.announce?.({ type, title, count }) ?? `${title} ${type}. ${count} in the list.`)
}
function speak(text: string) {
  announcement.value = ''
  clearTimeout(announceTimer)
  announceTimer = setTimeout(() => { announcement.value = text }, 100)
}
onBeforeUnmount(() => clearTimeout(announceTimer))

// The row to put focus in once it is drawn: the first match for `selector` in it (a folded row's Edit), else its first
// field. With v-model the new row only arrives back through the parent, so this waits for a render that has it rather
// than a fixed tick.
const focusAt = shallowRef<{ index: number; selector?: string } | null>(null)
const rowEl = (i: number) => root.value?.querySelector<HTMLElement>(`:scope > [data-rows] > * > [data-row="${i}"]`) ?? null
watch(
  [focusAt, () => rows.value.length, folded],
  () => {
    const at = focusAt.value
    if (at === null) return
    const row = rowEl(at.index)
    const el = (at.selector && row?.querySelector<HTMLElement>(at.selector)) || row?.querySelector<HTMLElement>(props.focusSelector)
    if (!el) return
    el.focus()
    focusAt.value = null
  },
  { flush: 'post' },
)
function focusRow(i: number, selector?: string) {
  focusAt.value = { index: i, selector }
}

function add() {
  if (atMax.value) return
  const i = rows.value.length
  const row = props.newRow()
  fresh.add(keyOf(row))
  rows.value = [...rows.value, row]
  focusRow(i)
  say('added', titleOf(row, i), i + 1)
}

function remove(i: number) {
  const title = titleOf(rows.value[i]!, i)
  const k = keyOf(rows.value[i]!)
  snapshots.delete(k)
  fresh.delete(k)
  const next = rows.value.filter((_, j) => j !== i)
  rows.value = next
  // Counted from `next`: with v-model, rows.value is the old array until the parent hands the new one back.
  say('removed', title, next.length)
  // The Remove button is gone with its row: focus goes to Add rather than falling to the page.
  nextTick(() => addButton.value?.$el?.focus())
}

function edit(row: T, i: number) {
  const next = new Set(folded.value)
  next.delete(keyOf(row))
  folded.value = next
  opened(row)
  focusRow(i)
}

// Done and Cancel, on an open row of a list with #summary. A row is copied when it opens (Edit, or an error opening
// it), and Cancel puts the copy back into the same object, so it keeps its identity and key. A row added here and not
// yet Done has nothing to go back to: Cancel removes it, where Remove could (not at `min`). Done on a row with an error
// leaves it open, the error showing, with focus in its first field.
const snapshots = shallowReactive(new Map<string, T>())
const fresh = shallowReactive(new Set<string>())
const closable = computed(() => !!slots.summary)
const canCancel = (row: T) => {
  const k = keyOf(row)
  return snapshots.has(k) || (fresh.has(k) && canRemove(row))
}
function opened(row: T) {
  const k = keyOf(row)
  if (!fresh.has(k)) snapshots.set(k, snapshot(row))
}
function fold(row: T, i: number) {
  const next = new Set(folded.value)
  next.add(keyOf(row))
  folded.value = next
  focusRow(i, '[data-edit]')
}
function done(row: T, i: number) {
  if (errorOf(row)) return focusRow(i)
  const k = keyOf(row)
  snapshots.delete(k)
  fresh.delete(k)
  fold(row, i)
}
function cancel(row: T, i: number) {
  const k = keyOf(row)
  const snap = snapshots.get(k)
  if (snap) {
    restore(row, snap)
    snapshots.delete(k)
    fold(row, i)
  } else if (fresh.has(k) && canRemove(row)) {
    remove(i)
  }
}

// Moving. The buttons show only when there is somewhere to move to; a move at an edge is disabled there.
const showMoves = computed(() => props.reorderable && rows.value.length > 1)
const shownMoves = computed(() => (props.moveToEnds ? MOVES : MOVES.filter((m) => m === 'up' || m === 'down')))
const MOVE_WORDS: Record<Move, string> = { up: 'up', down: 'down', top: 'to the top', bottom: 'to the bottom' }
const moveText = (move: Move, row: T, i: number) => {
  const title = titleOf(row, i)
  return props.moveLabel?.({ move, title }) ?? `Move ${title} ${MOVE_WORDS[move]}`
}
const canMove = (move: Move, i: number) => moveTarget(move, i, rows.value.length) !== null

// Focus to put back once the moved row is drawn at its new place: the element that had it (the move button, or a
// field in the row), or, when that is now disabled at the edge, the row's first move button still enabled. Vue moves
// the row's DOM node, which can drop focus, and with v-model the new order only arrives back through the parent.
const refocus = shallowRef<{ key: string; to: number; el: HTMLElement | null } | null>(null)
watch(
  [refocus, () => rows.value],
  () => {
    const r = refocus.value
    if (!r) return
    const at = rows.value[r.to]
    if (!at || keyOf(at) !== r.key) return
    const row = rowEl(r.to)
    if (!row) return
    refocus.value = null
    const el = r.el
    if (el && el.isConnected && row.contains(el) && !(el as HTMLButtonElement).disabled) el.focus()
    else (row.querySelector<HTMLElement>('[data-move]:not(:disabled)') ?? row.querySelector<HTMLElement>(props.focusSelector))?.focus()
  },
  { flush: 'post' },
)

function move(i: number, how: Move, from: HTMLElement | null) {
  const to = moveTarget(how, i, rows.value.length)
  if (to === null) return
  const row = rows.value[i]!
  const title = titleOf(row, i)
  const next = moved(rows.value, i, to)
  rows.value = next
  refocus.value = { key: keyOf(row), to, el: from }
  speak(props.announceMove?.({ title, position: to + 1, count: next.length }) ?? `Moved ${title} to position ${to + 1} of ${next.length}.`)
}

// The keys work on anything focused in the row. A select or a combobox keeps Alt+ArrowDown, which opens its list, and a
// field with its own popup open keeps Escape; a field that handled the key itself (ZNumberInput's step, a menu's
// Escape) and a row of a list nested in this one have already taken it (defaultPrevented).
function onRowKeydown(e: KeyboardEvent, row: T, i: number) {
  if (e.defaultPrevented) return
  const target = e.target as HTMLElement
  if (e.key === 'Escape') {
    if (!closable.value || isFolded(row) || !canCancel(row) || target.closest('[aria-expanded="true"]')) return
    e.preventDefault()
    cancel(row, i)
    return
  }
  if (!props.reorderable) return
  const how = moveForKey(e)
  if (!how) return
  if (target.matches('select, [role="combobox"], [role="listbox"]')) return
  e.preventDefault()
  move(i, how, target)
}

/** Back up to `min` rows, whenever there are fewer (on mount, the list was emptied from outside, or `min` rose). */
function fillToMin() {
  if (rows.value.length < props.min) {
    const added = Array.from({ length: props.min - rows.value.length }, () => props.newRow())
    for (const row of added) fresh.add(keyOf(row))
    rows.value = [...rows.value, ...added]
  }
}
watch([() => rows.value.length, () => props.min], fillToMin)

onMounted(() => {
  if (slots.summary) {
    folded.value = new Set(rows.value.filter((row) => !errorOf(row)).map(keyOf))
    for (const row of rows.value) if (errorOf(row)) opened(row)
  }
  fillToMin()
})
</script>

<template>
  <div ref="root" class="space-y-3" data-testid="repeating-list">
    <!-- Each row in a wrapper of its own, kept while the row folds and opens, so a move slides it (FLIP) and nothing
         else animates: enter and leave are off (:css="false"). Under reduced motion the move class has no transition,
         and Vue skips the slide. -->
    <TransitionGroup
      tag="div"
      class="space-y-3 empty:hidden"
      :css="false"
      move-class="transition-transform duration-200 ease-out motion-reduce:transition-none"
      data-rows
    >
      <div v-for="(row, i) in rows" :key="keyOf(row)">
        <!-- Folded: one line and an Edit button. -->
        <div
          v-if="isFolded(row)"
          :data-row="i"
          data-folded
          class="flex items-center gap-3 rounded-md border border-default bg-muted px-3 py-2"
          @keydown="onRowKeydown($event, row, i)"
        >
          <UIcon name="i-lucide-circle-check" class="size-4 shrink-0 text-success" aria-hidden="true" />
          <span class="min-w-0 flex-1 truncate text-sm text-toned"><slot name="summary" :row="row" :index="i" /></span>
          <span v-if="showMoves" class="inline-flex gap-1" data-moves>
            <UButton
              v-for="m in shownMoves"
              :key="m"
              type="button"
              size="xs"
              variant="ghost"
              color="neutral"
              :icon="MOVE_ICONS[m]"
              :aria-label="moveText(m, row, i)"
              :disabled="!canMove(m, i)"
              :data-move="m"
              @click="move(i, m, $event.currentTarget as HTMLElement)"
            />
          </span>
          <UButton type="button" size="xs" variant="ghost" color="neutral" icon="i-lucide-pencil" :aria-label="`${editLabel} ${titleOf(row, i)}`" data-edit @click="edit(row, i)">
            {{ editLabel }}
          </UButton>
          <UButton
            v-if="canRemove(row)"
            type="button"
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-x"
            :aria-label="`${removeLabel} ${titleOf(row, i)}`"
            @click="remove(i)"
          />
        </div>

        <fieldset
          v-else
          :data-row="i"
          :class="compact ? 'flex items-start gap-2' : 'rounded-md border border-default p-3 sm:p-4'"
          @keydown="onRowKeydown($event, row, i)"
        >
          <legend :class="compact ? 'sr-only' : 'px-1 text-sm font-semibold text-highlighted'">{{ titleOf(row, i) }}</legend>
          <div :class="compact ? 'min-w-0 flex-1' : 'space-y-4'">
            <slot name="row" :row="row" :index="i" :key="keyOf(row)" :error="errorOf(row)" :errorId="errorIdOf(row)" />
            <p v-if="errorOf(row)" :id="errorIdOf(row)" role="alert" class="mt-1 text-sm text-(--ui-color-error-700) dark:text-(--ui-color-error-300)">{{ errorOf(row) }}</p>
          </div>
          <div
            v-if="canRemove(row) || showMoves || closable"
            :class="[compact ? 'pt-1' : 'mt-3 flex justify-end', (showMoves || closable) && (compact ? 'flex gap-1' : 'gap-3')]"
          >
            <span v-if="showMoves" class="inline-flex gap-1" data-moves>
              <UButton
                v-for="m in shownMoves"
                :key="m"
                type="button"
                size="xs"
                variant="ghost"
                color="neutral"
                :icon="MOVE_ICONS[m]"
                :aria-label="moveText(m, row, i)"
                :disabled="!canMove(m, i)"
                :data-move="m"
                @click="move(i, m, $event.currentTarget as HTMLElement)"
              />
            </span>
            <UButton
              v-if="canRemove(row)"
              type="button"
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-lucide-trash-2"
              :aria-label="`${removeLabel} ${titleOf(row, i)}`"
              @click="remove(i)"
            >
              <span v-if="!compact">{{ removeLabel }}</span>
            </UButton>
            <template v-if="closable">
              <UButton
                v-if="canCancel(row)"
                type="button"
                size="xs"
                variant="ghost"
                color="neutral"
                :icon="compact ? 'i-lucide-x' : undefined"
                :aria-label="`${cancelLabel} ${titleOf(row, i)}`"
                data-cancel
                @click="cancel(row, i)"
              >
                <span v-if="!compact">{{ cancelLabel }}</span>
              </UButton>
              <UButton
                type="button"
                size="xs"
                variant="outline"
                color="neutral"
                :icon="compact ? 'i-lucide-check' : undefined"
                :aria-label="`${doneLabel} ${titleOf(row, i)}`"
                data-done
                @click="done(row, i)"
              >
                <span v-if="!compact">{{ doneLabel }}</span>
              </UButton>
            </template>
          </div>
        </fieldset>
      </div>
    </TransitionGroup>

    <div class="flex flex-wrap items-center gap-3">
      <UButton ref="addButton" type="button" variant="outline" color="neutral" icon="i-lucide-plus" :disabled="atMax" data-add @click="add()">
        {{ addText }}
      </UButton>
      <span v-if="atMax" class="text-sm text-muted" data-max>{{ maxText }}</span>
    </div>
    <p class="sr-only" role="status" aria-live="polite" data-announce>{{ announcement }}</p>
  </div>
</template>
