<script setup lang="ts">
/**
 * A search (filter) box for a list or a table toolbar: a UInput with a search icon at the start and a clear button at
 * the end while it holds text. What is typed is handed back once typing pauses for `debounce` ms (300 by default), as
 * `update:modelValue` and `filter` together, so a list is filtered once per pause rather than once per key. Clearing,
 * by the button or by Escape, hands back '' at once and keeps focus in the field; an Escape with nothing to clear is
 * left alone, so it still closes the dialog the field sits in.
 *
 * Everything else (id, name, size, color, variant, disabled, readonly, aria-*, class) falls through to the UInput;
 * `ui` is merged over the field's own classes.
 */
const props = withDefaults(defineProps<{
  modelValue?: string | null
  /** Milliseconds of quiet before what is typed is handed back. */
  debounce?: number
  placeholder?: string
  icon?: string
  clearIcon?: string
  /** The clear button's accessible name. */
  clearLabel?: string
  ui?: Record<string, string>
}>(), {
  modelValue: undefined,
  debounce: 300,
  placeholder: 'Filter…',
  icon: 'i-lucide-search',
  clearIcon: 'i-lucide-x',
  clearLabel: 'Clear',
})
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'filter': [value: string]
}>()

/** What the field shows, ahead of the model while a pause is pending. */
const text = ref(props.modelValue ?? '')
/** The value last handed back or given by the parent: a pause that ends on it hands nothing back. */
let settled = text.value
let timer: ReturnType<typeof setTimeout> | undefined

function cancel() {
  clearTimeout(timer)
  timer = undefined
}

function flush() {
  cancel()
  if (text.value === settled) return
  settled = text.value
  emit('update:modelValue', settled)
  emit('filter', settled)
}

function onUpdate(value: string | number | null | undefined) {
  text.value = String(value ?? '')
  cancel()
  timer = setTimeout(flush, props.debounce)
}

// The parent setting the model shows it, and drops a pause still pending: the parent's value wins.
watch(() => props.modelValue, (v) => {
  const next = v ?? ''
  if (next === settled && next === text.value) return
  cancel()
  text.value = settled = next
})

onBeforeUnmount(cancel)

const field = useTemplateRef<{ inputRef: HTMLInputElement | null }>('field')
const inputRef = computed(() => field.value?.inputRef ?? null)

function focus() {
  inputRef.value?.focus()
}

/** Empty the field and hand back '' now, with no pause. */
function clear() {
  text.value = ''
  flush()
}

function onClearClick() {
  clear()
  focus()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || e.isComposing) return
  if (text.value === '' && settled === '') return
  e.preventDefault()
  e.stopPropagation()
  clear()
}

// The clear button hides while the input is disabled or read-only, however it got so (a UFormField included).
const inputUi = computed(() => ({
  ...props.ui,
  base: ['peer', props.ui?.base].filter(Boolean).join(' '),
  trailing: ['pe-1.5 peer-disabled:hidden peer-read-only:hidden', props.ui?.trailing].filter(Boolean).join(' '),
}))

defineExpose({ focus, clear, inputRef })
</script>

<template>
  <UInput
    ref="field"
    :model-value="text"
    type="text"
    role="searchbox"
    autocomplete="off"
    :icon="icon"
    :placeholder="placeholder"
    :ui="inputUi"
    data-search-input
    @update:model-value="onUpdate"
    @keydown="onKeydown"
  >
    <template #trailing="{ ui: slotUi }">
      <button
        v-if="text"
        type="button"
        tabindex="-1"
        class="grid place-items-center rounded-sm p-1 text-dimmed hover:text-default"
        :aria-label="clearLabel"
        data-search-clear
        @mousedown.prevent
        @click="onClearClick"
      >
        <UIcon :name="clearIcon" :class="slotUi.trailingIcon({ class: 'text-current' })" />
      </button>
    </template>
  </UInput>
</template>
