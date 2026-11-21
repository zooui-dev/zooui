<script setup lang="ts">
/**
 * ZMaskedInput (tests/masked-input.spec.ts drives it): the phone preset formatted on blur and as typed; the tax-ID
 * preset with its two masks and an action that waits for `isValid`; a mask list chosen by the first that fits, with
 * v-model:raw set from both sides; a letters-and-digits mask with an upper-casing token; a UForm whose rules see the
 * value the blur commit wrote; a field the product marks with an error; and a disabled one.
 */
const shown = (v: string | null | undefined) => (v === null ? 'null' : v === undefined ? 'undefined' : `"${v}"`)

const phone = ref<string | null>(null)
const phoneLive = ref<string | null>(null)

const taxId = ref<string | null>(null)
const taxRaw = ref<string | null>(null)
const taxField = useTemplateRef<{ isValid: boolean, complete: boolean }>('taxField')
const found = ref('')

const zip = ref<string | null>(null)
const zipRaw = ref<string | null>(null)

const UPPER = { A: { pattern: /[a-z]/i, transform: (c: string) => c.toUpperCase() } }
const code = ref<string | null>(null)

// The rule reads the state the field wrote; `seen` keeps what it saw last, so the blur-before-validation order shows.
const form = reactive({ phone: null as string | null })
const seen = ref<string[]>([])
function validate(s: typeof form) {
  seen.value.push(shown(s.phone))
  return s.phone && !isMaskComplete(s.phone, MASK_PRESETS.phone.mask) ? [{ name: 'phone', message: 'Enter a phone number like (555) 123-4567' }] : []
}
const submitted = ref('')

const errored = ref<string | null>('555')
const disabled = ref<string | null>('(555) 123-4567')
</script>

<template>
  <main class="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
    <header class="flex flex-col gap-2">
      <h1 class="text-2xl font-semibold">ZMaskedInput</h1>
      <p class="text-muted">
        A text input with a mask: <code>#</code> a digit, <code>A</code> a letter, <code>*</code> either, and literals
        between them, or a list of masks chosen as it is typed. The <code>phone</code> and <code>tax-id</code> presets
        are US formats. Each section shows what the parent holds: "model" is the v-model, "raw" the
        <code>v-model:raw</code> (the value without its literals), and "complete" the field's exposed
        <code>complete</code>. The "Field after" boxes are somewhere to Tab or click to, so the field is left.
      </p>
    </header>

    <section data-section="phone" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Phone, formatted on blur</h2>
      <p class="text-sm text-muted">Try this: type 5551234567 and press Tab: it becomes (555) 123-4567. Type +44 20 7946 0958 and Tab: it stays as typed, since it isn't a US number.</p>
      <UFormField label="Support phone">
        <ZMaskedInput v-model="phone" preset="phone" class="w-64" />
      </UFormField>
      <input data-after aria-label="Field after" placeholder="Field after" class="w-48 rounded border border-default px-2">
      <p class="text-sm">model: <output data-value class="text-default">{{ shown(phone) }}</output></p>
    </section>

    <section data-section="phone-live" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Phone, formatted as typed</h2>
      <p class="text-sm text-muted">Try this: type 5551234567; the parentheses and dash appear as you go. Put the caret after 555 and press Backspace: the 5 before ") " goes, and the caret stays put. Letters are refused.</p>
      <UFormField label="Store phone">
        <ZMaskedInput v-model="phoneLive" preset="phone" format-on="input" class="w-64" />
      </UFormField>
      <input data-after aria-label="Field after" placeholder="Field after" class="w-48 rounded border border-default px-2">
      <p class="text-sm">model: <output data-value class="text-default">{{ shown(phoneLive) }}</output></p>
    </section>

    <section data-section="tax-id" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Tax ID: SSN or EIN</h2>
      <p class="text-sm text-muted">Try this: type 123456789 for an SSN (123-45-6789). Clear it, type 12 then a dash: it switches to the EIN (12-), and the next seven digits complete it. Look up stays disabled until the value is whole (<code>isValid</code>).</p>
      <UFormField label="Vendor tax ID">
        <ZMaskedInput ref="taxField" v-model="taxId" v-model:raw="taxRaw" preset="tax-id" class="w-64" />
      </UFormField>
      <UButton label="Look up" :disabled="!taxField?.isValid" data-lookup class="self-start" @click="found = taxId ?? ''" />
      <p class="text-sm">model: <output data-value class="text-default">{{ shown(taxId) }}</output></p>
      <p class="text-sm">raw: <output data-raw class="text-default">{{ shown(taxRaw) }}</output></p>
      <p class="text-sm">complete: <output data-complete-readout class="text-default">{{ taxField?.isValid ?? false }}</output></p>
      <p class="text-sm">looked up: <output data-found class="text-default">{{ found }}</output></p>
    </section>

    <section data-section="zip" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">A mask list, chosen by the first that fits</h2>
      <p class="text-sm text-muted">Try this: type 12345 (five digits), then a sixth: it becomes 12345-6. Or type a dash after five digits. The buttons set the raw value from the parent.</p>
      <UFormField label="ZIP code">
        <ZMaskedInput v-model="zip" v-model:raw="zipRaw" :mask="['#####', '#####-####']" class="w-64" />
      </UFormField>
      <div class="flex gap-2">
        <UButton label="Set raw 941051234" color="neutral" variant="outline" data-set-raw @click="zipRaw = '941051234'" />
        <UButton label="Clear" color="neutral" variant="outline" data-clear @click="zip = null" />
      </div>
      <p class="text-sm">model: <output data-value class="text-default">{{ shown(zip) }}</output></p>
      <p class="text-sm">raw: <output data-raw class="text-default">{{ shown(zipRaw) }}</output></p>
    </section>

    <section data-section="code" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Letters and digits, upper-cased</h2>
      <p class="text-sm text-muted">Try this: type ab1234. The letters go in as AB, the dash is written for you, and a digit where a letter goes is refused.</p>
      <UFormField label="Product code">
        <ZMaskedInput v-model="code" mask="AA-####" :tokens="UPPER" placeholder="AB-1234" class="w-64" />
      </UFormField>
      <p class="text-sm">model: <output data-value class="text-default">{{ shown(code) }}</output></p>
    </section>

    <section data-section="form" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">In a UForm</h2>
      <p class="text-sm text-muted">Try this: type 5551234567 and press Tab. The form's rule checks the formatted value, so no error shows ("the rule saw" lists what it read). Type 555 and Tab: the error shows, and the field is marked.</p>
      <UForm :state="form" :validate="validate" class="flex flex-col gap-2" @submit="submitted = form.phone ?? ''">
        <UFormField name="phone" label="Contact phone">
          <ZMaskedInput v-model="form.phone" preset="phone" class="w-64" />
        </UFormField>
        <input data-after aria-label="Field after" placeholder="Field after" class="w-48 rounded border border-default px-2">
        <UButton type="submit" label="Save" class="self-start" data-submit />
      </UForm>
      <p class="text-sm">the rule saw: <output data-seen class="text-default">{{ seen.join(', ') }}</output></p>
      <p class="text-sm">saved: <output data-submitted class="text-default">{{ submitted }}</output></p>
    </section>

    <section data-section="errored" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">An error from the product</h2>
      <p class="text-sm text-muted">Try this: the field takes its error color and description from the UFormField.</p>
      <UFormField label="Fax" error="Enter a whole number">
        <ZMaskedInput v-model="errored" preset="phone" format-on="input" class="w-64" />
      </UFormField>
    </section>

    <section data-section="disabled" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Disabled</h2>
      <p class="text-sm text-muted">Try this: it can't be focused or typed into.</p>
      <UFormField label="Head office phone">
        <ZMaskedInput v-model="disabled" preset="phone" disabled class="w-64" />
      </UFormField>
    </section>
  </main>
</template>
