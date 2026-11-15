<script setup lang="ts" generic="T extends string | number | DecimalLike | null | undefined">
/**
 * One number input for money, percent, count and hours, so every figure looks and moves the same,
 * formatting as it is typed. Layout, in every unit: the currency mark (and any
 * `prefix`) on the left, the value right-aligned, then the unit slot (`%`, `hrs` and any `suffix`; kept empty but the
 * same width for money and counts, so values line up in a column), then its own up/down chevrons. The marks stay out
 * of the text, so typing only ever meets digits.
 *
 * Typing is rebuilt keystroke by keystroke in number-format.ts: the locale's grouping (12,345; de 12.345), one decimal
 * mark, the caret kept on its digit as separators come and go. A commit (blur, Enter, Tab) clamps to min/max and rounds
 * to the decimal places (money: 2). The chevrons and ArrowUp/ArrowDown move by `step` from whatever is there, never
 * snapping to multiples; `:spin="false"` takes both away. `calc` takes `+ - * /` expressions (number-calc.ts), shows
 * the result underneath while focused and puts it in on commit or `evaluate()`. `freeform` keeps it a text box, for a
 * field that takes "$125,000" as typed and tidies it itself: it nudges the same.
 *
 * The model keeps the caller's kind: a string, a number, or a decimal.js Decimal built with the caller's own class.
 * The step, decimal places, currency and locale come from the props, then the product's app.config
 * (`zooui.numberInput`), then number-input.ts's neutral defaults. Everything else (id, size, color, highlight,
 * placeholder, inputmode, disabled, readonly, aria-*) falls through to the UInput.
 */
import { calcPlaces, containsOperator, editExpression, evaluate as evaluateExpression, reformatExpression } from './number-calc'
import {
  D, committed, decimalClass, display, edit, figureOf, fixedFigure, holds, kindOf, outside, readHeld, readModel, reformat, relocalize, shownCommitted,
  symbols, toDec, toModel,
  type Dec, type DecimalClass, type DecimalLike, type Edit, type Field, type ModelKind,
} from './number-format'
import {
  currencySymbol, DEFAULTS, nudged, PLAIN_NUMBER, readFigure, resolvePlaces, stepLabel, SUFFIX, writeFigure, type NumberInputConfig, type NumberUnit,
} from './number-input'

const props = withDefaults(defineProps<{
  modelValue: T
  unit?: NumberUnit
  step?: number
  freeform?: boolean
  min?: number | string
  max?: number | string
  /** ISO 4217 code for `unit="money"` (default: app.config, then USD). */
  currency?: string
  /** BCP 47 locale for the grouping and decimal marks, the currency symbol and the chevrons' labels (default:
   *  app.config, then en-US). */
  locale?: string
  /** The chevrons and ArrowUp/ArrowDown; `false` takes both away. */
  spin?: boolean
  /** Decimal places written on commit (default: app.config, then 2 for money, 0 otherwise). */
  minFractionDigits?: number
  /** Decimal places rounded to on commit, and the most that can be typed (default: app.config, then 2 for money,
   *  none otherwise). */
  maxFractionDigits?: number
  /** Text before the value, beside the currency mark. */
  prefix?: string
  /** Text after the value, beside the unit mark. */
  suffix?: string
  /** Select the whole value on focus (default: on in calc). */
  highlightOnFocus?: boolean
  /** Take `+ - * /` expressions, worked out on commit. */
  calc?: boolean
  /** Commit (clamp, round, work out an expression) on blur; `false` for a grid editor that calls `evaluate()`. */
  commitOnBlur?: boolean
  /** The kind to hand back when the model starts empty: a `Decimal` v-model that can be null needs `decimal`. */
  modelType?: ModelKind
  ui?: Record<string, string>
}>(), { spin: true, highlightOnFocus: undefined, commitOnBlur: true })
// T is the caller's kind, so a `Ref<Decimal | null>` takes what comes back; empty is `null` (a string model gets '').
const emit = defineEmits<{ 'update:modelValue': [value: T | null] }>()
const attrs = useAttrs()
const config = useAppConfig() as { zooui?: { numberInput?: NumberInputConfig } }

const unit = computed<NumberUnit>(() => props.unit ?? 'count')
const own = computed(() => config.zooui?.numberInput ?? {})
const step = computed(() => props.step ?? own.value.steps?.[unit.value] ?? DEFAULTS.steps[unit.value])
const currency = computed(() => props.currency ?? own.value.currency ?? DEFAULTS.currency)
const locale = computed(() => props.locale ?? own.value.locale ?? DEFAULTS.locale)
const symbol = computed(() => currencySymbol(locale.value, currency.value))
const label = computed(() => stepLabel(unit.value, step.value, locale.value, currency.value))
const sym = computed(() => symbols(locale.value))
const places = computed(() => {
  const set = own.value.fractionDigits?.[unit.value]
  return resolvePlaces({ min: props.minFractionDigits ?? set?.min, max: props.maxFractionDigits ?? set?.max }, DEFAULTS.places[unit.value])
})
const format = computed(() => ({
  symbols: sym.value,
  places: places.value,
  negative: props.min === undefined || props.min === '' || new D(props.min).isNeg(),
}))
// calc rounds its result once, on commit: to the field's places, or ten where it has no maximum
const bounds = computed(() => ({ min: props.min, max: props.max, places: props.calc ? calcPlaces(places.value) : places.value }))
const highlight = computed(() => props.highlightOnFocus ?? props.calc)

// A disabled or read-only field can't be nudged or committed, by its chevrons or its keys.
const disabled = computed(() => [attrs.disabled, attrs.readonly].some((a) => a === '' || !!a))

// The caller's kind, kept through an empty spell, and its Decimal class (so its `instanceof` holds).
let remembered: ModelKind | undefined
let cls: DecimalClass | undefined
watch(() => props.modelValue, (v) => {
  remembered = kindOf(v) ?? remembered
  if (remembered === 'decimal' && v) cls = decimalClass(v as DecimalLike)
}, { immediate: true })
const kind = () => kindOf(props.modelValue) ?? props.modelType ?? remembered ?? 'string'
const model = (figure: string | null) => toModel(figure, kind(), cls) as T | null

/** The text for a model value at rest. A string this can't read (freeform's "forty") is shown as it is. */
function shown(v: T): string {
  if (props.freeform) return String(v ?? '')
  const d = readModel(v)
  return d === null ? (kindOf(v) === 'string' ? String(v) : '') : display(d, sym.value, places.value)
}

const text = ref(shown(props.modelValue))
const focused = ref(false)
// What this field last handed back, until the model's next change: that change coming back as it is the field's own
// typing, not news to show. Any change uses it up, so a parent's 3 and then 2 again after the field's 2 both show.
const NONE = Symbol('none')
let emitted: unknown = NONE
watch(() => props.modelValue, (v) => {
  const own = v === emitted
  emitted = NONE
  if (own) return
  text.value = shown(v)
  validity(props.freeform ? null : readHeld(v, sym.value))
})
watch([sym, places], ([now], [before]) => {
  if (!focused.value) return void (text.value = shown(props.modelValue))
  // mid-edit, the text is rewritten in the new locale's marks, so it is never read with marks it wasn't typed in
  const el = input()
  if (props.freeform || now === before || !el) return
  const moved = relocalize({ text: text.value, caret: el.selectionStart ?? text.value.length }, before, now)
  put(props.calc ? reformatExpression(moved.text, moved.caret, now) : reformat(moved.text, moved.caret, format.value))
})

function hand(v: T | null) {
  emitted = v
  emit('update:modelValue', v)
}

const field = useTemplateRef<{ inputRef: HTMLInputElement | null }>('field')
const input = () => field.value?.inputRef ?? null

/** Show a text, with the caret where it goes (the end, for a whole new value). */
function put(next: Field | string) {
  const f = typeof next === 'string' ? { text: next, caret: next.length } : next
  text.value = f.text
  const el = input()
  if (!el) return
  if (el.value !== f.text) el.value = f.text
  if (el === document.activeElement) el.setSelectionRange(f.caret, f.caret)
}

const lead = computed(() => `${props.prefix ?? ''}${unit.value === 'money' ? symbol.value : ''}`)
const trail = computed(() => `${SUFFIX[unit.value]}${props.suffix ?? ''}`)
/** A value with its marks, as the preview and a screen reader say it: "$1,200.00", "12.5%", "40 hrs". */
const marked = (t: string) => `${lead.value}${t}${trail.value && unit.value === 'hours' ? ' ' : ''}${trail.value}`

const n = (v: Dec) => display(v, sym.value, { min: 0 })
/** Out of range, the field is :invalid (a form won't submit it) until a commit brings it back. */
function validity(value: Dec | null) {
  const off = outside(value, props.min, props.max)
  input()?.setCustomValidity(off > 0 ? `At most ${n(new D(props.max!))}` : off < 0 ? `At least ${n(new D(props.min!))}` : '')
}
/** The value the field holds now, for its range mark: what is being typed, else the model. At rest the text is
 *  rounded for display (0.005 shows 0.01 at two places), so it is the model that says whether the value is in range. */
function current(): Dec | null {
  if (props.freeform) return null
  if (props.calc || !focused.value) return readHeld(props.modelValue, sym.value)
  return toDec(figureOf(text.value, sym.value))
}
// a model that arrives out of range is marked so too, from the first render, and the mark follows the bounds
onMounted(() => validity(current()))
watch(() => [props.min, props.max], () => validity(current()))

// Typing. Each keystroke, paste or deletion is worked out in number-format.ts (or number-calc.ts) before the browser
// applies it; whatever gets past that (an IME, undo, autofill, a cut) is tidied by the input event after it.
const EDITS: Record<string, 'insert' | 'backward' | 'forward'> = {
  insertText: 'insert', insertFromPaste: 'insert', deleteContentBackward: 'backward', deleteContentForward: 'forward',
}
function onBeforeinput(e: InputEvent) {
  const op = EDITS[e.inputType]
  if (props.freeform || e.isComposing || !op) return
  const el = e.target as HTMLInputElement
  const data = op === 'insert' ? e.data ?? e.dataTransfer?.getData('text/plain') : ''
  if (data === undefined || data === null) return
  e.preventDefault()
  const sel = { text: el.value, start: el.selectionStart ?? el.value.length, end: el.selectionEnd ?? el.value.length }
  const change: Edit = op === 'insert' ? { insert: data } : { delete: op }
  const next = props.calc ? editExpression(sel, change, sym.value) : edit(sel, change, format.value)
  if (!next) return // refused: nothing changes, the selection included
  if (next.text === el.value) return el.setSelectionRange(next.caret, next.caret)
  el.value = next.text
  el.setSelectionRange(next.caret, next.caret)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

// (an IME's text is tidied once it is composed: compositionend comes here too)
function onInput(e: Event) {
  if ((e as InputEvent).isComposing) return
  const el = e.target as HTMLInputElement
  if (props.freeform) {
    text.value = el.value
    return hand(el.value as unknown as T)
  }
  const caret = el.selectionStart ?? el.value.length
  put(props.calc ? reformatExpression(el.value, caret, sym.value) : reformat(el.value, caret, format.value))
  if (props.calc) return
  // the model follows the typing (rounded and clamped only on commit); out of range meanwhile, the field is :invalid
  const figure = figureOf(text.value, sym.value)
  validity(toDec(figure))
  if (!holds(props.modelValue, figure)) hand(model(figure))
}

/**
 * Commit what is typed: an expression worked out, clamped to min/max, rounded to the decimal places, handed back and
 * shown in full. An expression that isn't one ("678+", "5/0") leaves the field empty. Returns the model's value.
 */
function evaluate() {
  if (props.freeform || disabled.value) return props.modelValue ?? null
  const value = committed(props.calc ? evaluateExpression(text.value, sym.value) : toDec(figureOf(text.value, sym.value)), bounds.value)
  validity(value)
  put(shownCommitted(value, sym.value, places.value))
  const figure = value === null ? null : fixedFigure(value, places.value)
  if (holds(props.modelValue, figure)) return props.modelValue ?? null
  const next = model(figure)
  hand(next)
  return next
}

function nudge(direction: 1 | -1) {
  if (disabled.value || !props.spin) return
  const o = { step: step.value, min: props.min, max: props.max }
  if (props.freeform) {
    // what is there isn't a figure (freeform: one `readFigure` can't read): it is never overwritten
    const typed = readFigure(text.value, { symbol: symbol.value, symbols: sym.value, prefix: props.prefix, suffix: props.suffix })
    if (typed !== '' && !PLAIN_NUMBER.test(typed)) return
    const figure = nudged(toDec(typed || null), direction, o).toFixed()
    // written in the field's own marks, so the next nudge reads the same value back; a string model gets that text
    const written = writeFigure(figure, sym.value)
    put(written)
    return hand(kind() === 'string' ? written as unknown as T : model(figure))
  }
  const current = props.calc ? evaluateExpression(text.value, sym.value) : toDec(figureOf(text.value, sym.value))
  if (current === null && figureOf(text.value, sym.value) !== null) return
  const next = committed(nudged(current, direction, o), bounds.value)!
  validity(next)
  put(shownCommitted(next, sym.value, places.value))
  const figure = fixedFigure(next, places.value)
  if (!holds(props.modelValue, figure)) hand(model(figure))
}

function onKeydown(e: KeyboardEvent) {
  // an IME's own Enter (and arrows) choose what it is composing: they aren't the field's
  if (e.isComposing || e.keyCode === 229) return
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault()
    nudge(e.key === 'ArrowUp' ? 1 : -1)
  } else if (e.key === 'Enter' || e.key === 'Tab') evaluate()
}

// Select-all on focus. A click's own caret would undo it, so a click that focuses selects again on mouseup.
let clicked = false
function onFocus(e: FocusEvent) {
  focused.value = true
  if (highlight.value && !disabled.value) (e.target as HTMLInputElement).select()
}
function onMousedown(e: MouseEvent) {
  clicked = e.target !== document.activeElement
}
function onMouseup(e: MouseEvent) {
  if (clicked && highlight.value && !disabled.value) {
    e.preventDefault()
    ;(e.target as HTMLInputElement).select()
  }
  clicked = false
}
function onBlur() {
  focused.value = false
  if (props.commitOnBlur) evaluate()
}

/** calc's result while focused, as it will go in. */
const preview = computed(() => {
  if (!props.calc || props.freeform || !focused.value || !containsOperator(text.value)) return null
  const value = committed(evaluateExpression(text.value, sym.value), bounds.value)
  return value === null ? null : marked(shownCommitted(value, sym.value, places.value))
})

// A spinbutton, with its range and value, while it spins; a plain text box (no aria-value*) when it doesn't.
const aria = computed(() => {
  if (!props.spin) return {}
  const figure = props.freeform ? readFigure(text.value, { symbol: symbol.value, symbols: sym.value, prefix: props.prefix, suffix: props.suffix }) : null
  const now = props.calc ? readModel(props.modelValue) : props.freeform ? (PLAIN_NUMBER.test(figure!) ? toDec(figure) : null) : toDec(figureOf(text.value, sym.value))
  return {
    'role': 'spinbutton',
    'aria-valuemin': props.min === '' ? undefined : props.min,
    'aria-valuemax': props.max === '' ? undefined : props.max,
    'aria-valuenow': now?.toFixed(),
    'aria-valuetext': text.value && !props.freeform ? marked(text.value) : undefined,
  }
})

// Room for the marks, in the input's own padding so the value never runs under them: a mark character is about half
// a rem (text-xs). Start: the leading marks ("$" is narrow, wider for "kr" or a prefix). End: the unit slot (the
// percent sign's width when empty, hours' wider) and the chevrons.
const slot = computed(() => Math.max(unit.value === 'hours' ? 1.5 : 0.75, trail.value.length * 0.5))
const room = computed(() => ({
  '--zni-start': lead.value ? `${1 + 0.5 * lead.value.length}rem` : undefined,
  '--zni-end': `${slot.value + (props.spin ? 2 : 0.875)}rem`,
}))
const inputUi = computed(() => ({
  ...props.ui,
  base: ['text-right tabular-nums pe-(--zni-end)', lead.value ? 'ps-(--zni-start)' : '', props.ui?.base].filter(Boolean).join(' '),
  leading: ['ps-2.5', props.ui?.leading].filter(Boolean).join(' '),
  trailing: ['pe-1.5', props.ui?.trailing].filter(Boolean).join(' '),
}))

defineExpose({ evaluate, inputRef: computed(input) })
</script>

<template>
  <UInput
    ref="field"
    :model-value="text"
    type="text"
    :inputmode="freeform || calc ? undefined : 'decimal'"
    data-number-input
    :data-unit="unit"
    :style="room"
    v-bind="aria"
    :ui="inputUi"
    @beforeinput="onBeforeinput"
    @input="onInput"
    @compositionend="onInput"
    @keydown="onKeydown"
    @focus="onFocus"
    @blur="onBlur"
    @mousedown="onMousedown"
    @mouseup="onMouseup"
  >
    <output
      v-if="calc && !freeform"
      aria-live="polite"
      class="pointer-events-none absolute inset-x-0 top-full z-10 mt-1 flex justify-between rounded-sm bg-inverted px-1.5 py-0.5 text-xs text-inverted tabular-nums shadow-sm"
      :class="preview ? '' : 'invisible'"
      data-number-preview
    >
      <span><span class="sr-only">Result</span><span aria-hidden="true">=</span></span>
      <span>{{ preview }}</span>
    </output>
    <template v-if="lead" #leading><span class="text-xs whitespace-nowrap text-dimmed" data-number-mark="lead">{{ lead }}</span></template>
    <template #trailing>
      <span class="flex items-center gap-0.5">
        <span class="text-xs whitespace-nowrap text-dimmed" :style="{ width: `${slot}rem` }" aria-hidden="true" data-number-mark="unit">{{ trail }}</span>
        <span v-if="spin" class="flex flex-col print:hidden">
          <button
            v-for="d in ([1, -1] as const)"
            :key="d"
            type="button"
            tabindex="-1"
            :disabled="disabled"
            class="grid h-3 w-4 place-items-center text-dimmed hover:text-default disabled:pointer-events-none"
            :aria-label="`${d > 0 ? 'Add' : 'Subtract'} ${label}`"
            @mousedown.prevent
            @click="nudge(d)"
          >
            <UIcon :name="d > 0 ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-3" />
          </button>
        </span>
      </span>
    </template>
  </UInput>
</template>
