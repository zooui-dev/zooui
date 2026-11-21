<script setup lang="ts">
// A website address field: Nuxt UI's UInput (placeholder "https://example.com") that tidies the address when it is
// committed, on blur or Enter. It is type="text" with inputmode="url" and autocomplete="url" (the phone keyboard and
// autofill of a url input) rather than type="url": text kept because it failed the check would also fail the
// browser's own url check, and inside a form that blocks submit with the browser's bubble before the form's rules
// and Nuxt UI's error styling ever run.
//
//   <UFormField label="Website" :error="websiteError">
//     <ZUrlInput v-model="form.website" v-model:error="websiteError" class="w-full" />
//   </UFormField>
//
// TYPING writes the text to the model as it is, keystroke by keystroke; nothing is rewritten until the address is
// committed. COMMITTING (commitWebAddress, utils/url-input.ts) trims it, puts `https://` in front (in place of an
// `http://`), and checks there is a real host with a top-level domain: an address is written back normalized,
// blank text becomes null, and anything else is kept, trimmed, with the field marked invalid until the next commit
// (or until the parent sets another value). `add-www` also puts `www.` in front of a two-label host; it is off by
// default, because many real hosts ("example.app") have no `www` name.
//
// Committing happens in a capture-phase blur on the wrapper, ahead of UInput's own blur, which is where a surrounding
// UForm validates the field: its rules see the normalized address, not the raw text. Enter commits too, before the
// form's implicit submit.
//
// THE ERROR. `error` (v-model:error) is the message while the address is invalid, `invalid-message` ("Invalid website
// address" unless set), and null otherwise; a parent may also set one of its own. In a UFormField, Nuxt UI's UInput
// takes aria-invalid, its error color and aria-describedby from the field, over anything passed to it: so while there
// is an error the field the UInput sees carries it (unless the field has one of its own). Bind `v-model:error` to the
// UFormField's `error` and the field shows the message; unbound, a screen reader still hears it, from a visually
// hidden message aria-describedby names. Outside a UFormField, they are passed to the UInput directly.
import { formFieldInjectionKey } from '@nuxt/ui/composables'
import { commitWebAddress } from '../utils/url-input'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Put `www.` in front of a two-label host ("example.com" → "www.example.com"). */
    addWww?: boolean
    /** The error message for text that isn't a website address. */
    invalidMessage?: string
    placeholder?: string
  }>(),
  { addWww: false, invalidMessage: 'Invalid website address', placeholder: 'https://example.com' },
)
const model = defineModel<string | null>({ default: null })
const error = defineModel<string | null>('error', { default: null })

// The value this field last wrote, so a different one from the parent (a reset, a loaded record) clears the error.
let written: string | null | undefined
watch(model, (v) => {
  if (v !== written) error.value = null
  written = undefined
})
function write(v: string | null) {
  written = v
  model.value = v
}

// The text in the box is what's committed, whether or not the parent took every keystroke into the model.
function commit(input: HTMLInputElement) {
  const { value, valid } = commitWebAddress(input.value, { addWww: props.addWww })
  write(value)
  input.value = value ?? ''
  error.value = valid ? null : props.invalidMessage
}

function onBlurCapture(e: FocusEvent) {
  if (e.target instanceof HTMLInputElement) commit(e.target)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.isComposing && e.target instanceof HTMLInputElement) commit(e.target)
}

const formField = inject(formFieldInjectionKey, undefined)
if (formField) {
  provide(formFieldInjectionKey, computed(() => {
    const f = formField.value
    return error.value && f && !f.error ? { ...f, error: error.value } : f
  }))
}
const messageId = useId()
// The hidden message's id, when one is needed: none while the UFormField shows an error of its own.
const describedById = computed(() => {
  if (!error.value) return undefined
  if (!formField?.value) return `${messageId}-error`
  return formField.value.error ? undefined : `${formField.value.ariaId}-error`
})
const attrs = useAttrs()
const invalidAttrs = computed(() => {
  if (!error.value || formField?.value) return {}
  const describedBy = [attrs['aria-describedby'], describedById.value].filter(Boolean).join(' ')
  return { 'color': 'error', 'highlight': true, 'aria-invalid': true, 'aria-describedby': describedBy }
})
</script>

<template>
  <div class="contents" @blur.capture="onBlurCapture">
    <UInput
      :model-value="model ?? undefined"
      type="text"
      inputmode="url"
      autocomplete="url"
      :placeholder="placeholder"
      v-bind="{ ...$attrs, ...invalidAttrs }"
      @update:model-value="write($event == null ? null : String($event))"
      @keydown="onKeydown"
    />
    <span v-if="describedById" :id="describedById" class="sr-only">{{ error }}</span>
  </div>
</template>
