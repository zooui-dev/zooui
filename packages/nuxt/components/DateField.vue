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
// Typing (in MM/DD/YYYY): "5" or "12" is that day this month, "0512" is May 12, "051226" and "5/12/26" and
// "5/12/2026" carry the year; other formats read the same shapes in their own order. Enter, Tab or leaving the
// field commits; text that isn't a date clears the field. Shortcut keys (see applyDateShortcut): t today, m/h
// start/end of month, y/r start/end of year, + and - a day either way (_ too, so a format whose separator is "-"
// keeps a key for the day before).
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
// Also: a leading `icon` whose click emits `iconClick`, a `calendarIcon` in place of the calendar,
// and one-letter weekday headers (the locale's narrow weekday).
import { CalendarDate } from '@internationalized/date'
import { formFieldInjectionKey, useLocale } from '@nuxt/ui/composables'
import type { Temporal } from 'temporal-polyfill/implementation'
import { useToday } from '../composables/useToday'
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

const { locale: uiLocale } = useLocale()
const localeCode = computed(() => props.locale ?? uiLocale.value.code)
const entryFormat = computed(() => (props.format ? dateEntryFormat(props.format) : dateEntryFormatFor(localeCode.value)))
const show = (d: Temporal.PlainDate | null) => formatDateEntry(d, entryFormat.value)

// The caller's type, kept through an empty spell, and the CalendarDate it last held (whose class builds the next).
let remembered: DateModelType | undefined
let like: CalendarDateLike | undefined
function remember(v: unknown) {
  const type = dateModelTypeOf(v)
  if (type) remembered = type
  if (type === 'calendar-date') like = v as CalendarDateLike
}
remember(model.value)
const kind = () => dateModelTypeOf(model.value) ?? remembered ?? props.modelType
/** A day as the caller's type. */
const out = (d: Temporal.PlainDate | null) => fromPlainDate(d, kind(), like) as T | null
const outDay = (d: Temporal.PlainDate) => fromPlainDate(d, kind(), like) as Day

const open = ref(false)
const text = ref(show(toPlainDate(model.value)))

const sameDay = (a: Temporal.PlainDate | null, b: Temporal.PlainDate | null) => a === b || (!!a && !!b && a.equals(b))

const limits = computed<DateLimits>(() => {
  const unavailable = props.isDateUnavailable
  return {
    minValue: toPlainDate(props.minValue),
    maxValue: toPlainDate(props.maxValue),
    isDateUnavailable: unavailable && ((d: Temporal.PlainDate) => unavailable(outDay(d))),
  }
})

// ── Invalid ───────────────────────────────────────────────────────────────────────────────────────────────────
const problem = ref<DateLimitProblem | null>(null)
const problemMessage = computed(() => (problem.value ? dateLimitMessage(problem.value, entryFormat.value) : ''))
function flag(p: DateLimitProblem | null) {
  if (!p && !problem.value) return
  problem.value = p
  emit('invalid', p && { reason: p.reason, date: outDay(p.date), limit: p.limit && outDay(p.limit), message: problemMessage.value })
}
// In a UFormField, Nuxt UI's UInput takes aria-invalid, its error color and aria-describedby from the field, over
// anything passed to it: so while a day is refused the field the UInput sees carries the message as its error (unless
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

// The date this field last settled on, which is what `dateUpdate` reports. NEVER re-read `model.value` for
// that: when the parent owns the v-model, writing it only emits `update:modelValue`, and the prop comes back
// on the parent's next render — so in the same tick `model.value` is still the OLD date, and a blur that just
// committed "5/12" would announce null.
let settled = toPlainDate(model.value)
// The date `dateUpdate` last carried, boxed so an announced null is told apart from nothing announced yet.
let announced: { date: Temporal.PlainDate | null } | undefined
watch(model, (v) => {
  remember(v)
  const d = toPlainDate(v)
  // The parent set a different date, so whatever we announced before is no longer what's in the field.
  if (!sameDay(d, settled)) {
    announced = undefined
    flag(null)
  }
  settled = d
  text.value = show(d)
})
// A new format redraws the date it holds.
watch(entryFormat, () => { text.value = show(settled) })

const inputCmp = useTemplateRef<{ inputRef: HTMLInputElement | null, $el: HTMLElement }>('inputCmp')

function set(d: Temporal.PlainDate | null) {
  if (!sameDay(d, settled)) model.value = out(d)
  settled = d
  text.value = show(d)
  return d
}

// What's typed becomes the value — or nothing, when it isn't a date. Leaving "5/32" in the box would show one
// thing while the form saved another. Untouched text keeps the date as it is, so passing through the field
// can't blank a stored date it wouldn't read back (a year before 1000). A day the limits refuse keeps the date
// there was, drawn back in the box, and marks the field invalid: undefined, for nothing settled.
function commitText(): { date: Temporal.PlainDate | null } | undefined {
  const next = commitDateEntry(text.value, settled, useToday(), entryFormat.value)
  const refused = next && !sameDay(next, settled) ? checkDateLimits(next, limits.value) : null
  if (refused) {
    text.value = show(settled)
    flag(refused)
    return undefined
  }
  return { date: set(next) }
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

// Focus is "still ours" on the input and anywhere in the calendar popover (which is teleported, so it isn't
// inside the input's element).
function isOurs(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  return !!inputCmp.value?.$el?.contains(target) || !!target.closest(`[data-date-field-panel="${panelId}"]`)
}

function announce(d: Temporal.PlainDate | null) {
  announced = { date: d }
  emit('dateUpdate', out(d))
}

// Leaving settles the field, but a date already announced (by Enter, say) isn't announced again: an inline
// editor saving on dateUpdate would save it twice.
function leave(e: FocusEvent) {
  if (isOurs(e.relatedTarget)) return
  if (announced && sameDay(announced.date, settled)) return
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
    if (committed) announce(committed.date)
    // Refused: the date it kept is selected, so typing another replaces it.
    else nextTick(() => inputCmp.value?.inputRef?.select())
    return
  }
  // Tab commits here, so the text is settled before focus moves; the blur that follows announces it, once.
  if (e.key === 'Tab') {
    commitText()
    open.value = false
    return
  }
  if (e.key.length !== 1 || !isDateShortcut(e.key, entryFormat.value)) return
  e.preventDefault()
  const today = useToday()
  // Shortcuts step from what's on screen, even if it hasn't been committed yet. With no allowed day to go to, the
  // key does nothing.
  const next = applyDateShortcut(e.key, parseDateEntry(text.value, today, entryFormat.value) ?? settled, today, entryFormat.value, limits.value)
  if (!next) return
  flag(null)
  announce(set(next))
  // Selected, so typing a date replaces the shortcut's rather than appending to it.
  nextTick(() => inputCmp.value?.inputRef?.select())
}

function clear() {
  const d = set(null)
  flag(null)
  emit('clear')
  announce(d)
  focusInput()
}

// ── Calendar ──────────────────────────────────────────────────────────────────────────────────────────────
// UCalendar takes Nuxt UI's CalendarDate, a bare year/month/day, so the conversion is by fields both ways.
const toCalendar = (d: Temporal.PlainDate) => new CalendarDate(d.year, d.month, d.day)

// The selection follows text typed but not yet committed, as the month and the shortcuts do, so the picker and the
// input never disagree; untouched or unreadable text falls back to the model.
const calendarValue = computed(() => {
  const day = parseDateEntry(text.value, useToday(), entryFormat.value) ?? toPlainDate(model.value)
  return day ? toCalendar(day) : undefined
})
// The month the calendar shows: the date in the box (typed or committed), else this month. Only read while
// the popover is open, which is only ever in the browser.
const calendarMonth = computed(() =>
  toCalendar(parseDateEntry(text.value, useToday(), entryFormat.value) ?? toPlainDate(model.value) ?? useToday()),
)
// The limits, for the calendar to disable those days.
const calendarMin = computed(() => (limits.value.minValue ? toCalendar(limits.value.minValue as Temporal.PlainDate) : undefined))
const calendarMax = computed(() => (limits.value.maxValue ? toCalendar(limits.value.maxValue as Temporal.PlainDate) : undefined))
const calendarUnavailable = computed(() => {
  const unavailable = limits.value.isDateUnavailable
  return unavailable ? (v: CalendarDateLike) => unavailable(toPlainDate(v)!) : undefined
})

function onPick(v: unknown) {
  const type = dateModelTypeOf(v)
  if (type !== 'calendar-date') return
  open.value = false
  flag(null)
  announce(set(toPlainDate(v as CalendarDateLike)))
  focusInput()
}

// The month heading is the one thing in the calendar whose width depends on what it says, and the popover
// sizes to its content — so paging from May to September widened it and shoved the grid and the arrows
// sideways. A fixed width that fits the longest English heading ("September 2026" is about 7.9em) keeps every
// month the same. In em, so it follows the button's own font at every `size`; plus room for its padding, which is rem.
const headingButton = { class: 'w-[calc(8.5em+1.5rem)] flex-none' }

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
      <!-- The placeholder keeps the input's own ink, the product's: a product may darken it (a date's shape must not read as
           a date someone typed), through `ui.base` or its app.config's input. While the calendar is open the field
           takes Nuxt UI's highlight ring, so it reads as the one being edited. -->
      <UInput
        ref="inputCmp"
        :model-value="text"
        type="text"
        autocomplete="off"
        v-bind="{ ...$attrs, ...invalidAttrs }"
        :size="size"
        :icon="icon"
        :disabled="disabled"
        :placeholder="placeholder ?? entryFormat.pattern"
        :highlight="highlight || open || !!problem"
        :ui="{ ...ui, root: `group ${ui?.root ?? ''}` }"
        @update:model-value="onType"
        @keydown="onKeydown"
        @blur="onBlur"
      >
        <template v-if="icon" #leading="{ ui: inputUi }">
          <UIcon :name="icon" data-slot="leadingIcon" :class="inputUi.leadingIcon({ class: ui?.leadingIcon })" @click="emit('iconClick', $event)" />
        </template>
        <template #trailing="{ ui: inputUi }">
          <!-- Why a typed day was refused, for screen readers: the input's aria-describedby names it. -->
          <span v-if="messageId" :id="messageId" class="sr-only">{{ problemMessage }}</span>
          <!-- Neither button takes focus (mousedown is prevented), so the input never blurs to them. Each icon is
               `text-current`, over Nuxt UI's dimmed trailing icon, so the button's own color reaches it. -->
          <button
            v-if="clearable && model && !disabled"
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
      <UCalendar
        :model-value="calendarValue"
        :placeholder="calendarMonth"
        :locale="localeCode"
        :size="size"
        :view-control="headingButton"
        :min-value="calendarMin"
        :max-value="calendarMax"
        :is-date-unavailable="calendarUnavailable"
        weekday-format="narrow"
        prevent-deselect
        class="p-2"
        @update:model-value="onPick"
      />
    </template>
  </UPopover>
</template>
