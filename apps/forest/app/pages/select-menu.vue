<script setup lang="ts">
/**
 * ZSelectMenu on the Forest theme (tests/select-menu.spec.ts drives it): a data-entry row of open-on-focus menus
 * between text fields, filled from the keyboard alone; typeahead from the top of a list whose value sits lower down;
 * the focus ring beside a plain USelectMenu's; a UForm validating on change; and a plain USelectMenu beside a
 * ZSelectMenu with the same props, which must paint alike on every scheme in light and dark (but for ZSelectMenu's
 * focus ring on any focus). Each behavior in full is in apps/base/tests/select-menu.spec.ts. The `data-*` attributes
 * are the spec's selectors.
 */
const STATES = [
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'NY', name: 'New York' },
  { code: 'TX', name: 'Texas' },
]
const KINDS = ['Delivery', 'Pickup', 'Shipping']

const form = reactive({ customer: '', state: undefined as string | undefined, kind: undefined as string | undefined, memo: '' })
const native = ref('Pickup')
const wrapped = ref('Pickup')

const FRUIT = ['Apple', 'Banana', 'Blueberry', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape']
const STATE_NAMES = ['Alabama', 'Alaska', 'California', 'Colorado', 'Connecticut', 'Delaware']
const stateName = ref('Colorado')
const ringNative = ref('Cherry')
const ringWrapped = ref('Cherry')
const ringSearch = ref('Cherry')

// A form that validates only on change: a typeahead pick has to tell it.
const formState = reactive({ fruit: undefined as string | undefined })
const validate = (s: typeof formState) => (s.fruit === 'Banana' ? [{ name: 'fruit', message: 'Bananas are out of season' }] : [])

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
      <p class="text-sm text-muted">Try: Tab through from Customer. Menus open on focus; type to filter and Tab commits the highlighted item. On the Kind menu, pick one with Enter; then, with the menu closed and focus back on it, type s: Shipping, found from the top of the list.</p>
      <form data-specimen="entry" class="flex flex-wrap items-end gap-3" @submit.prevent>
        <UFormField label="Customer"><UInput v-model="form.customer" placeholder="Who placed the order" data-customer /></UFormField>
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
        <output data-form class="text-default">customer: {{ show(form.customer) }}, state: {{ show(form.state) }}, kind: {{ show(form.kind) }}, memo: {{ show(form.memo) }}</output>
      </p>
    </section>

    <section data-specimen="states" class="flex flex-col gap-3">
      <h3 class="font-semibold text-highlighted">Typeahead from the top</h3>
      <p class="text-sm text-muted">Try: focus the menu (Colorado is selected) and type c: California, the first C from the top. Type c again and again: Colorado, Connecticut, then California.</p>
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Field before"><UInput placeholder="Field before" data-before /></UFormField>
        <UFormField label="State">
          <ZSelectMenu v-model="stateName" :items="STATE_NAMES" data-menu class="w-48" />
        </UFormField>
        <UFormField label="Field after"><UInput placeholder="Field after" data-after /></UFormField>
      </div>
      <p class="text-sm text-muted">Value: <output data-value class="text-default">{{ stateName }}</output></p>
    </section>

    <section data-specimen="ring" class="flex flex-col gap-3">
      <h3 class="font-semibold text-highlighted">Focus ring</h3>
      <p class="text-sm text-muted">Try: click each menu and pick a fruit with the mouse. Focus comes back to the trigger: ZSelectMenu shows its ring, Nuxt UI's USelectMenu shows one only after a key. Tab in from "Field before" and both show it. A focused menu looks exactly like the focused text field. Open a ZSelectMenu, with a search or without: the ring stays while it is open, stays after Escape, and goes when you Tab away.</p>
      <div class="flex flex-wrap items-end gap-4">
        <UFormField label="Field before"><UInput placeholder="Field before" data-before /></UFormField>
        <UFormField label="Nuxt UI USelectMenu">
          <USelectMenu v-model="ringNative" :items="FRUIT" :search-input="false" data-ring-native class="w-48" />
        </UFormField>
        <UFormField label="ZSelectMenu">
          <ZSelectMenu v-model="ringWrapped" :items="FRUIT" :search-input="false" data-ring-wrapped class="w-48" />
        </UFormField>
        <UFormField label="ZSelectMenu with a search">
          <ZSelectMenu v-model="ringSearch" :items="FRUIT" data-ring-search class="w-48" />
        </UFormField>
      </div>
    </section>

    <section data-specimen="form" class="flex flex-col gap-3">
      <h3 class="font-semibold text-highlighted">In a UForm that validates on change</h3>
      <p class="text-sm text-muted">Try: focus the menu and type b: Banana, and the form flags it at once. Type b again: Blueberry, and the error clears.</p>
      <UForm :state="formState" :validate="validate" :validate-on="['change']" class="flex flex-wrap items-end gap-3">
        <UFormField label="Fruit" name="fruit">
          <ZSelectMenu v-model="formState.fruit" :items="FRUIT" placeholder="Choose a fruit" data-menu class="w-48" />
        </UFormField>
      </UForm>
      <p class="text-sm text-muted">Value: <output data-value class="text-default">{{ show(formState.fruit) }}</output></p>
    </section>

    <section class="flex flex-col gap-3">
      <h3 class="font-semibold text-highlighted">Nuxt UI's USelectMenu beside ZSelectMenu</h3>
      <p class="text-sm text-muted">Try: compare the two on every scheme; they should match. The one difference is focus: click each and pick with the mouse, and only ZSelectMenu keeps a ring on its trigger once focus comes back to it.</p>
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
