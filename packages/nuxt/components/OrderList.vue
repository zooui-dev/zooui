<script setup lang="ts" generic="T">
// An order list: the left half of a master-detail editor. A compact listbox with ONE selected row, and a toolbar
// beside it that adds, removes and moves that row; the selected item's form sits next to it, in the caller's markup.
// Written on Nuxt UI's tokens.
//
//   <ZOrderList v-model="statuses" v-model:selection="selectedId" :row-key="(s) => s.id" item-label="status" allow-remove @add="add" @remove="remove">
//     <template #item="{ item }">{{ item.name }}</template>
//   </ZOrderList>
//
// The list owns the order: a move hands back a new array of the same items through v-model, and `reorder` says what
// moved. `add` asks the caller for a new item. `remove` hands over the one to go: with a listener bound the caller
// takes it out (a server call can come first), and with none the list does. Selection is the selected
// item's key, so it follows the item through a move.
// Selection follows focus: Up/Down select the next row, so the form beside the list follows the keyboard.
import { twMerge } from 'tailwind-merge'
import { moveItem, moveTarget, typeaheadIndex, type OrderMove } from '../utils/order-list'

const props = withDefaults(
  defineProps<{
    /** The item's stable key (a saved record's id): what `v-model:selection` holds. */
    rowKey: (item: T) => string | number
    /** The item's name, for the buttons, the announcements and typeahead; the row's text unless given. */
    rowTitle?: (item: T, index: number) => string
    /** One item, singular and lower case: "status". Names the Add button: "Add status". */
    itemLabel?: string
    /** The heading over the list, and the listbox's name. The #header slot replaces it. */
    title?: string
    /** The listbox's accessible name when there is no title. */
    label?: string
    /** The list's most height before it scrolls, as CSS. Ignored with `fill`. */
    maxHeight?: string
    /** Fill the height it is given (a grid cell, a panel) instead of stopping at `max-height`. */
    fill?: boolean
    /** Classes for its parts, merged over the defaults (tailwind-merge): `root`, `header`, `list` (the bordered box),
     *  `row`, `controls` (the built-in toolbar). */
    ui?: Partial<Record<'root' | 'header' | 'list' | 'row' | 'controls', string>>
    /** Every other row tinted. */
    striped?: boolean
    /** Show the Add button. */
    allowAdd?: boolean
    /** Show the Remove button. */
    allowRemove?: boolean
    /** Whether the selected item may be removed (default: any). Remove is disabled when it may not. */
    removable?: (item: T) => boolean
    /** Ask before Remove goes ahead, in ZConfirmButton's popover. False: Remove acts at once. */
    confirmRemove?: boolean
    /** The question ZConfirmButton asks; "Remove Open?" unless given. */
    removeQuestion?: string
    /** A line under the question saying what happens: "Tasks in this status keep it." */
    removeDescription?: string
    /** The popover's confirming button; the Remove word unless given. */
    removeConfirmLabel?: string
    /** The popover's declining button. */
    removeCancelLabel?: string
    /** The Add button's name; "Add <item-label>" unless given. */
    addLabel?: string
    /** The Remove button's word; its name is this and the selected item's title: "Remove Open". */
    removeLabel?: string
    /** A move button's name; "Move Open to top", "Move Open up" … unless given. */
    moveLabel?: (move: OrderMove, title: string | undefined) => string
    /** The toolbar's accessible name. */
    controlsLabel?: string
    /** Shown in the box when the list is empty. The #empty slot replaces it. */
    emptyLabel?: string
    /** What a screen reader hears after a move or a remove; "Moved Open to position 3 of 5." unless given. */
    announce?: (change: { type: 'moved' | 'removed'; title: string; position: number; count: number }) => string
  }>(),
  {
    rowTitle: undefined,
    itemLabel: undefined,
    title: undefined,
    label: undefined,
    maxHeight: '15rem',
    fill: false,
    ui: undefined,
    striped: false,
    allowAdd: true,
    allowRemove: false,
    removable: undefined,
    confirmRemove: true,
    removeQuestion: undefined,
    removeDescription: undefined,
    removeConfirmLabel: undefined,
    removeCancelLabel: 'Cancel',
    addLabel: undefined,
    removeLabel: 'Remove',
    moveLabel: undefined,
    controlsLabel: 'List actions',
    emptyLabel: 'Nothing here yet.',
    announce: undefined,
  },
)
const items = defineModel<T[]>({ required: true })
const selection = defineModel<string | number | null>('selection', { default: null })
const emit = defineEmits<{
  /** Add was pressed: create the item, put it in the list and select it. */
  add: []
  /** Remove was pressed (and confirmed). Bound, the caller takes the item out; unbound, the list does. */
  remove: [item: T, index: number]
  /** A move changed the order; v-model has the new array. */
  reorder: [change: { item: T; from: number; to: number }]
}>()

/** What the #controls slot gets, for a toolbar of the caller's own. */
interface Controls {
  /** The selected item, or null. */
  selected: T | null
  /** Its index, or -1. */
  index: number
  add: () => void
  remove: () => void
  move: (move: OrderMove) => void
  moveTop: () => void
  moveUp: () => void
  moveDown: () => void
  moveBottom: () => void
  /** Whether the selected row has somewhere to go. */
  canMove: (move: OrderMove) => boolean
  /** Whether the selected row may be removed. */
  canRemove: boolean
}
const slots = defineSlots<{
  /** One row. */
  item?(props: { item: T; index: number; selected: boolean }): unknown
  /** The heading over the list, in place of `title`. */
  header?(): unknown
  /** The empty list, in place of `empty-label`. */
  empty?(): unknown
  /** The toolbar, in place of the built-in buttons. */
  controls?(props: Controls): unknown
}>()

const uid = useId()
const keyOf = (item: T) => props.rowKey(item)
// A row's DOM id is numbered per key, never the key itself: a key with a space would not be one id.
const domIds = new Map<string | number, number>()
function rowId(item: T) {
  const k = keyOf(item)
  let n = domIds.get(k)
  if (n === undefined) domIds.set(k, (n = domIds.size + 1))
  return `${uid}-row-${n}`
}

/** The selected row; -1 when nothing is selected, or the key is not in the list. */
const selectedIndex = computed(() => (selection.value == null ? -1 : items.value.findIndex((item) => keyOf(item) === selection.value)))
const selectedItem = computed(() => (selectedIndex.value < 0 ? null : items.value[selectedIndex.value]!))

const root = ref<HTMLElement | null>(null)
const scroller = ref<HTMLElement | null>(null)
const listbox = () => scroller.value?.querySelector<HTMLElement>('[role="listbox"]') ?? null
// By the row's own id, never its place: a removed row stays in the DOM one frame, with its old data-row, while it leaves.
const rowEl = (i: number) => {
  const item = items.value[i]
  return item === undefined ? null : scroller.value?.querySelector<HTMLElement>(`[id="${rowId(item)}"]`) ?? null
}

// Without rowTitle, a row's title is its text as drawn, read after each render (read during one, it would be the
// text before the edit that caused it).
const rowTexts = ref(new Map<string, string>())
function readRowTexts() {
  if (props.rowTitle) return
  const texts = new Map([...(scroller.value?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])].map((el) => [el.id, el.textContent?.trim() ?? '']))
  const now = rowTexts.value
  if (texts.size !== now.size || [...texts].some(([id, t]) => now.get(id) !== t)) rowTexts.value = texts
}
onMounted(readRowTexts)
onUpdated(readRowTexts)
const titleOf = (i: number) => {
  const item = items.value[i]
  if (item === undefined) return ''
  return props.rowTitle?.(item, i) ?? rowTexts.value.get(rowId(item)) ?? ''
}
const selectedTitle = computed(() => (selectedIndex.value < 0 ? undefined : titleOf(selectedIndex.value)))

const MOVE_WORDS: Record<OrderMove, string> = { top: 'to top', up: 'up', down: 'down', bottom: 'to bottom' }
const moveText = (m: OrderMove) => props.moveLabel?.(m, selectedTitle.value) ?? ['Move', selectedTitle.value, MOVE_WORDS[m]].filter(Boolean).join(' ')
const addText = computed(() => props.addLabel ?? (props.itemLabel ? `Add ${props.itemLabel}` : 'Add'))
const removeText = computed(() => [props.removeLabel, selectedTitle.value].filter(Boolean).join(' '))

const canMove = (m: OrderMove) => moveTarget(selectedIndex.value, items.value.length, m) !== null
const canRemove = computed(() => !!selectedItem.value && (props.removable?.(selectedItem.value) ?? true))

// The polite announcement of a move or a remove. Cleared first and set again in a later task, so the same words twice
// are heard twice; a newer announcement replaces one still pending.
const announcement = ref('')
let announceTimer: ReturnType<typeof setTimeout> | undefined
function say(type: 'moved' | 'removed', title: string, position: number, count: number) {
  const text = props.announce?.({ type, title, position, count })
    ?? (type === 'moved' ? `Moved ${title} to position ${position} of ${count}.` : `Removed ${title}. ${count} in the list.`)
  announcement.value = ''
  clearTimeout(announceTimer)
  announceTimer = setTimeout(() => { announcement.value = text }, 100)
}

function select(i: number) {
  const item = items.value[i]
  if (item !== undefined) selection.value = keyOf(item)
}

/** The selected row into view in the list's own scroll box, by its layout offset: during a move the row is drawn
 *  where it was (the transition's transform), and its bounding box would scroll to the wrong place. */
function scrollToRow(i: number) {
  const box = scroller.value
  const row = rowEl(i)
  if (!box || !row) return
  const pad = 4
  const top = row.offsetTop
  const bottom = top + row.offsetHeight
  if (top - pad < box.scrollTop) box.scrollTop = top - pad
  else if (bottom + pad > box.scrollTop + box.clientHeight) box.scrollTop = bottom + pad - box.clientHeight
}
watch(selectedIndex, (i) => { if (i >= 0) scrollToRow(i) }, { flush: 'post' })
onMounted(() => { if (selectedIndex.value >= 0) scrollToRow(selectedIndex.value) })

/** Focus on the toolbar button that was clicked, or back on the list when it is gone or disabled (Move to top, at the
 *  top). The button is named rather than read from document.activeElement: Safari does not focus a button on click.
 *  Never scrolls: focusing the list would scroll the page to it, and the row is brought into view by scrollToRow. */
function keepFocus(control?: HTMLButtonElement | null) {
  nextTick(() => {
    if (control?.isConnected && !control.disabled) return control.focus({ preventScroll: true })
    const active = document.activeElement as HTMLButtonElement | null
    if (!active || active === document.body || !root.value?.contains(active) || active.disabled) listbox()?.focus({ preventScroll: true })
  })
}

function move(m: OrderMove, control?: HTMLButtonElement | null) {
  const from = selectedIndex.value
  const to = moveTarget(from, items.value.length, m)
  if (to === null) return
  const item = items.value[from]!
  const title = titleOf(from)
  const next = moveItem(items.value, from, to)
  items.value = next
  // The moved item stays selected (its key, not its old place).
  selection.value = keyOf(next[to]!)
  emit('reorder', { item, from, to })
  say('moved', title, to + 1, next.length)
  keepFocus(control)
}

function add() {
  emit('add')
}

// A remove the list asked for, until the item has left the list: the caller may call a server first.
let pendingRemove: { key: string | number; index: number; title: string } | null = null
const instance = getCurrentInstance()
/** Whether the caller listens to `remove` (and so takes the item out itself). */
const removeHandled = () => !!instance?.vnode.props?.onRemove
function remove() {
  const i = selectedIndex.value
  const item = selectedItem.value
  if (!item || !canRemove.value) return
  pendingRemove = { key: keyOf(item), index: i, title: titleOf(i) }
  emit('remove', item, i)
  if (!removeHandled()) items.value = items.value.filter((_, j) => j !== i)
}
// When it has gone, the row that took its place is selected, and focus stays in the list.
watch(
  () => items.value.map(keyOf),
  (keys) => {
    if (!pendingRemove || keys.includes(pendingRemove.key)) return
    const { index, title } = pendingRemove
    pendingRemove = null
    if (keys.length) select(Math.min(index, keys.length - 1))
    else selection.value = null
    say('removed', title, 0, keys.length)
    keepFocus()
  },
)
// A remove the caller decided against (a failed server call) is forgotten at the next selection change, so a later
// reload doesn't announce it or move the selection. Not when the item went in the same tick (a caller clearing the
// selection as it removes): the watcher above, which runs first, then selects the row that took its place.
watch(selection, () => {
  if (pendingRemove && items.value.some((item) => keyOf(item) === pendingRemove!.key)) pendingRemove = null
})

// ZConfirmButton's words. Focus goes back to Remove when it is cancelled (ZConfirmButton's own), and to the list
// once the confirmed item has gone (keepFocus, above).
const removeQuestionText = computed(() => props.removeQuestion ?? `${removeText.value}?`)
const removeConfirmText = computed(() => props.removeConfirmLabel ?? props.removeLabel)

// Keyboard focus, for the ring: shown when the list was reached or driven by the keyboard, not after a click.
const focused = ref(false)
const keyboard = ref(false)
let pointing = false
function onFocus() {
  focused.value = true
  keyboard.value = !pointing
  pointing = false
}
function onPointerdown() {
  pointing = true
  keyboard.value = false
}
// What the rows draw from: a focus move that leaves the ring as it was (the list blurring as a clicked toolbar button
// takes focus) must not re-render them, or TransitionGroup cancels the slide it has just started.
const ring = computed(() => focused.value && keyboard.value)

let query = ''
let queryTimer: ReturnType<typeof setTimeout> | undefined
function typeahead(key: string) {
  query += key
  clearTimeout(queryTimer)
  queryTimer = setTimeout(() => { query = '' }, 500)
  const i = typeaheadIndex(items.value.map((_, j) => titleOf(j)), query, selectedIndex.value)
  if (i >= 0) select(i)
}

const ALT_MOVES: Record<string, OrderMove> = { ArrowUp: 'up', ArrowDown: 'down', Home: 'top', End: 'bottom' }
function onKeydown(e: KeyboardEvent) {
  keyboard.value = true
  const n = items.value.length
  if (!n) return
  const i = selectedIndex.value
  if (e.altKey && !e.ctrlKey && !e.metaKey) {
    const m = ALT_MOVES[e.key]
    if (!m) return
    e.preventDefault()
    move(m)
    return
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return
  let to: number
  // With nothing selected, Down and Up both start at the first row, and Enter and Space do nothing (selection
  // follows focus, so on a selected row they keep it).
  switch (e.key) {
    case 'ArrowDown': to = i < 0 ? 0 : Math.min(i + 1, n - 1); break
    case 'ArrowUp': to = i < 0 ? 0 : Math.max(i - 1, 0); break
    case 'Home': to = 0; break
    case 'End': to = n - 1; break
    case 'Enter':
      e.preventDefault()
      return
    case ' ':
      e.preventDefault()
      // Part of a name while one is being typed.
      if (query) typeahead(' ')
      return
    default:
      if (e.key.length === 1) { e.preventDefault(); typeahead(e.key) }
      return
  }
  e.preventDefault()
  select(to)
}

onBeforeUnmount(() => { clearTimeout(announceTimer); clearTimeout(queryTimer) })

const controls = computed<Controls>(() => ({
  selected: selectedItem.value,
  index: selectedIndex.value,
  add,
  remove,
  move,
  moveTop: () => move('top'),
  moveUp: () => move('up'),
  moveDown: () => move('down'),
  moveBottom: () => move('bottom'),
  canMove,
  canRemove: canRemove.value,
}))

const MOVES: { move: OrderMove; icon: string }[] = [
  { move: 'top', icon: 'i-lucide-arrow-up-to-line' },
  { move: 'up', icon: 'i-lucide-chevron-up' },
  { move: 'down', icon: 'i-lucide-chevron-down' },
  { move: 'bottom', icon: 'i-lucide-arrow-down-to-line' },
]

const headerId = `${uid}-header`
const hasHeader = computed(() => !!props.title || !!slots.header)

function rowClass(i: number, selected: boolean) {
  return twMerge(
    'cursor-pointer select-none rounded px-2.5 py-1.5 text-sm',
    selected ? 'bg-primary/10 text-highlighted hover:bg-primary/15' : ['text-default hover:bg-elevated', props.striped && i % 2 === 1 && 'bg-elevated/50'],
    selected && ring.value && 'ring-2 ring-inset ring-primary',
    props.ui?.row,
  )
}

// With `fill` the root, the list column (a flex column) and the box take the height they are given; the box grows to
// what the header leaves, rather than h-full, which would overflow by the header's height.
const rootClass = computed(() => twMerge('flex flex-col gap-3 sm:flex-row', props.fill && 'h-full', props.ui?.root))
const columnClass = computed(() => twMerge('min-w-0 flex-auto', props.fill && 'flex min-h-0 flex-col'))
const headerClass = computed(() => twMerge('px-2.5 py-1.5 text-sm font-medium text-muted', props.ui?.header))
const listClass = computed(() => twMerge(
  'relative overflow-y-auto rounded-md bg-default p-1 ring ring-default',
  ring.value && selectedIndex.value < 0 && 'ring-2 ring-primary',
  props.fill && 'min-h-0 flex-1',
  props.ui?.list,
))
const controlsClass = computed(() => twMerge('flex flex-row items-start gap-1 sm:flex-col sm:items-stretch', props.ui?.controls))

defineExpose({
  /** Focus the list. */
  focus: () => listbox()?.focus(),
  move,
  remove,
})
</script>

<template>
  <div ref="root" :class="rootClass" data-testid="order-list">
    <div role="group" :aria-label="controlsLabel" data-controls>
      <slot name="controls" v-bind="controls">
        <div :class="controlsClass">
          <UButton v-if="allowAdd" type="button" size="xs" color="primary" variant="soft" square icon="i-lucide-plus" :aria-label="addText" data-add @click="add()" />
          <template v-if="allowRemove">
            <ZConfirmButton
              v-if="confirmRemove"
              :question="removeQuestionText"
              :description="removeDescription"
              :confirm-label="removeConfirmText"
              :cancel-label="removeCancelLabel"
              type="button"
              size="xs"
              color="error"
              variant="soft"
              square
              icon="i-lucide-trash-2"
              :aria-label="removeText"
              :disabled="!canRemove"
              data-remove
              @confirm="remove()"
            />
            <UButton v-else type="button" size="xs" color="error" variant="soft" square icon="i-lucide-trash-2" :aria-label="removeText" :disabled="!canRemove" data-remove @click="remove()" />
          </template>
          <!-- A gap between the actions and the moves. -->
          <div v-if="allowAdd || allowRemove" class="w-2 sm:h-2 sm:w-0" aria-hidden="true" />
          <UButton
            v-for="b in MOVES"
            :key="b.move"
            type="button"
            size="xs"
            color="neutral"
            variant="soft"
            square
            :icon="b.icon"
            :aria-label="moveText(b.move)"
            :disabled="!canMove(b.move)"
            :data-move="b.move"
            @click="(e: MouseEvent) => move(b.move, e.currentTarget as HTMLButtonElement | null)"
          />
        </div>
      </slot>
    </div>

    <div :class="columnClass">
      <div v-if="hasHeader" :id="headerId" :class="headerClass" data-header>
        <slot name="header">{{ title }}</slot>
      </div>
      <div
        ref="scroller"
        :class="listClass"
        :style="fill ? undefined : { maxHeight }"
        data-scroller
      >
        <TransitionGroup
          tag="ul"
          role="listbox"
          tabindex="0"
          class="outline-none"
          move-class="transition-transform duration-180 ease-out motion-reduce:transition-none"
          :aria-labelledby="hasHeader ? headerId : undefined"
          :aria-label="hasHeader ? undefined : label"
          :aria-activedescendant="selectedItem !== null ? rowId(selectedItem) : undefined"
          @focus="onFocus"
          @blur="focused = false"
          @pointerdown="onPointerdown"
          @keydown="onKeydown"
        >
          <li
            v-for="(item, i) in items"
            :id="rowId(item)"
            :key="keyOf(item)"
            role="option"
            :aria-selected="i === selectedIndex"
            :data-row="i"
            :data-selected="i === selectedIndex ? '' : undefined"
            :class="rowClass(i, i === selectedIndex)"
            @click="select(i)"
          >
            <slot name="item" :item="item" :index="i" :selected="i === selectedIndex">{{ rowTitle?.(item, i) ?? item }}</slot>
          </li>
        </TransitionGroup>
        <p v-if="!items.length" class="px-2.5 py-1.5 text-sm text-muted" data-empty>
          <slot name="empty">{{ emptyLabel }}</slot>
        </p>
      </div>
    </div>
    <p class="sr-only" role="status" aria-live="polite" data-announce>{{ announcement }}</p>
  </div>
</template>
