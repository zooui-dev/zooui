<script setup lang="ts" generic="V">
// The field under ZDateField, ZMonthField and ZYearField: a text box with a calendar button, a clear button and a popover,
// which reads typed text through an EntryEngine (entry-field.ts) and holds the value the engine reads. Internal: it is
// not registered as a Z* component (nuxt.config.ts ignores components/internal), and each field wraps it, turning the
// caller's type into V and back and putting its own UCalendar in the `calendar` slot.
//
// What it does is ZDateField's, documented there (DateField.vue, docs/date-field.md): typed text commits on Enter, Tab or
// leaving; text that names nothing clears the field; untouched text keeps the value; a value the limits refuse is kept
// out, the box redrawn, and the field marked invalid (aria-invalid, the error color, a message for screen readers, and
// inside a UFormField its error) until the next edit; a shortcut steps from the committed value; `dateUpdate` fires once
// per settle, with the value just settled.
import { formFieldInjectionKey } from '@nuxt/ui/composables'
import { useToday } from '../../composables/useToday'
import type { EntryEngine, EntryProblem, InputSlotUi } from './entry-field'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue: V | null
    engine: EntryEngine<V>
    clearable?: boolean
    disabled?: boolean
    placeholder?: string
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    icon?: string
    calendarIcon: string
    highlight?: boolean
    ui?: { root?: string, base?: string, trailing?: string, leading?: string, leadingIcon?: string }
    portal?: boolean | string
    clearLabel: string
    chooseLabel: string
  }>(),
  { portal: true },
)
const emit = defineEmits<{
  'update:modelValue': [value: V | null]
  'dateUpdate': [value: V | null]
  'invalid': [problem: (EntryProblem<V> & { message: string }) | null]
  'clear': []
  'iconClick': [event: MouseEvent]
}>()
defineSlots<{
  leading?(props: { ui: InputSlotUi }): unknown
  /** The picker: `value` the selection (following text typed but not yet committed), `view` the period to show,
   *  `pick` to settle on a value. */
  calendar(props: { value: V | null, view: V, pick: (value: V) => void }): unknown
}>()

const eng = () => props.engine
const show = (v: V | null) => eng().show(v)
const same = (a: V | null, b: V | null) => eng().same(a, b)

const open = ref(false)
const text = ref(show(props.modelValue))

// ── Invalid ───────────────────────────────────────────────────────────────────────────────────────────────────
// Shallow: a ref would unwrap V's own type.
const problem = shallowRef<EntryProblem<V> | null>(null)
const problemMessage = computed(() => (problem.value ? eng().message(problem.value) : ''))
function flag(p: EntryProblem<V> | null) {
  if (!p && !problem.value) return
  problem.value = p
  emit('invalid', p && { reason: p.reason, date: p.date, limit: p.limit, message: problemMessage.value })
}
// In a UFormField, Nuxt UI's UInput takes aria-invalid, its error color and aria-describedby from the field, over
// anything passed to it: so while a value is refused the field the UInput sees carries the message as its error (unless
// it has one of its own, which the product may have set from `invalid`), and the message below takes the id that
// aria-describedby names. Outside one, they are passed to the UInput directly.
const formField = inject(formFieldInjectionKey, undefined)
if (formField) {
  provide(formFieldInjectionKey, computed(() => {
    const f = formField.value
    return problem.value && f && !f.error ? { ...f, error: problemMessage.value } : f
  }))
}
const panelId = useId()
const messageId = computed(() => {
  if (!problem.value) return undefined
  if (!formField?.value) return `${panelId}-invalid`
  return formField.value.error ? undefined : `${formField.value.ariaId}-error`
})
const attrs = useAttrs()
const invalidAttrs = computed(() => {
  if (!problem.value || formField?.value) return {}
  const describedBy = [attrs['aria-describedby'], messageId.value].filter(Boolean).join(' ')
  return { 'color': 'error', 'aria-invalid': true, 'aria-describedby': describedBy }
})

// The value this field last settled on, which is what `dateUpdate` reports. NEVER re-read the model for that: when
// the parent owns the v-model, writing it only emits `update:modelValue`, and the prop comes back on the parent's
// next render — so in the same tick the model is still the OLD value, and a blur that just committed "5/12" would
// announce null.
let settled = props.modelValue
// The value `dateUpdate` last carried, boxed so an announced null is told apart from nothing announced yet.
let announced: { value: V | null } | undefined
watch(() => props.modelValue, (v) => {
  // The parent set a different value, so whatever we announced before is no longer what's in the field.
  if (!same(v, settled)) {
    announced = undefined
    flag(null)
  }
  settled = v
  text.value = show(v)
})
// A new format redraws the value it holds.
watch(() => props.engine.pattern, () => { text.value = show(settled) })

const inputCmp = useTemplateRef<{ inputRef: HTMLInputElement | null, $el: HTMLElement }>('inputCmp')

function set(v: V | null) {
  if (!same(v, settled)) emit('update:modelValue', v)
  settled = v
  text.value = show(v)
  return v
}

// What's typed becomes the value — or nothing, when it names nothing. Leaving "5/32" in the box would show one thing
// while the form saved another. Untouched text keeps the value as it is, so passing through the field can't blank a
// stored value it wouldn't read back (a year before 1000). A value the limits refuse keeps the one there was, drawn
// back in the box, and marks the field invalid: undefined, for nothing settled.
function commitText(): { value: V | null } | undefined {
  const next = eng().commit(text.value, settled, useToday())
  const refused = next !== null && !same(next, settled) ? eng().check(next) : null
  if (refused) {
    text.value = show(settled)
    flag(refused)
    return undefined
  }
  return { value: set(next) }
}

function onType(v: string | number | null | undefined) {
  text.value = v == null ? '' : String(v)
  flag(null)
}

function focusInput() {
  nextTick(() => {
    const el = inputCmp.value?.inputRef
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  })
}

// Focus is "still ours" on the input and anywhere in the calendar popover (which is teleported, so it isn't inside the
// input's element).
function isOurs(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  return !!inputCmp.value?.$el?.contains(target) || !!target.closest(`[data-date-field-panel="${panelId}"]`)
}

function announce(v: V | null) {
  announced = { value: v }
  emit('dateUpdate', v)
}

// Leaving settles the field, but a value already announced (by Enter, say) isn't announced again: an inline editor
// saving on dateUpdate would save it twice.
function leave(e: FocusEvent) {
  if (isOurs(e.relatedTarget)) return
  if (announced && same(announced.value, settled)) return
  announce(settled)
}

function onBlur(e: FocusEvent) {
  commitText()
  leave(e)
}

function onKeydown(e: KeyboardEvent) {
  if (e.isComposing || e.ctrlKey || e.metaKey) return
  if (e.altKey) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      open.value = true
    }
    return
  }
  if (e.key === 'Enter') {
    open.value = false
    const committed = commitText()
    if (committed) announce(committed.value)
    // Refused: the value it kept is selected, so typing another replaces it.
    else nextTick(() => inputCmp.value?.inputRef?.select())
    return
  }
  // Tab commits here, so the text is settled before focus moves; the blur that follows announces it, once.
  if (e.key === 'Tab') {
    commitText()
    open.value = false
    return
  }
  if (e.key.length !== 1 || !eng().isShortcut(e.key)) return
  e.preventDefault()
  // Shortcuts step from the committed value, not from text typed since: the typed text is dropped. With nowhere
  // allowed to go, the key does nothing.
  const next = eng().shortcut(e.key, settled, useToday())
  if (next === null) return
  flag(null)
  announce(set(next))
  // Selected, so typing a value replaces the shortcut's rather than appending to it.
  nextTick(() => inputCmp.value?.inputRef?.select())
}

function clear() {
  const v = set(null)
  flag(null)
  emit('clear')
  announce(v)
  focusInput()
}

// ── Calendar ──────────────────────────────────────────────────────────────────────────────────────────────────
// The selection follows text typed but not yet committed, so the picker and the input never disagree; untouched or unreadable text falls back to the model. Only read while the popover is open, which is
// only ever in the browser.
const typed = () => eng().parse(text.value, useToday())
const calendarValue = computed(() => typed() ?? props.modelValue)
const calendarView = computed(() => typed() ?? props.modelValue ?? eng().today(useToday()))

function pick(v: V) {
  open.value = false
  flag(null)
  announce(set(v))
  focusInput()
}

const popoverContent = computed(() => ({
  side: 'bottom' as const,
  align: 'start' as const,
  'data-date-field-panel': panelId,
  // The input keeps focus while the calendar is open, so typing and shortcuts still work.
  onOpenAutoFocus: (e: Event) => e.preventDefault(),
  onCloseAutoFocus: (e: Event) => e.preventDefault(),
  // A click on our own input or icon isn't "outside"; the icon toggles the calendar itself.
  onInteractOutside: (e: CustomEvent<{ originalEvent?: Event }>) => {
    if (isOurs(e.detail?.originalEvent?.target ?? e.target)) e.preventDefault()
  },
  onFocusout: leave,
}))

function toggle() {
  if (props.disabled) return
  open.value = !open.value
  focusInput()
}

defineExpose({ focus: focusInput })
</script>

<template>
  <UPopover v-model:open="open" :content="popoverContent" :portal="portal">
    <template #anchor>
      <!-- The placeholder keeps the input's own ink, the product's: a product may darken it (a value's shape must not
           read as a value someone typed), through `ui.base` or its app.config's input. While the calendar is open the
           field takes Nuxt UI's highlight ring, so it reads as the one being edited. -->
      <UInput
        ref="inputCmp"
        :model-value="text"
        type="text"
        autocomplete="off"
        v-bind="{ ...$attrs, ...invalidAttrs }"
        :size="size"
        :icon="icon"
        :disabled="disabled"
        :placeholder="placeholder ?? engine.pattern"
        :highlight="highlight || open || !!problem"
        :ui="{ ...ui, root: `group ${ui?.root ?? ''}` }"
        @update:model-value="onType"
        @keydown="onKeydown"
        @blur="onBlur"
      >
        <template v-if="$slots.leading" #leading="slotProps">
          <slot name="leading" v-bind="slotProps" />
        </template>
        <template v-else-if="icon" #leading="{ ui: inputUi }">
          <UIcon :name="icon" data-slot="leadingIcon" :class="inputUi.leadingIcon({ class: ui?.leadingIcon })" @click="emit('iconClick', $event)" />
        </template>
        <template #trailing="{ ui: inputUi }">
          <!-- Why a typed value was refused, for screen readers: the input's aria-describedby names it. -->
          <span v-if="messageId" :id="messageId" class="sr-only">{{ problemMessage }}</span>
          <!-- Neither button takes focus (mousedown is prevented), so the input never blurs to them. Each icon is
               `text-current`, over Nuxt UI's dimmed trailing icon, so the button's own color reaches it. -->
          <button
            v-if="clearable && modelValue !== null && !disabled"
            type="button"
            tabindex="-1"
            :aria-label="clearLabel"
            class="cursor-pointer items-center text-dimmed hover:text-primary"
            :class="open ? 'flex' : 'hidden group-focus-within:flex'"
            @mousedown.prevent
            @click="clear"
          >
            <UIcon name="i-lucide-x" :class="inputUi.trailingIcon({ class: 'text-current' })" />
          </button>
          <button
            type="button"
            tabindex="-1"
            :aria-label="chooseLabel"
            :disabled="disabled"
            class="flex cursor-pointer items-center hover:text-primary disabled:cursor-not-allowed"
            :class="open ? 'text-primary' : 'text-dimmed group-focus-within:text-primary'"
            @mousedown.prevent
            @click="toggle"
          >
            <UIcon :name="calendarIcon" :class="inputUi.trailingIcon({ class: 'text-current' })" />
          </button>
        </template>
      </UInput>
    </template>

    <template #content>
      <slot name="calendar" :value="calendarValue" :view="calendarView" :pick="pick" />
    </template>
  </UPopover>
</template>
