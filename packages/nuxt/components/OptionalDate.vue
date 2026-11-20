<script setup lang="ts" generic="T extends Temporal.PlainDate | CalendarDateLike | null">
// An optional date: a checkbox in front of a ZDateField, for a day a record may or may not have — "Has an end date",
// "Extension filed". The date is editable, and counts, only while the box is ticked.
//
//   <UFormField label="Ends"><ZOptionalDate v-model="form.endDate" label="Has an end date" /></UFormField>
//   <ZOptionalDate v-model="extDue" v-model:enabled="extFiled" label="Extension filed" model-type="calendar-date" />
//
// THE MODEL. As Buoy's UCheckboxDate: unticking disables the date field and greys it out, and LEAVES the day in v-model,
// so the form reads `enabled` to know whether it counts. The box and the day are independent: a day the parent sets
// doesn't tick the box. Ticked and empty is a state of its own ("has an end date, not yet known"), which is why the box
// is `v-model:enabled` rather than read off the date. Unbound, the box starts ticked when the model holds a day.
//
// `clear-when-off` makes v-model null while the box is off, for a form that saves what it holds: unticking REMEMBERS
// the day (here, not in the model) and ticking again puts it back, so a box unticked by mistake costs nothing; the
// field shows no day while it is off, and a day the parent sets ticks the box. Unticking a day announces `dateUpdate`
// with null (an inline editor saves then); a restored day is announced by the field itself when focus leaves it.
//
// Nothing is written at mount in either mode, so loading a record never marks the form changed: a box off with a day
// in hand shows the day greyed out until the user ticks or unticks.
//
// `enabled-change` fires with the new state when the USER ticks or unticks (Buoy's `enabledChanged`), never when the
// parent sets `enabled` or the day — the moment to fetch a default date. A tick by the user moves focus into the date
// field.
//
// SIZE. An explicit `size` prop wins, then a surrounding UFieldGroup's, then a UFormField's: Buoy's behavior, and the
// order of Nuxt UI's own useFieldGroup and useFormField.
//
// IN A UFormField the date field is the input: the label names it and the field's error and help describe it, as for
// a bare ZDateField. The checkbox is named by `label` and kept out of the form field (an input in a UFormField takes
// its id, which two inputs can't share), and it names the date input in aria-controls.
//
// Everything else — format, locale, clearable, placeholder, icon, `@invalid`, `@clear` … — passes through to ZDateField.
import { fieldGroupInjectionKey, formBusInjectionKey, formFieldInjectionKey, inputIdInjectionKey } from '@nuxt/ui/composables'
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
    /** Make v-model null while the box is off, keeping the day to put back on a tick. Off: the day stays in v-model. */
    clearWhenOff?: boolean
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
  // As ZDateField's, and null when unticking clears a day (clear-when-off).
  dateUpdate: [value: T | null]
  // The user ticked (true) or unticked (false) the box.
  enabledChange: [enabled: boolean]
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
const fieldGroup = inject(fieldGroupInjectionKey, undefined)
const size = computed<Size>(() => props.size ?? fieldGroup?.value?.size ?? (formField?.value?.size as Size | undefined) ?? 'md')

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
// The day unticking took away, for ticking to put back (clear-when-off).
let kept: T | null = null

// Returns whether the box changed.
function apply(next: boolean) {
  if (next === on.value) return false
  on.value = next
  enabled.value = next
  if (!props.clearWhenOff) return true
  if (!next) {
    if (model.value == null) return true
    kept = model.value
    model.value = null
    emit('dateUpdate', null)
  } else if (model.value == null && kept != null) {
    model.value = kept
    kept = null
  }
  return true
}

watch(() => enabled.value, (v) => { if (v !== undefined) apply(v) })
// clear-when-off: a day the parent sets ticks the box, and replaces any kept one.
watch(model, (v) => {
  if (v == null || !props.clearWhenOff) return
  kept = null
  if (!on.value) {
    on.value = true
    enabled.value = true
  }
})

const fieldCmp = useTemplateRef<{ focus: () => void }>('fieldCmp')
const checkboxCmp = useTemplateRef<{ $el: HTMLElement }>('checkboxCmp')

function onToggle(v: boolean | 'indeterminate') {
  if (apply(v === true)) emit('enabledChange', on.value)
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
