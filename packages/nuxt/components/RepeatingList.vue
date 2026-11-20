<script setup lang="ts" generic="T extends object">
// A repeating-list editor: rows of the same few fields, with "Add another …" under them and Remove on each. The
// rows' fields are the caller's, in the #row slot, so it holds any input; this owns adding, removing, folding,
// per-row errors, focus and announcing the count. Written on Nuxt UI's tokens.
//
//   <ZRepeatingList v-model="rows" item-label="contact" :new-row="() => ({ name: '' })" :row-key="(r) => r.id">
//     <template #row="{ row, index, error, errorId }"> …inputs bound to row… </template>
//     <template #summary="{ row }">{{ row.name }}</template>   <!-- optional: fold rows to one line -->
//   </ZRepeatingList>
//
// Rows are edited in place in #row. With a #summary slot, rows already there when it mounts start folded to that
// line with an Edit button (new rows, and any row with an error, are open); without one every row is open.
// `rowKey` keeps a row's identity while it is renamed (rows that carry history); rows it has no key for are told
// apart by object identity, hence `T extends object`.
//
// With #summary, an open row has Done (fold it, keeping the edits) and Cancel (put back what it held when it opened,
// then fold it; Escape does the same); Cancel on a row added here and never Done removes it.
import { restore, snapshot } from './row-snapshot'

const props = withDefaults(
  defineProps<{
    /** One row, singular and lower case: "contact". */
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
    /** The row's heading, and the name its buttons carry; "Contact 2" unless given. Hidden in `compact`. */
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
  const text = props.announce?.({ type, title, count }) ?? `${title} ${type}. ${count} in the list.`
  announcement.value = ''
  clearTimeout(announceTimer)
  announceTimer = setTimeout(() => { announcement.value = text }, 100)
}
onBeforeUnmount(() => clearTimeout(announceTimer))

// The row to put focus in once it is drawn: the first match for `selector` in it (a folded row's Edit), else its first
// field. With v-model the new row only arrives back through the parent, so this waits for a render that has it rather
// than a fixed tick.
const focusAt = shallowRef<{ index: number; selector?: string } | null>(null)
const rowEl = (i: number) => root.value?.querySelector<HTMLElement>(`:scope > [data-row="${i}"]`) ?? null
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
// yet Done has nothing to go back to: Cancel removes it, where Remove could (not at `min`). Done or Cancel on a row with
// an error leaves it open (Cancel having put its values back), the error showing, with focus in its first field.
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
    // Still in error: open, as Done leaves it, so it cannot fold under the user once the error clears.
    if (errorOf(row)) return focusRow(i)
    snapshots.delete(k)
    fold(row, i)
  } else if (fresh.has(k) && canRemove(row)) {
    remove(i)
  }
}

// Escape anywhere in an open row is Cancel. A field with its own popup open keeps it, and a field that handled it (a
// menu closing) or a row of a list nested in this one has already taken it (defaultPrevented).
function onRowKeydown(e: KeyboardEvent, row: T, i: number) {
  if (e.key !== 'Escape' || e.defaultPrevented) return
  if (!closable.value || isFolded(row) || !canCancel(row) || (e.target as HTMLElement).closest('[aria-expanded="true"]')) return
  e.preventDefault()
  cancel(row, i)
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
    <template v-for="(row, i) in rows" :key="keyOf(row)">
      <!-- Folded: one line and an Edit button. -->
      <div
        v-if="isFolded(row)"
        :data-row="i"
        data-folded
        class="flex items-center gap-3 rounded-md border border-default bg-muted px-3 py-2"
      >
        <UIcon name="i-lucide-circle-check" class="size-4 shrink-0 text-success" aria-hidden="true" />
        <span class="min-w-0 flex-1 truncate text-sm text-toned"><slot name="summary" :row="row" :index="i" /></span>
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
          v-if="canRemove(row) || closable"
          :class="[compact ? 'pt-1' : 'mt-3 flex justify-end', closable && (compact ? 'flex gap-1' : 'gap-3')]"
        >
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
    </template>

    <div class="flex flex-wrap items-center gap-3">
      <UButton ref="addButton" type="button" variant="outline" color="neutral" icon="i-lucide-plus" :disabled="atMax" data-add @click="add()">
        {{ addText }}
      </UButton>
      <span v-if="atMax" class="text-sm text-muted" data-max>{{ maxText }}</span>
    </div>
    <p class="sr-only" role="status" aria-live="polite" data-announce>{{ announcement }}</p>
  </div>
</template>
