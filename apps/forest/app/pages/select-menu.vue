<script setup lang="ts">
/**
 * ZSelectMenu on the Forest theme (tests/select-menu.spec.ts drives it): a data-entry row of open-on-focus menus
 * between text fields, filled from the keyboard alone, and a plain USelectMenu beside a ZSelectMenu with the same
 * props, which must paint alike on every scheme in light and dark. The `data-*` attributes are the spec's selectors.
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

const show = (v: string | undefined) => v || '—'
</script>

<template>
  <main class="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-8">
    <header class="flex flex-col gap-1">
      <h2 class="text-xl font-semibold text-highlighted">ZSelectMenu</h2>
      <p class="text-sm text-muted">
        Each section shows one ZSelectMenu configuration. The text boxes before and after each menu are where Tab lands,
        and "Value:" shows the bound model. The Playwright specs in tests/select-menu.spec.ts drive these sections.
      </p>
    </header>
    <section class="flex flex-col gap-3">
      <h3 class="font-semibold text-highlighted">Data entry</h3>
      <p class="text-sm text-muted">Tab through: menus open on focus, type to jump, Tab commits the highlighted item.</p>
      <form data-specimen="entry" class="flex flex-wrap items-end gap-3" @submit.prevent>
        <UFormField label="Payee"><UInput v-model="form.payee" placeholder="Who was paid" data-payee /></UFormField>
        <UFormField label="State">
          <ZSelectMenu v-model="form.state" :items="STATES" value-key="code" label-key="name" open-on-focus placeholder="Choose a state" data-state-menu class="w-48" />
        </UFormField>
        <UFormField label="Kind">
          <ZSelectMenu v-model="form.kind" :items="KINDS" open-on-focus :search-input="false" placeholder="Choose a kind" data-kind-menu class="w-40" />
        </UFormField>
        <UFormField label="Memo"><UInput v-model="form.memo" placeholder="A note" data-memo /></UFormField>
      </form>
      <p class="text-sm text-muted">
        Form value:
        <output data-form class="text-default">payee: {{ show(form.payee) }}, state: {{ show(form.state) }}, kind: {{ show(form.kind) }}, memo: {{ show(form.memo) }}</output>
      </p>
    </section>

    <section class="flex flex-col gap-3">
      <h3 class="font-semibold text-highlighted">Nuxt UI's USelectMenu beside ZSelectMenu</h3>
      <p class="text-sm text-muted">The same props on each: ZSelectMenu adds keyboard behavior, never a look, so the two should match on every scheme.</p>
      <div data-specimen="paint" class="flex flex-wrap gap-4">
        <UFormField label="Nuxt UI USelectMenu">
          <USelectMenu v-model="native" :items="KINDS" data-side="native" class="w-48" />
        </UFormField>
        <UFormField label="ZSelectMenu">
          <ZSelectMenu v-model="wrapped" :items="KINDS" data-side="wrapped" class="w-48" />
        </UFormField>
      </div>
    </section>
  </main>
</template>
