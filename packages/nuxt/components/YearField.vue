<script setup lang="ts">
// A year field: type a year, press a shortcut key, or pick from a calendar of years. The model is the year as a number
// (2026), or null. ZDateField for a year — the same box, the same commit on Enter, Tab and blur, the same invalid mark,
// `dateUpdate` and clear button (the field under both is internal/EntryField.vue) — with year-entry.ts doing the reading.
//
//   <ZYearField v-model="form.year" class="w-28" />
//   <ZYearField v-model="year" :min-value="2000" :max-value="2030" clearable />
//
// Typing: "2026", or "26" and "6" (a two-digit year as ZDateField reads one: 2026, 2006). Text that isn't a year
// clears the field when it commits. Shortcut keys: t this year, y or - the year before, r or + the year after (_ and =
// too). They step from the committed year (this year when there is none) and stop at `minValue` and `maxValue`; a
// typed year outside them is refused, as ZDateField refuses a day.
import { CalendarDate } from '@internationalized/date'
import { useLocale } from '@nuxt/ui/composables'
import type { Temporal } from 'temporal-polyfill/implementation'
import EntryField from './internal/EntryField.vue'
import type { EntryEngine, InputSlotUi } from './internal/entry-field'
import { dateModelTypeOf, type CalendarDateLike } from '../utils/date-entry'
import {
  applyYearShortcut, checkYearLimits, commitYearEntry, formatYearEntry, isYearShortcut, parseYearEntry, yearLimitMessage,
  type YearLimitProblem,
} from '../utils/year-entry'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    clearable?: boolean
    disabled?: boolean
    /** The calendar's locale (BCP 47). Unset: Nuxt UI's locale. */
    locale?: string
    /** Unset: "YYYY". */
    placeholder?: string
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    /** A leading icon; a click on it emits `iconClick`. */
    icon?: string
    /** The calendar button's icon. */
    calendarIcon?: string
    highlight?: boolean
    ui?: { root?: string, base?: string, trailing?: string, leading?: string, leadingIcon?: string }
    portal?: boolean | string
    /** The two buttons' accessible names, for a product in another language. */
    clearLabel?: string
    chooseLabel?: string
    /** The first year the field takes. */
    minValue?: number
    /** The last year the field takes. */
    maxValue?: number
  }>(),
  { portal: true, calendarIcon: 'i-lucide-calendar', clearLabel: 'Clear year', chooseLabel: 'Choose a year' },
)
const emit = defineEmits<{
  dateUpdate: [value: number | null]
  // A typed year refused by the limits, and null once the field is no longer marked invalid.
  invalid: [problem: (YearLimitProblem & { message: string }) | null]
  clear: []
  iconClick: [event: MouseEvent]
}>()
const model = defineModel<number | null>({ default: null })
defineSlots<{
  /** UInput's leading slot, in place of the `icon` when given; `ui` is the input's, for its `leadingIcon` class. */
  leading?(props: { ui: InputSlotUi }): unknown
}>()

const { locale: uiLocale } = useLocale()
const localeCode = computed(() => props.locale ?? uiLocale.value.code)

// A parent that hands in undefined (an unset form key) means no year.
const year = computed(() => model.value ?? null)

const engine = computed<EntryEngine<number>>(() => {
  const within = { minValue: props.minValue, maxValue: props.maxValue }
  return {
    pattern: 'YYYY',
    show: formatYearEntry,
    parse: parseYearEntry,
    commit: commitYearEntry,
    same: (a, b) => a === b,
    check: (y) => checkYearLimits(y, within),
    message: (p) => yearLimitMessage(p as YearLimitProblem),
    isShortcut: isYearShortcut,
    shortcut: (key, current, today) => applyYearShortcut(key, current, today, within),
    today: (today: Temporal.PlainDate) => today.year,
  }
})

const fieldCmp = useTemplateRef<{ focus: () => void }>('fieldCmp')

// ── Calendar ──────────────────────────────────────────────────────────────────────────────────────────────
// UCalendar's year grid holds a CalendarDate: January 1 of the year, both ways.
const toCalendar = (y: number) => new CalendarDate(y, 1, 1)
const calendarMin = computed(() => (props.minValue != null ? toCalendar(props.minValue) : undefined))
const calendarMax = computed(() => (props.maxValue != null ? toCalendar(props.maxValue) : undefined))

function onPick(v: unknown, pick: (y: number) => void) {
  if (dateModelTypeOf(v) === 'calendar-date') pick((v as CalendarDateLike).year)
}

defineExpose({ focus: () => fieldCmp.value?.focus() })
</script>

<template>
  <EntryField
    ref="fieldCmp"
    v-bind="$attrs"
    :model-value="year"
    :engine="engine"
    :clearable="clearable"
    :disabled="disabled"
    :placeholder="placeholder"
    :size="size"
    :icon="icon"
    :calendar-icon="calendarIcon"
    :highlight="highlight"
    :ui="ui"
    :portal="portal"
    :clear-label="clearLabel"
    :choose-label="chooseLabel"
    @update:model-value="(y) => (model = y)"
    @date-update="(y) => emit('dateUpdate', y)"
    @invalid="(p) => emit('invalid', p as (YearLimitProblem & { message: string }) | null)"
    @clear="emit('clear')"
    @icon-click="emit('iconClick', $event)"
  >
    <template v-if="$slots.leading" #leading="slotProps">
      <slot name="leading" v-bind="slotProps" />
    </template>
    <template #calendar="{ value, view, pick }">
      <UCalendar
        type="year"
        :model-value="value !== null ? toCalendar(value) : undefined"
        :placeholder="toCalendar(view)"
        :locale="localeCode"
        :size="size"
        :min-value="calendarMin"
        :max-value="calendarMax"
        prevent-deselect
        class="p-2"
        @update:model-value="(v) => onPick(v, pick)"
      />
    </template>
  </EntryField>
</template>
