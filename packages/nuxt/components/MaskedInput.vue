<script setup lang="ts">
/**
 * A text input with a mask: "(555) 123-4567", "123-45-6789", "AB-1234", or any pattern of `#` digits, `A` letters,
 * `*` either and literals between them, or a list of patterns chosen as it is typed (by the separator typed, else the
 * first that fits). The rules are utils/masked-input.ts, and every one of them is a prop away:
 *
 *   <ZMaskedInput v-model="phone" preset="phone" />                    US phone, formatted on blur
 *   <ZMaskedInput v-model="taxId" preset="tax-id" />                   US SSN or EIN, formatted as typed
 *   <ZMaskedInput v-model="code" v-model:raw="digits" mask="####-####" />
 *
 * `format-on="input"` (the default without a preset) formats every keystroke, paste and deletion before the browser
 * applies it (`beforeinput`): only characters the mask takes get in, and the caret stays on its character as the
 * literals come and go. `format-on="blur"` takes the text as typed and formats it when the field is left, if it holds a
 * whole value and nothing else; otherwise it is left as typed, so a number written another way goes in as it is. The
 * commit runs in the capture phase of the field's change and blur events, before UInput's own handlers tell a
 * UFormField to validate, so a form's rules read the formatted value. Either way the model is `null` when empty.
 *
 * Everything else (id, size, color, placeholder, disabled, readonly, aria-*, class) falls through to the UInput.
 */
import {
  commitMasked, editMasked, isMaskComplete, MASK_PRESETS, MASK_TOKENS, masksOf, reformat, unmaskedValue,
  type Masked, type MaskEdit, type MaskSource, type MaskToken,
} from '../utils/masked-input'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  modelValue?: string | null
  /** The value without its literals ("5551234567"), for `v-model:raw`. Set from outside, it is formatted by the mask. */
  raw?: string | null
  /** A pattern or a list of them; a preset's when unset. */
  mask?: MaskSource
  /** Tokens the patterns use, added to `#`, `A` and `*`; one for the same character replaces it. */
  tokens?: Record<string, MaskToken>
  /** `phone` (US, on blur) or `tax-id` (US SSN or EIN, as typed): a mask, a `format-on` and the input's attributes. */
  preset?: keyof typeof MASK_PRESETS
  /** When the mask is written: as typed, or on blur. A preset's when unset, else `input`. */
  formatOn?: 'input' | 'blur'
}>()
const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  'update:raw': [value: string | null]
}>()
const attrs = useAttrs()

const preset = computed(() => (props.preset ? MASK_PRESETS[props.preset] : undefined))
const masks = computed(() => masksOf(props.mask ?? preset.value?.mask ?? [], props.tokens ? { ...MASK_TOKENS, ...props.tokens } : undefined))
const formatOn = computed(() => props.formatOn ?? preset.value?.formatOn ?? 'input')
const live = computed(() => formatOn.value === 'input' && masks.value.length > 0)
// a mask of digits alone brings up a number pad
const digitsOnly = computed(() => masks.value.length > 0 && masks.value.every((m) => m.slots.every((s) => !('token' in s) || s.token === MASK_TOKENS['#'])))
const inputAttrs = computed(() => ({ ...(digitsOnly.value ? { inputmode: 'numeric' } : {}), ...preset.value?.attrs, ...attrs }))

const field = useTemplateRef<{ inputRef: HTMLInputElement | null }>('field')
const input = () => field.value?.inputRef ?? null

/** The text for a value from outside: formatted as typed (live), as it is on blur. */
function shown(v: string | null | undefined): Masked | null {
  if (!v) return null
  return live.value ? reformat(v, v.length, masks.value) : null
}
function initial(): string {
  if (props.modelValue) return shown(props.modelValue)?.text ?? props.modelValue
  if (props.raw) return reformat(props.raw, props.raw.length, masks.value).text
  return ''
}
const text = ref(initial())
/** The mask a separator chose ("12-" → the EIN), held until the field is empty. */
let chosen: number | null = live.value ? reformat(text.value, text.value.length, masks.value).chosen : null

const modelOf = (t: string) => t || null
const rawOf = (t: string) => unmaskedValue(t, masks.value) || null
const unmasked = computed(() => rawOf(text.value))
/** The value is whole: every character its mask holds, written in it (on blur: as the commit will write it). */
const complete = computed(() => isMaskComplete(formatOn.value === 'blur' ? commitMasked(text.value, masks.value) : text.value, masks.value))

function hand(t: string) {
  if (modelOf(t) !== (props.modelValue ?? null)) emit('update:modelValue', modelOf(t))
  if (rawOf(t) !== (props.raw ?? null)) emit('update:raw', rawOf(t))
}

/** Show a text, with the caret where it goes (the end, for a whole new value). */
function put(next: { text: string, caret: number } | string) {
  const f = typeof next === 'string' ? { text: next, caret: next.length } : next
  text.value = f.text
  const el = input()
  if (!el) return
  if (el.value !== f.text) el.value = f.text
  if (el === document.activeElement) el.setSelectionRange(f.caret, f.caret)
}

// A value from outside (not this field's own, coming back) is shown, the mask it is written in held, and the raw
// value kept in step with it.
watch(() => props.modelValue, (v) => {
  if ((v ?? null) === modelOf(text.value)) return
  const r = shown(v)
  chosen = r?.chosen ?? null
  put(r?.text ?? v ?? '')
  if (unmasked.value !== (props.raw ?? null)) emit('update:raw', unmasked.value)
})
watch(() => props.raw, (v) => {
  if ((v ?? null) === unmasked.value) return
  const r = v ? reformat(v, v.length, masks.value) : null
  chosen = r?.chosen ?? null
  put(r?.text ?? '')
  hand(text.value)
})
// New masks reformat the text, but only when they really change: an inline `mask` or `tokens` is a new array or object
// on every render of the parent, and each keystroke re-renders it. The caret stays where it is.
const maskKey = computed(() => JSON.stringify(masks.value.map((m) => m.slots.map((s) => ('literal' in s ? s.literal : [s.token.pattern.source, s.token.pattern.flags, String(s.token.transform ?? '')])))))
watch(maskKey, () => {
  if (!live.value) return
  const el = input()
  const r = reformat(text.value, el && el === document.activeElement ? el.selectionStart ?? text.value.length : text.value.length, masks.value)
  chosen = r.chosen
  if (r.text === text.value) return
  put(r)
  hand(r.text)
})

// Typing. Each keystroke, paste or deletion is worked out in masked-input.ts before the browser applies it; whatever
// gets past that (an IME, undo, autofill, a cut) is tidied when UInput hands the text on.
const EDITS: Record<string, 'insert' | 'backward' | 'forward'> = {
  insertText: 'insert', insertFromPaste: 'insert', insertFromDrop: 'insert', insertReplacementText: 'insert',
  deleteContentBackward: 'backward', deleteContentForward: 'forward',
}
function onBeforeinput(e: InputEvent) {
  const op = EDITS[e.inputType]
  if (!live.value || e.isComposing || !op) return
  const el = e.target as HTMLInputElement
  const data = op === 'insert' ? e.data ?? e.dataTransfer?.getData('text/plain') : ''
  if (data === undefined || data === null) return
  e.preventDefault()
  const sel = { text: el.value, start: el.selectionStart ?? el.value.length, end: el.selectionEnd ?? el.value.length }
  const change: MaskEdit = op === 'insert' ? { insert: data } : { delete: op }
  const next = editMasked(sel, change, masks.value, chosen)
  if (!next) return // refused: nothing changes, the selection included
  chosen = next.chosen
  if (next.text === el.value) return el.setSelectionRange(next.caret, next.caret)
  el.value = next.text
  el.setSelectionRange(next.caret, next.caret)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

let composing = false
// UInput hands the text on from its input event, then tells a UFormField: the model is set in between.
function onUpdate() {
  const el = input()
  if (!el) return
  if (!live.value || composing) {
    text.value = el.value
    return hand(el.value)
  }
  const r = reformat(el.value, el.selectionStart ?? el.value.length, masks.value, chosen)
  chosen = r.chosen
  put(r)
  hand(r.text)
}
function onCompositionend() {
  composing = false
  onUpdate()
}

/** Write the mask now, as leaving the field does: a whole value formatted, anything else left as typed. */
function commit() {
  const el = input()
  const current = el?.value ?? text.value
  const next = masks.value.length ? commitMasked(current, masks.value) : current
  if (next === current) return
  chosen = live.value ? reformat(next, next.length, masks.value).chosen : null
  put(next)
  hand(next)
}
// In the capture phase, on the way down to the input: before UInput's own change and blur handlers ask a UFormField
// to validate (a changed field's change event comes just before its blur).
function onLeaveCapture(e: Event) {
  const el = e.target as HTMLInputElement | null
  if (el?.tagName !== 'INPUT' || el !== input() || el.readOnly || el.disabled) return
  commit()
}

defineExpose({ complete, isValid: complete, raw: unmasked, commit, inputRef: computed(input) })
</script>

<template>
  <div class="contents" @change.capture="onLeaveCapture" @blur.capture="onLeaveCapture">
    <UInput
      ref="field"
      :model-value="text"
      v-bind="inputAttrs"
      data-masked-input
      :data-complete="complete ? '' : undefined"
      @update:model-value="onUpdate"
      @beforeinput="onBeforeinput"
      @compositionstart="composing = true"
      @compositionend="onCompositionend"
    />
  </div>
</template>
