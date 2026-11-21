<script setup lang="ts" generic="T extends Temporal.PlainDate | CalendarDateLike | null">
// A calendar-day field: type a date, press a shortcut key, or pick from a calendar. The model is a Temporal.PlainDate (the
// same type a `date` column comes back as, so a form round-trips the server's value without ever touching a string or a
// time zone) or an @internationalized/date CalendarDate (the type Nuxt UI's UCalendar and UInputDate use), or null.
//
// THE CALLER'S TYPE. Whatever the model holds is what comes back, in `update:modelValue`, `dateUpdate` and `invalid`
// alike; a CalendarDate is built with the caller's own class. A model that starts out null hands back `modelType`'s
// type ('plain-date' by default), and one that held a day and was cleared keeps the type it had. Only a Gregorian
// CalendarDate is taken: one in another calendar throws (toPlainDate), since converting it by its fields would land
// on another day. Inside, everything is a PlainDate; the conversion is at the edges.
//
// WHY NO `Date`. A JavaScript Date is an instant, not a day. Every conversion between the two goes through a
// time zone, and every one of those is a chance for the 12th to become the 11th. So nothing here constructs one:
// the typed text is parsed by parseDateEntry (utils/date-entry.ts, pure Temporal), and a CalendarDate is converted
// by its fields alone (year, month, day), never via toDate()/getLocalTimeZone(). "Today" comes from useToday().
//
//   <ZDateField v-model="form.endDate" clearable class="w-full" />
//   <ZDateField v-model="due" format="DD.MM.YYYY" locale="de" />
//   <ZDateField v-model="due" :min-value="opened" :max-value="closes" :is-date-unavailable="isHoliday" />
//
// FORMAT AND LOCALE. `locale` names the calendar's language and week (Nuxt UI's locale when unset, `en` unless the
// app's <UApp :locale> says otherwise). `format` is how the box writes and reads a day — a pattern such as
// "MM/DD/YYYY", "DD/MM/YYYY", "DD.MM.YYYY" or "YYYY-MM-DD" — and when unset it is the locale's own numeric order
// (dateEntryFormatFor), so `en` gives MM/DD/YYYY. The placeholder is the pattern.
//
// Typing (in MM/DD/YYYY): "5" or "12" is that day this month, "0512" is May 12, "051226", "05122026", "5/12/26" and
// "5/12/2026" carry the year; other formats read the same shapes in their own order. Enter, Tab or leaving the
// field commits; text that isn't a date clears the field. Shortcut keys (see applyDateShortcut): t today, m/h
// start/end of month, y/r start/end of year, + and - a day either way (_ too, so a format whose separator is "-"
// keeps a key for the day before). A shortcut steps from the committed date (today when there is none), never from
// text typed but not yet committed: with 03/15/2026 saved, "04/0" then + is 03/16/2026.
//
// LIMITS. `minValue`, `maxValue` and `isDateUnavailable`, named as Nuxt UI's UCalendar names them, go to the calendar,
// which disables those days. A typed date they refuse is not committed: the field keeps the date it had and draws it
// back in the box (as with text that isn't a date, the box never shows a day the form isn't holding), and is marked
// invalid — aria-invalid, Nuxt UI's error color, a message for screen readers — until the next edit, pick, shortcut or
// clear. `invalid` carries the problem (why, the date, the limit, an English message) for the product to show, and
// null once it's gone; a refused Enter doesn't announce `dateUpdate`. The shortcuts stop at the limits and skip
// unavailable days (applyDateShortcut says how, `t` included).
//
// `dateUpdate` fires when a date is settled — picked, cleared, set by a shortcut, committed with Enter, or when
// focus leaves the field for somewhere other than its own calendar (Tab included, once) — which is the moment
// an inline editor (a table cell) should save and close. It always carries the date just settled, even when
// the parent's v-model hasn't caught up yet, and fires once per settle: leaving right after Enter, a pick, a
// shortcut or a clear doesn't announce the same date again. Plain forms can ignore it and read v-model.
//
// Also: a leading `icon` whose click emits `iconClick` (or a `#leading` slot in its place), a `calendarIcon` in place
// of the calendar, and one-letter weekday headers (the locale's narrow weekday).
//
// The box, the commit rules, the invalid mark and `dateUpdate` are the field under it (internal/EntryField.vue), the
// same one ZMonthField and ZYearField use; what is a day's here is the reading and writing (date-entry.ts), the types
// and the calendar.
import { CalendarDate } from '@internationalized/date'
import { useLocale } from '@nuxt/ui/composables'
import type { Temporal } from 'temporal-polyfill/implementation'
import EntryField from './internal/EntryField.vue'
import type { EntryEngine, EntryProblem, InputSlotUi } from './internal/entry-field'
import {
  applyDateShortcut, checkDateLimits, commitDateEntry, dateEntryFormat, dateEntryFormatFor, dateLimitMessage, dateModelTypeOf, formatDateEntry,
  fromPlainDate, isDateShortcut, parseDateEntry, toPlainDate,
  type CalendarDateLike, type DateLimitProblem, type DateLimits, type DateModelType,
} from '../utils/date-entry'

defineOptions({ inheritAttrs: false })

// A CalendarDate is typed by the fields read from it (CalendarDateLike), not its class: Vue's ref() unwraps a class
// with private fields into a type the class no longer accepts, so a `ref<CalendarDate | null>` would not type-check
// against the class itself.
type Day = NonNullable<T>

const props = withDefaults(
  defineProps<{
    clearable?: boolean
    disabled?: boolean
    /** The pattern the box writes and reads: "MM/DD/YYYY", "DD.MM.YYYY", "YYYY-MM-DD" … Unset: the locale's own. */
    format?: string
    /** The calendar's locale (BCP 47), and the format's when `format` is unset. Unset: Nuxt UI's locale. */
    locale?: string
    /** Unset: the format's pattern, "MM/DD/YYYY". */
    placeholder?: string
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    /** A leading icon; a click on it emits `iconClick`. */
    icon?: string
    /** The calendar button's icon. A product's own icon is the product's to bundle. */
    calendarIcon?: string
    highlight?: boolean
    ui?: { root?: string, base?: string, trailing?: string, leading?: string, leadingIcon?: string }
    // Where the calendar is teleported; the popover's default (body) escapes table cells and modals.
    portal?: boolean | string
    /** The two buttons' accessible names, for a product in another language. */
    clearLabel?: string
    chooseLabel?: string
    /** The type to hand back while the model is null and has held no day: a CalendarDate v-model that starts out
     *  null needs `calendar-date`. */
    modelType?: DateModelType
    /** The first day the field takes, a PlainDate or a CalendarDate. */
    minValue?: Temporal.PlainDate | CalendarDateLike
    /** The last day the field takes, a PlainDate or a CalendarDate. */
    maxValue?: Temporal.PlainDate | CalendarDateLike
    /** Days the field refuses between the two; called with a day of the model's type. */
    isDateUnavailable?: (date: Day) => boolean
  }>(),
  { portal: true, calendarIcon: 'i-lucide-calendar', clearLabel: 'Clear date', chooseLabel: 'Choose a date', modelType: 'plain-date' },
)
const emit = defineEmits<{
  dateUpdate: [value: T | null]
  // A typed day refused by the limits, and null once the field is no longer marked invalid.
  invalid: [problem: (DateLimitProblem<Day> & { message: string }) | null]
  clear: []
  // A click on the leading `icon` (`iconClick`).
  iconClick: [event: MouseEvent]
}>()
const model = defineModel<T | null>({ default: null })
defineSlots<{
  /** UInput's leading slot, in place of the `icon` when given; `ui` is the input's, for its `leadingIcon` class. */
  leading?(props: { ui: InputSlotUi }): unknown
}>()

const { locale: uiLocale } = useLocale()
const localeCode = computed(() => props.locale ?? uiLocale.value.code)
const entryFormat = computed(() => (props.format ? dateEntryFormat(props.format) : dateEntryFormatFor(localeCode.value)))

// The caller's type, kept through an empty spell, and the CalendarDate it last held (whose class builds the next).
let remembered: DateModelType | undefined
let like: CalendarDateLike | undefined
function remember(v: unknown) {
  const type = dateModelTypeOf(v)
  if (type) remembered = type
  if (type === 'calendar-date') like = v as CalendarDateLike
}
remember(model.value)
watch(model, remember)
const kind = () => dateModelTypeOf(model.value) ?? remembered ?? props.modelType
/** A day as the caller's type. */
const out = (d: Temporal.PlainDate | null) => fromPlainDate(d, kind(), like) as T | null
const outDay = (d: Temporal.PlainDate) => fromPlainDate(d, kind(), like) as Day

// The field holds a PlainDate. A computed, so the field sees a new day only when the model changes, never on a render.
const day = computed(() => toPlainDate(model.value))
const sameDay = (a: Temporal.PlainDate | null, b: Temporal.PlainDate | null) => a === b || (!!a && !!b && a.equals(b))

const limits = computed<DateLimits>(() => {
  const unavailable = props.isDateUnavailable
  return {
    minValue: toPlainDate(props.minValue),
    maxValue: toPlainDate(props.maxValue),
    isDateUnavailable: unavailable && ((d: Temporal.PlainDate) => unavailable(outDay(d))),
  }
})

const engine = computed<EntryEngine<Temporal.PlainDate>>(() => {
  const format = entryFormat.value
  const within = limits.value
  return {
    pattern: format.pattern,
    show: (d) => formatDateEntry(d, format),
    parse: (text, today) => parseDateEntry(text, today, format),
    commit: (text, current, today) => commitDateEntry(text, current, today, format),
    same: sameDay,
    check: (d) => checkDateLimits(d, within),
    message: (p) => dateLimitMessage(p as DateLimitProblem, format),
    isShortcut: (key) => isDateShortcut(key, format),
    shortcut: (key, current, today) => applyDateShortcut(key, current, today, format, within),
    today: (today) => today,
  }
})

// The field's problem is the engine's, which is DateLimitProblem's.
function onInvalid(problem: (EntryProblem<Temporal.PlainDate> & { message: string }) | null) {
  const p = problem as (DateLimitProblem & { message: string }) | null
  emit('invalid', p && { reason: p.reason, date: outDay(p.date), limit: p.limit && outDay(p.limit), message: p.message })
}

const fieldCmp = useTemplateRef<{ focus: () => void }>('fieldCmp')

// ── Calendar ──────────────────────────────────────────────────────────────────────────────────────────────
// UCalendar takes Nuxt UI's CalendarDate, a bare year/month/day, so the conversion is by fields both ways.
const toCalendar = (d: Temporal.PlainDate) => new CalendarDate(d.year, d.month, d.day)
// The limits, for the calendar to disable those days.
const calendarMin = computed(() => (limits.value.minValue ? toCalendar(limits.value.minValue as Temporal.PlainDate) : undefined))
const calendarMax = computed(() => (limits.value.maxValue ? toCalendar(limits.value.maxValue as Temporal.PlainDate) : undefined))
const calendarUnavailable = computed(() => {
  const unavailable = limits.value.isDateUnavailable
  return unavailable ? (v: CalendarDateLike) => unavailable(toPlainDate(v)!) : undefined
})

function onPick(v: unknown, pick: (d: Temporal.PlainDate) => void) {
  if (dateModelTypeOf(v) === 'calendar-date') pick(toPlainDate(v as CalendarDateLike)!)
}

// The month heading is the one thing in the calendar whose width depends on what it says, and the popover
// sizes to its content — so paging from May to September widened it and shoved the grid and the arrows
// sideways. A fixed width that fits the longest English heading ("September 2026" is about 7.9em) keeps every
// month the same. In em, so it follows the button's own font at every `size`; plus room for its padding, which is rem.
const headingButton = { class: 'w-[calc(8.5em+1.5rem)] flex-none' }

defineExpose({ focus: () => fieldCmp.value?.focus() })
</script>

<template>
  <EntryField
    ref="fieldCmp"
    v-bind="$attrs"
    :model-value="day"
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
    @update:model-value="(d) => (model = out(d))"
    @date-update="(d) => emit('dateUpdate', out(d))"
    @invalid="onInvalid"
    @clear="emit('clear')"
    @icon-click="emit('iconClick', $event)"
  >
    <template v-if="$slots.leading" #leading="slotProps">
      <slot name="leading" v-bind="slotProps" />
    </template>
    <template #calendar="{ value, view, pick }">
      <UCalendar
        :model-value="value ? toCalendar(value) : undefined"
        :placeholder="toCalendar(view)"
        :locale="localeCode"
        :size="size"
        :view-control="headingButton"
        :min-value="calendarMin"
        :max-value="calendarMax"
        :is-date-unavailable="calendarUnavailable"
        weekday-format="narrow"
        prevent-deselect
        class="p-2"
        @update:model-value="(v) => onPick(v, pick)"
      />
    </template>
  </EntryField>
</template>
