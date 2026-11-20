<script setup lang="ts" generic="T extends Temporal.PlainDate | CalendarDateLike | null">
// An optional date: a checkbox in front of a ZDateField, for a day a record may or may not have — "Has an end date",
// "Extension filed". The date is editable, and counts, only while the box is ticked.
//
//   <UFormField label="Ends"><ZOptionalDate v-model="form.endDate" label="Has an end date" /></UFormField>
//   <ZOptionalDate v-model="extDue" v-model:enabled="extFiled" label="Extension filed" model-type="calendar-date" />
//
// THE MODEL. While the box is off, v-model is null: a form saves what it holds, and an unticked day must not be saved.
// Unticking REMEMBERS the day (here, not in the model) and ticking again puts it back, so a box unticked by mistake
// costs nothing; the field shows no day while it is off, since it never shows one the form isn't holding. A day the
// parent sets ticks the box. Ticked and empty is a state of its own ("has an end date, not yet known"), which is why
// the box is `v-model:enabled` rather than read off the date. Unbound, the box starts ticked when the model holds a day.
//
// A tick by the user moves focus into the date field. Unticking a day announces `dateUpdate` with null (an inline
// editor saves then); a restored day is announced by the field itself when focus leaves it, as any settle is.
//
// IN A UFormField the date field is the input: the label names it and the field's error and help describe it, as for
// a bare ZDateField. The checkbox is named by `label` and kept out of the form field (an input in a UFormField takes
// its id, which two inputs can't share), and it names the date input in aria-controls.
//
// Everything else — format, locale, clearable, placeholder, icon, `@invalid`, `@clear` … — passes through to ZDateField.
import { formBusInjectionKey, formFieldInjectionKey, inputIdInjectionKey } from '@nuxt/ui/composables'
import type { Temporal } from 'temporal-polyfill/implementation'
import type { CalendarDateLike, DateModelType } from '../utils/date-entry'

defineOptions({ inheritAttrs: false })

type Day = NonNullable<T>
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const props = withDefaults(
  defineProps<{
    /** The checkbox's accessible name: "Has an end date", "Extension filed". */
    label?: string
    /** Disables the checkbox and the date field. */
    disabled?: boolean
    size?: Size
    /** As ZDateField's: the type to hand back while the model is null and has held no day. */
    modelType?: DateModelType
    /** The first day the field takes, a PlainDate or a CalendarDate. */
    minValue?: Temporal.PlainDate | CalendarDateLike
    /** The last day the field takes, a PlainDate or a CalendarDate. */
    maxValue?: Temporal.PlainDate | CalendarDateLike
    /** Days the field refuses between the two; called with a day of the model's type. */
    isDateUnavailable?: (date: Day) => boolean
  }>(),
  { label: 'Set a date', modelType: 'plain-date' },
)
const emit = defineEmits<{
  // As ZDateField's, and null when unticking clears a day.
  dateUpdate: [value: T | null]
}>()
const model = defineModel<T | null>({ default: null })
/** Whether the box is ticked. Unbound, it starts ticked when the model holds a day. */
const enabled = defineModel<boolean | undefined>('enabled', { default: undefined })

const formField = inject(formFieldInjectionKey, undefined)
const formInputId = inject(inputIdInjectionKey, undefined)
const formBus = inject(formBusInjectionKey, undefined)
const ownId = useId()
// Inside a UFormField the date input takes the field's id (so its label names it); outside, one of ours.
const inputId = computed(() => (formField?.value ? formInputId?.value : undefined) ?? ownId)
const size = computed<Size>(() => props.size ?? (formField?.value?.size as Size | undefined) ?? 'md')

// The checkbox outside the form field: no shared id, no field error color, no form events on its own.
const OutsideFormField = defineComponent({
  setup(_, { slots }) {
    provide(formFieldInjectionKey, undefined)
    provide(inputIdInjectionKey, ref<string>())
    return () => slots.default?.()
  },
})

// The box's state, read here rather than off `enabled`: a parent-owned v-model only catches up on its next render.
const on = ref(enabled.value ?? model.value != null)
// The day unticking took away, for ticking to put back.
let kept: T | null = null

function apply(next: boolean) {
  if (next === on.value) return
  on.value = next
  enabled.value = next
  if (!next) {
    if (model.value == null) return
    kept = model.value
    model.value = null
    emit('dateUpdate', null)
  } else if (model.value == null && kept != null) {
    model.value = kept
    kept = null
  }
}

if (enabled.value === undefined) enabled.value = on.value
// Off with a day in hand: the box says it doesn't count, so it is kept for a tick and the model holds null.
else if (!on.value && model.value != null) {
  kept = model.value
  model.value = null
}

watch(() => enabled.value, (v) => { if (v !== undefined) apply(v) })
// A day the parent sets ticks the box, and replaces any kept one.
watch(model, (v) => {
  if (v == null) return
  kept = null
  if (!on.value) {
    on.value = true
    enabled.value = true
  }
})

const fieldCmp = useTemplateRef<{ focus: () => void }>('fieldCmp')
const checkboxCmp = useTemplateRef<{ $el: HTMLElement }>('checkboxCmp')

function onToggle(v: boolean | 'indeterminate') {
  apply(v === true)
  // The model changed in code, which the date input never reports, and the box is kept out of the form field: so a
  // UForm hears it here, and revalidates the field (an error for a date the box no longer asks for goes away).
  const name = formField?.value?.name
  if (formBus && name) formBus.emit({ type: 'change', name })
  if (on.value) nextTick(() => fieldCmp.value?.focus())
}

const attrs = useAttrs()
const fieldAttrs = computed(() => {
  const { class: _class, style: _style, ui, ...rest } = attrs as Record<string, unknown> & { ui?: { base?: string, root?: string } }
  return { ...rest, ui: { ...ui, root: `-ms-px min-w-0 flex-1 ${ui?.root ?? ''}`, base: `rounded-s-none ${ui?.base ?? ''}` } }
})

defineExpose({
  /** Focuses the date field while the box is ticked, the checkbox while it isn't. */
  focus: () => {
    if (on.value) fieldCmp.value?.focus()
    else checkboxCmp.value?.$el?.querySelector<HTMLElement>('button')?.focus()
  },
})
</script>

<template>
  <div class="inline-flex items-stretch" :class="attrs.class" :style="attrs.style as never" data-optional-date :data-enabled="on || undefined">
    <div class="flex items-center rounded-s-md bg-default ps-2.5 pe-2 ring ring-inset ring-accented">
      <OutsideFormField>
        <UCheckbox
          ref="checkboxCmp"
          :model-value="on"
          :size="size"
          :disabled="disabled"
          :aria-label="label"
          :aria-controls="inputId"
          @update:model-value="onToggle"
        />
      </OutsideFormField>
    </div>
    <ZDateField
      :id="formField ? undefined : inputId"
      ref="fieldCmp"
      v-bind="fieldAttrs"
      v-model="model"
      :size="size"
      :disabled="disabled || !on"
      :model-type="modelType"
      :min-value="minValue"
      :max-value="maxValue"
      :is-date-unavailable="isDateUnavailable as never"
      @date-update="(d: T | null) => emit('dateUpdate', d)"
    />
  </div>
</template>
