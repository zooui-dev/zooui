<script setup lang="ts">
/**
 * ZSelectMenu on the Forest theme (tests/select-menu.spec.ts drives it): a data-entry row of open-on-focus menus
 * between text fields, filled from the keyboard alone, and a plain USelectMenu beside a ZSelectMenu with the same
 * props, which must paint alike on every scheme in light and dark.
 */
const STATES = [
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'NY', name: 'New York' },
  { code: 'TX', name: 'Texas' },
]
const KINDS = ['Invoice', 'Receipt', 'Statement']

const form = reactive({ payee: '', state: undefined as string | undefined, kind: undefined as string | undefined, memo: '' })
const native = ref('Receipt')
const wrapped = ref('Receipt')
</script>

<template>
  <main class="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
    <form data-specimen="entry" class="flex flex-wrap items-end gap-3" @submit.prevent>
      <UFormField label="Payee"><UInput v-model="form.payee" data-payee /></UFormField>
      <UFormField label="State">
        <ZSelectMenu v-model="form.state" :items="STATES" value-key="code" label-key="name" open-on-focus data-state-menu class="w-48" />
      </UFormField>
      <UFormField label="Kind">
        <ZSelectMenu v-model="form.kind" :items="KINDS" open-on-focus :search-input="false" data-kind-menu class="w-40" />
      </UFormField>
      <UFormField label="Memo"><UInput v-model="form.memo" data-memo /></UFormField>
      <output data-form>{{ form.payee }}|{{ form.state ?? '' }}|{{ form.kind ?? '' }}|{{ form.memo }}</output>
    </form>

    <section data-specimen="paint" class="flex gap-4">
      <USelectMenu v-model="native" :items="KINDS" aria-label="Native kind" data-side="native" class="w-48" />
      <ZSelectMenu v-model="wrapped" :items="KINDS" aria-label="Wrapped kind" data-side="wrapped" class="w-48" />
    </section>
  </main>
</template>
