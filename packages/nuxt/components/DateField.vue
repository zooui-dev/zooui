<script setup lang="ts">
// A calendar-day field: type a date, press a shortcut key, or pick from a calendar. The model is a Temporal.PlainDate (or null), the same type a `date`
// column comes back as, so a form round-trips the server's value without ever touching a string or a time zone.
//
// WHY NO `Date`. A JavaScript Date is an instant, not a day. Every conversion between the two goes through a
// time zone, and every one of those is a chance for the 12th to become the 11th. So nothing here constructs one:
// the typed text is parsed by parseDateEntry (utils/date-entry.ts, pure Temporal), and the calendar's
// CalendarDate is converted by its fields alone (year, month, day), never via toDate()/getLocalTimeZone().
// "Today" comes from useToday().
//
//   <ZDateField v-model="form.endDate" clearable class="w-full" />
//   <ZDateField v-model="due" format="DD.MM.YYYY" locale="de" />
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
// `dateUpdate` fires when a date is settled — picked, cleared, set by a shortcut, committed with Enter, or when
// focus leaves the field for somewhere other than its own calendar (Tab included, once) — which is the moment
// an inline editor (a table cell) should save and close. It always carries the date just settled, even when
// the parent's v-model hasn't caught up yet, and fires once per settle: leaving right after Enter, a pick, a
// shortcut or a clear doesn't announce the same date again. Plain forms can ignore it and read v-model.
//
// Also: a leading `icon` whose click emits `iconClick`, a `calendarIcon` in place of the calendar,
// and one-letter weekday headers (the locale's narrow weekday).
import type { CalendarDate as CalendarDay } from '@internationalized/date'
import { CalendarDate } from '@internationalized/date'
import { useLocale } from '@nuxt/ui/composables'
import { Temporal } from 'temporal-polyfill/implementation'
import { useToday } from '../composables/useToday'
import { applyDateShortcut, commitDateEntry, dateEntryFormat, dateEntryFormatFor, formatDateEntry, parseDateEntry } from '../utils/date-entry'

defineOptions({ inheritAttrs: false })

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
  }>(),
  { portal: true, calendarIcon: 'i-lucide-calendar', clearLabel: 'Clear date', chooseLabel: 'Choose a date' },
)
const emit = defineEmits<{
  dateUpdate: [value: Temporal.PlainDate | null]
  clear: []
  // A click on the leading `icon` (`iconClick`).
  iconClick: [event: MouseEvent]
}>()
const model = defineModel<Temporal.PlainDate | null>({ default: null })

const { locale: uiLocale } = useLocale()
const localeCode = computed(() => props.locale ?? uiLocale.value.code)
const entryFormat = computed(() => (props.format ? dateEntryFormat(props.format) : dateEntryFormatFor(localeCode.value)))
const show = (d: Temporal.PlainDate | null) => formatDateEntry(d, entryFormat.value)

const open = ref(false)
const text = ref(show(model.value))

const sameDay = (a: Temporal.PlainDate | null, b: Temporal.PlainDate | null) => a === b || (!!a && !!b && a.equals(b))

// The date this field last settled on, which is what `dateUpdate` reports. NEVER re-read `model.value` for
// that: when the parent owns the v-model, writing it only emits `update:modelValue`, and the prop comes back
// on the parent's next render — so in the same tick `model.value` is still the OLD date, and a blur that just
// committed "5/12" would announce null.
let settled = model.value
// The date `dateUpdate` last carried, boxed so an announced null is told apart from nothing announced yet.
let announced: { date: Temporal.PlainDate | null } | undefined
watch(model, (d) => {
  // The parent set a different date, so whatever we announced before is no longer what's in the field.
  if (!sameDay(d, settled)) announced = undefined
  settled = d
  text.value = show(d)
})
// A new format redraws the date it holds.
watch(entryFormat, () => { text.value = show(settled) })

const inputCmp = useTemplateRef<{ inputRef: HTMLInputElement | null, $el: HTMLElement }>('inputCmp')
const panelId = useId()

function set(d: Temporal.PlainDate | null) {
  if (!sameDay(d, settled)) model.value = d
  settled = d
  text.value = show(d)
  return d
}

// What's typed becomes the value — or nothing, when it isn't a date. Leaving "5/32" in the box would show one
// thing while the form saved another. Untouched text keeps the date as it is, so passing through the field
// can't blank a stored date it wouldn't read back (a year before 1000).
function commitText() {
  return set(commitDateEntry(text.value, settled, useToday(), entryFormat.value))
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
  emit('dateUpdate', d)
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
    announce(commitText())
    return
  }
  // Tab commits here, so the text is settled before focus moves; the blur that follows announces it, once.
  if (e.key === 'Tab') {
    commitText()
    open.value = false
    return
  }
  if (e.key.length !== 1) return
  const today = useToday()
  // Shortcuts step from what's on screen, even if it hasn't been committed yet.
  const next = applyDateShortcut(e.key, parseDateEntry(text.value, today, entryFormat.value) ?? settled, today, entryFormat.value)
  if (!next) return
  e.preventDefault()
  announce(set(next))
  // Selected, so typing a date replaces the shortcut's rather than appending to it.
  nextTick(() => inputCmp.value?.inputRef?.select())
}

function clear() {
  const d = set(null)
  emit('clear')
  announce(d)
  focusInput()
}

// ── Calendar ──────────────────────────────────────────────────────────────────────────────────────────────
// CalendarDate is a bare year/month/day, so the conversion is by fields both ways.
const toCalendar = (d: Temporal.PlainDate) => new CalendarDate(d.year, d.month, d.day)

// The selection follows text typed but not yet committed, as the month and the shortcuts do, so the picker and the
// input never disagree; untouched or unreadable text falls back to the model.
const calendarValue = computed(() => {
  const day = parseDateEntry(text.value, useToday(), entryFormat.value) ?? model.value
  return day ? toCalendar(day) : undefined
})
// The month the calendar shows: the date in the box (typed or committed), else this month. Only read while
// the popover is open, which is only ever in the browser.
const calendarMonth = computed(() =>
  toCalendar(parseDateEntry(text.value, useToday(), entryFormat.value) ?? model.value ?? useToday()),
)

function onPick(v: unknown) {
  if (!v || typeof v !== 'object' || !('day' in v)) return
  const { year, month, day } = v as CalendarDay
  open.value = false
  announce(set(Temporal.PlainDate.from({ year, month, day })))
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
        v-model="text"
        type="text"
        autocomplete="off"
        v-bind="$attrs"
        :size="size"
        :icon="icon"
        :disabled="disabled"
        :placeholder="placeholder ?? entryFormat.pattern"
        :highlight="highlight || open"
        :ui="{ ...ui, root: `group ${ui?.root ?? ''}` }"
        @keydown="onKeydown"
        @blur="onBlur"
      >
        <template v-if="icon" #leading="{ ui: inputUi }">
          <UIcon :name="icon" data-slot="leadingIcon" :class="inputUi.leadingIcon({ class: ui?.leadingIcon })" @click="emit('iconClick', $event)" />
        </template>
        <template #trailing="{ ui: inputUi }">
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
        weekday-format="narrow"
        prevent-deselect
        class="p-2"
        @update:model-value="onPick"
      />
    </template>
  </UPopover>
</template>
