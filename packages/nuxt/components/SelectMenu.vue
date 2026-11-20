<script setup lang="ts" generic="T extends SelectMenuItem, V = unknown">
// Nuxt UI's USelectMenu with the keyboard a data-entry form wants. Every USelectMenu prop, slot, event and v-model
// passes through unchanged; this adds four switches, each driving USelectMenu (and reka-ui under it) only through its
// public surface: its props, the trigger, the menu's DOM and the keys reka-ui already handles.
//
//   <ZSelectMenu v-model="fruit" :items="fruits" />                      <!-- type "ch" on the closed menu: Cherry -->
//   <ZSelectMenu v-model="state" :items="states" value-key="code" open-on-focus />
//
// - highlightSelectedOnOpen: reka-ui already highlights the checked item when the menu opens (the first checked one
//   with `multiple`), so arrow keys go on from it; that is kept. Off, the menu opens on the first item instead.
// - typeahead: printable keys on the closed trigger pick the first item from the top of the list whose label starts
//   with what was typed (one letter pressed again and again cycles through the items that start with it), tell a
//   surrounding UForm, and announce it in a polite live region beside the trigger (whose accessible name is its
//   label, not its value). With `multiple` it never replaces the selection: it opens the menu on the match instead.
// - openOnFocus: keyboard focus opens the menu (not a click, which opens it anyway, and not focus coming back from it).
// - closeOnTab: Tab and Shift+Tab close the open menu and move on to the next or previous field. reka-ui otherwise
//   keeps focus looping inside the menu. A single-select menu commits the highlighted item first, as Enter would, once
//   the person has moved the highlight in this opening (arrow keys, typing in the search or the list, a hover): type
//   or arrow to an item, Tab to take it. An untouched menu leaves the value as it was, and so does `multiple` (Tab
//   there would add or remove an item just by leaving the field; Enter and a click toggle it).
//
// The trigger shows its focus ring on any focus, a click's included (stock shows it on keyboard focus only): while it
// has focus, the menu is drawn with USelectMenu's `highlight` and a 2px ring.
import type { SelectMenuItem, SelectMenuProps } from '@nuxt/ui'
import { formFieldInjectionKey, useFormField } from '@nuxt/ui/composables'
import { itemLabel, itemValue, selectableItems, typeaheadMatch, type TypeaheadKeys } from './select-typeahead.ts'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** USelectMenu's items: a list, or a list of groups. */
    items?: T[] | T[][]
    /** USelectMenu's `labelKey`, read here for typeahead. */
    labelKey?: string
    /** USelectMenu's `valueKey`, read here for typeahead. */
    valueKey?: string
    /** USelectMenu's `multiple`. */
    multiple?: boolean
    /** USelectMenu's `searchInput` (on unless `false`). */
    searchInput?: boolean | Record<string, unknown>
    /** Open on the selected item, so arrow keys go on from it; off, on the first item. */
    highlightSelectedOnOpen?: boolean
    /** Typing on the closed menu picks the first item that starts with what was typed. */
    typeahead?: boolean
    /** Keyboard focus opens the menu: for data entry, where every field is filled in turn. */
    openOnFocus?: boolean
    /** Tab closes the open menu and moves on, taking the highlighted item in a single-select menu once the highlight has moved. */
    closeOnTab?: boolean
  }>(),
  {
    items: undefined,
    labelKey: undefined,
    valueKey: undefined,
    multiple: undefined,
    searchInput: undefined,
    highlightSelectedOnOpen: true,
    typeahead: true,
    openOnFocus: false,
    closeOnTab: true,
  },
)
// The caller's model type. USelectMenu works its own out from items, value-key and multiple, which this wrapper's
// generics don't reproduce, so the model crosses to it untyped (`as never` in the template) and comes back as V.
const [model, modelModifiers] = defineModel<V>()
const emit = defineEmits<{ change: [event: Event] }>()
const attrs = useAttrs()
const slots = useSlots()

// useFormField() clears the form field it hands its own component, for the input inside it; here that input is the
// wrapped USelectMenu, which needs the field (its id, name, aria and error color), so it is handed on again.
const formField = inject(formFieldInjectionKey, undefined)
const { emitFormChange, emitFormInput } = useFormField()
provide(formFieldInjectionKey, formField)

const menu = useTemplateRef<{ triggerRef: HTMLElement | null; viewportRef: HTMLElement | null }>('menu')
const trigger = () => menu.value?.triggerRef ?? null
const content = () => menu.value?.viewportRef?.closest<HTMLElement>('[data-slot="content"]') ?? null

const keys = computed<TypeaheadKeys>(() => ({
  labelKey: props.labelKey,
  valueKey: props.valueKey,
  by: attrs.by as TypeaheadKeys['by'],
}))
const hasSearch = computed(() => props.searchInput !== false)

const isOpen = ref(false)
let closedAt = 0
/** A letter typed on the closed `multiple` menu, handed to the menu once it is open. */
let pendingKey = ''
/** Whether the person has moved the highlight since the menu opened (arrow keys, typing, a hover): only then does
 *  Tab take the highlighted item. Untouched, the highlight is only where the menu opened (the selected item, or the first
 *  one when nothing is selected), and Tabbing past the field must not fill it in. */
let touched = false

function onOpen(value: boolean) {
  if (value === isOpen.value) return
  isOpen.value = value
  if (value) {
    touched = false
    document.addEventListener('keydown', onDocumentKeydown, true)
    document.addEventListener('input', onDocumentInput, true)
    document.addEventListener('pointermove', onDocumentPointermove, true)
    void afterOpen()
  } else {
    closedAt = performance.now()
    pendingKey = ''
    removeDocumentListeners()
  }
}
function removeDocumentListeners() {
  document.removeEventListener('keydown', onDocumentKeydown, true)
  document.removeEventListener('input', onDocumentInput, true)
  document.removeEventListener('pointermove', onDocumentPointermove, true)
}
onBeforeUnmount(removeDocumentListeners)
// A menu opened (or closed) from code through v-model:open emits no update:open; `open` passes through $attrs, and
// a change to it re-renders this wrapper, so it is caught here.
function followOpenAttr() {
  const open = attrs.open
  if (typeof open === 'boolean' && open !== isOpen.value) onOpen(open)
}
onMounted(followOpenAttr)
onBeforeUpdate(followOpenAttr)

const NAVIGATION = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp'])
const inMenu = (e: Event) => e.isTrusted && e.target instanceof Node && !!content()?.contains(e.target)
function onDocumentInput(e: Event) {
  if (inMenu(e)) touched = true
}
// A hover moves the highlight: reka-ui highlights the item a pointer moves over, so a move over one it hasn't
// highlighted yet is the person moving it.
function onDocumentPointermove(e: PointerEvent) {
  if (!inMenu(e)) return
  const option = (e.target as Element).closest?.('[role="option"]')
  if (option && !option.hasAttribute('data-highlighted')) touched = true
}

/** Resolves to what `find` returns once it returns something, or null after about ten frames. */
function waitFor<R>(find: () => R | null | undefined, frames = 10): Promise<R | null> {
  return new Promise((done) => {
    const step = (left: number) => {
      const found = find()
      if (found) done(found)
      else if (left <= 0) done(null)
      else requestAnimationFrame(() => step(left - 1))
    }
    step(frames)
  })
}

/** A key, sent where reka-ui listens for it: the search input, or the item that has focus. */
function press(key: string) {
  const target = document.activeElement
  if (!target || !content()?.contains(target)) return
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

async function afterOpen() {
  // reka-ui highlights the checked item a couple of ticks after opening; act once it has.
  const viewport = await waitFor(() => (isOpen.value ? menu.value?.viewportRef : null))
  if (!viewport || !(await waitFor(() => viewport.querySelector('[data-highlighted]')))) return
  if (!props.highlightSelectedOnOpen) press('Home')
  const key = pendingKey
  pendingKey = ''
  if (!key) return
  const input = hasSearch.value ? document.activeElement : null
  if (input instanceof HTMLInputElement && content()?.contains(input)) {
    // Into the search, as if typed there: it filters and highlights the first match, and typing carries on in it.
    input.value = key
    input.dispatchEvent(new Event('input', { bubbles: true }))
  } else {
    press(key) // reka-ui's own typeahead, in the open list
  }
}

function openMenu() {
  if (!isOpen.value) trigger()?.click()
}

// ── Typeahead, on the closed trigger ───────────────────────────────────────────────────────────────────────────
let search = ''
let searchTimer: ReturnType<typeof setTimeout> | undefined
const announced = ref('')
onBeforeUnmount(() => clearTimeout(searchTimer))

function onTriggerKeydown(e: KeyboardEvent) {
  if (!props.typeahead || isOpen.value || e.defaultPrevented || e.isComposing) return
  if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return
  // Space opens the menu, unless it is part of a search under way ("new y").
  if (e.key === ' ' && !search) return
  e.preventDefault()
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => (search = ''), 1000)
  search += e.key

  if (props.multiple) {
    pendingKey = e.key
    openMenu()
    return
  }
  const match = typeaheadMatch(selectableItems(props.items), search, model.value, keys.value)
  if (match === undefined) return
  model.value = withModifiers(itemValue(match, keys.value)) as V
  emit('change', new Event('change'))
  emitFormChange()
  emitFormInput()
  // The trigger's accessible name is its label, not its value, so a pick made with the menu closed is announced.
  announced.value = itemLabel(match, keys.value)
}

/** A value as USelectMenu's own update applies `v-model`'s modifiers to it. */
function withModifiers(value: unknown): unknown {
  const m = (modelModifiers ?? {}) as Record<string, boolean | undefined>
  if (m.trim && (typeof value === 'string' || value == null)) value = (value as string | null | undefined)?.trim() ?? null
  if (m.number) {
    const n = Number.parseFloat(value as string)
    if (!Number.isNaN(n)) value = n
  }
  if (m.nullable) value ??= null
  if (m.optional && !m.nullable && value !== null) value ??= undefined
  return value
}

// ── Focus ring on any focus ────────────────────────────────────────────────────────────────────────────────────
const focused = ref(false)
// While the trigger has focus: USelectMenu's highlight, with its ring widened to 2px (Buoy's ring; stock's keyboard ring is 1px).
const focusRing = computed(() => {
  if (!focused.value) return {}
  const ui = (attrs.ui ?? {}) as NonNullable<SelectMenuProps['ui']>
  const base = ui.base
  // A `ui.base` may be classes to merge or a function that replaces the defaults; the ring goes on after either.
  const ringed: typeof base = typeof base === 'function' ? (defaults: string) => [base(defaults), 'ring-2'] : [base, 'ring-2']
  return { highlight: true, ui: { ...ui, base: ringed } }
})

function onTriggerFocusout(e: FocusEvent) {
  if (!(e.currentTarget as Node).contains(e.relatedTarget as Node | null)) focused.value = false
}

// ── Open on focus ──────────────────────────────────────────────────────────────────────────────────────────────
let movingFocus = false

function onTriggerFocusin(e: FocusEvent) {
  focused.value = true
  // Every way back into the menu starts here, so a menu left inert by Tab is usable again (it may be reopened while
  // it is still animating closed, as the same element).
  if (left) left.inert = false
  left = null
  if (!props.openOnFocus || isOpen.value || movingFocus) return
  const el = e.currentTarget as HTMLElement
  // A click focuses the trigger and opens the menu itself; opening here too would close it again.
  if (!el.matches(':focus-visible')) return
  // Focus coming back from the menu as it closes (Escape, a pick) is not arriving at the field.
  const from = e.relatedTarget as Node | null
  if (from ? content()?.contains(from) : performance.now() - closedAt < 400) return
  openMenu()
}

// ── Close on Tab ───────────────────────────────────────────────────────────────────────────────────────────────
/** The menu Tab closed, inert while it animates closed. */
let left: HTMLElement | null = null

function onDocumentKeydown(e: KeyboardEvent) {
  // Arrow keys, and a letter in a list without a search input (reka-ui's own typeahead moves the highlight).
  if ((NAVIGATION.has(e.key) || (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey)) && inMenu(e)) touched = true
  if (e.key !== 'Tab' || !props.closeOnTab || !isOpen.value || e.ctrlKey || e.metaKey || e.altKey) return
  const el = trigger()
  const menuEl = content()
  const target = e.target as Node | null
  if (!el || !menuEl || !target || !menuEl.contains(target)) return
  // reka-ui's focus scope loops Tab inside the menu only while focus is on its last (or first) item; by the time the
  // key reaches it, focus is on the trigger below, so it lets the key be.
  if (touched && !props.multiple) press('Enter') // the highlighted item, as Enter takes it
  // Focus leaving the menu for its trigger closes it (the spec checks it, on the page's last field too). Not a click
  // on the trigger: `isOpen` hears of a close a tick late, so a click after Enter's close could open it again.
  movingFocus = true
  el.focus()
  movingFocus = false
  // The search input's UInput `autofocus` focuses it on a timer after it mounts; a Tab that comes inside that window
  // would have focus pulled back into the closing menu. Inert, nothing in it can take focus, Tab's included.
  menuEl.inert = true
  left = menuEl
  // No preventDefault: the browser's own Tab now moves on from the trigger, to the next field or (Shift) the last.
}

defineExpose({
  /** The trigger button. */
  triggerRef: computed(() => menu.value?.triggerRef ?? null),
  /** The open menu's list of items. */
  viewportRef: computed(() => menu.value?.viewportRef ?? null),
})
</script>

<template>
  <USelectMenu
    ref="menu"
    v-bind="{ ...$attrs, ...focusRing }"
    :model-value="model as never"
    :model-modifiers="modelModifiers"
    :items="props.items"
    :label-key="props.labelKey"
    :value-key="props.valueKey"
    :multiple="props.multiple"
    :search-input="props.searchInput"
    @update:model-value="(v: unknown) => (model = v as V)"
    @change="(e: Event) => emit('change', e)"
    @update:open="onOpen"
    @keydown="onTriggerKeydown"
    @focusin="onTriggerFocusin"
    @focusout="onTriggerFocusout"
  >
    <template v-for="(_, name) in slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
  </USelectMenu>
  <span class="sr-only" aria-live="polite" data-select-menu-announce>{{ announced }}</span>
</template>
