<script setup lang="ts" generic="T extends Temporal.PlainYearMonth | CalendarDateLike | null">
// A month-of-a-year field: type a month, press a shortcut key, or pick from a calendar of months. ZDateField for a
// month — the same box, the same commit on Enter, Tab and blur, the same invalid mark, `dateUpdate` and clear button
// (the field under both is internal/EntryField.vue) — with month-entry.ts doing the reading and writing.
//
//   <ZMonthField v-model="form.period" clearable />
//   <ZMonthField v-model="period" format="YYYY-MM" :min-value="opened" :max-value="closes" />
//
// THE CALLER'S TYPE, as ZDateField keeps it: a Temporal.PlainYearMonth (the default) or an @internationalized/date
// CalendarDate (what Nuxt UI's UCalendar holds for a month), read as the month it falls in and handed back as the first
// of it; `modelType` names the type for a model that starts out null. No JavaScript Date is made.
//
// FORMAT AND LOCALE. `format` is "MM/YYYY", "MM.YYYY", "YYYY-MM" …; unset, it is the locale's date order without the
// day (monthEntryFormatFor: `en` MM/YYYY, `de` MM.YYYY, `sv` YYYY-MM).
//
// Typing (in MM/YYYY): "5/26", "05/2026", "052026" and ISO's "2026-05" are May 2026; "5" or "12" is that month this
// year; "2026" alone is December 2026. Shortcut keys: t this month, y/r the year before or after, m/h the month before
// or after, - and + (or _ and =) a month either way; the format's separator always types. They step from the committed
// month (this month when there is none) and stop at `minValue` and `maxValue`. A typed month outside them is refused,
// as ZDateField refuses a day.
import { CalendarDate } from '@internationalized/date'
import { useLocale } from '@nuxt/ui/composables'
import type { Temporal } from 'temporal-polyfill/implementation'
import EntryField from './internal/EntryField.vue'
import type { EntryEngine, EntryProblem, InputSlotUi } from './internal/entry-field'
import type { CalendarDateLike } from '../utils/date-entry'
import {
  applyMonthShortcut, checkMonthLimits, commitMonthEntry, formatMonthEntry, fromPlainYearMonth, isMonthShortcut, monthEntryFormat,
  monthEntryFormatFor, monthLimitMessage, monthModelTypeOf, parseMonthEntry, toPlainYearMonth,
  type MonthLimitProblem, type MonthLimits, type MonthModelType,
} from '../utils/month-entry'

defineOptions({ inheritAttrs: false })

type Month = NonNullable<T>

const props = withDefaults(
  defineProps<{
    clearable?: boolean
    disabled?: boolean
    /** The pattern the box writes and reads: "MM/YYYY", "MM.YYYY", "YYYY-MM" … Unset: the locale's own. */
    format?: string
    /** The calendar's locale (BCP 47), and the format's when `format` is unset. Unset: Nuxt UI's locale. */
    locale?: string
    /** Unset: the format's pattern, "MM/YYYY". */
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
    /** The type to hand back while the model is null and has held no month. */
    modelType?: MonthModelType
    /** The first month the field takes, a PlainYearMonth or a CalendarDate (its month). */
    minValue?: Temporal.PlainYearMonth | CalendarDateLike
    /** The last month the field takes, a PlainYearMonth or a CalendarDate (its month). */
    maxValue?: Temporal.PlainYearMonth | CalendarDateLike
  }>(),
  { portal: true, calendarIcon: 'i-lucide-calendar', clearLabel: 'Clear month', chooseLabel: 'Choose a month', modelType: 'plain-year-month' },
)
const emit = defineEmits<{
  dateUpdate: [value: T | null]
  // A typed month refused by the limits, and null once the field is no longer marked invalid.
  invalid: [problem: (MonthLimitProblem<Month> & { message: string }) | null]
  clear: []
  iconClick: [event: MouseEvent]
}>()
const model = defineModel<T | null>({ default: null })
defineSlots<{
  /** UInput's leading slot, in place of the `icon` when given; `ui` is the input's, for its `leadingIcon` class. */
  leading?(props: { ui: InputSlotUi }): unknown
}>()

const { locale: uiLocale } = useLocale()
const localeCode = computed(() => props.locale ?? uiLocale.value.code)
const entryFormat = computed(() => (props.format ? monthEntryFormat(props.format) : monthEntryFormatFor(localeCode.value)))

// The caller's type, kept through an empty spell, and the CalendarDate it last held (whose class builds the next).
let remembered: MonthModelType | undefined
let like: CalendarDateLike | undefined
function remember(v: unknown) {
  const type = monthModelTypeOf(v)
  if (type) remembered = type
  if (type === 'calendar-date') like = v as CalendarDateLike
}
remember(model.value)
watch(model, remember)
const kind = () => monthModelTypeOf(model.value) ?? remembered ?? props.modelType
const out = (m: Temporal.PlainYearMonth | null) => fromPlainYearMonth(m, kind(), like) as T | null
const outMonth = (m: Temporal.PlainYearMonth) => fromPlainYearMonth(m, kind(), like) as Month

const month = computed(() => toPlainYearMonth(model.value))
const sameMonth = (a: Temporal.PlainYearMonth | null, b: Temporal.PlainYearMonth | null) => a === b || (!!a && !!b && a.equals(b))

const limits = computed<MonthLimits>(() => ({ minValue: toPlainYearMonth(props.minValue), maxValue: toPlainYearMonth(props.maxValue) }))

const engine = computed<EntryEngine<Temporal.PlainYearMonth>>(() => {
  const format = entryFormat.value
  const within = limits.value
  return {
    pattern: format.pattern,
    show: (m) => formatMonthEntry(m, format),
    parse: (text, today) => parseMonthEntry(text, today, format),
    commit: (text, current, today) => commitMonthEntry(text, current, today, format),
    same: sameMonth,
    check: (m) => checkMonthLimits(m, within),
    message: (p) => monthLimitMessage(p as MonthLimitProblem, format),
    isShortcut: (key) => isMonthShortcut(key, format),
    shortcut: (key, current, today) => applyMonthShortcut(key, current, today, format, within),
    today: (today) => today.toPlainYearMonth(),
  }
})

// The field's problem is the engine's, which is MonthLimitProblem's.
function onInvalid(problem: (EntryProblem<Temporal.PlainYearMonth> & { message: string }) | null) {
  const p = problem as (MonthLimitProblem & { message: string }) | null
  emit('invalid', p && { reason: p.reason, date: outMonth(p.date), limit: outMonth(p.limit), message: p.message })
}

const fieldCmp = useTemplateRef<{ focus: () => void }>('fieldCmp')

// ── Calendar ──────────────────────────────────────────────────────────────────────────────────────────────
// UCalendar's month grid holds a CalendarDate: the first of the month, both ways. It disables a month whose first day
// is after `max-value` or whose last day is before `min-value`, so the first of each limit's month is exact.
const toCalendar = (m: Temporal.PlainYearMonth) => new CalendarDate(m.year, m.month, 1)
const calendarMin = computed(() => (limits.value.minValue ? toCalendar(limits.value.minValue as Temporal.PlainYearMonth) : undefined))
const calendarMax = computed(() => (limits.value.maxValue ? toCalendar(limits.value.maxValue as Temporal.PlainYearMonth) : undefined))

function onPick(v: unknown, pick: (m: Temporal.PlainYearMonth) => void) {
  if (monthModelTypeOf(v) === 'calendar-date') pick(toPlainYearMonth(v as CalendarDateLike)!)
}

defineExpose({ focus: () => fieldCmp.value?.focus() })
</script>

<template>
  <EntryField
    ref="fieldCmp"
    v-bind="$attrs"
    :model-value="month"
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
    @update:model-value="(m) => (model = out(m))"
    @date-update="(m) => emit('dateUpdate', out(m))"
    @invalid="onInvalid"
    @clear="emit('clear')"
    @icon-click="emit('iconClick', $event)"
  >
    <template v-if="$slots.leading" #leading="slotProps">
      <slot name="leading" v-bind="slotProps" />
    </template>
    <template #calendar="{ value, view, pick }">
      <UCalendar
        type="month"
        :model-value="value ? toCalendar(value) : undefined"
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
