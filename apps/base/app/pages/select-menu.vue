<script setup lang="ts">
/**
 * ZSelectMenu in each configuration tests/select-menu.spec.ts drives: a plain search menu, typeahead from the top of a
 * list whose value sits lower down, the focus ring beside a plain USelectMenu's, a UForm validating on change, one
 * without a search input
 * on objects (value-key, label-key), `multiple` with and without a search, grouped items with labels, separators and a
 * disabled item, open-on-focus, every switch off, and the same props, slots and events on a plain USelectMenu beside
 * a ZSelectMenu, to show they pass through unchanged. A text box before and after each one is where Tab lands; the
 * `data-*` attributes are the spec's selectors.
 */
const FRUIT = ['Apple', 'Banana', 'Blueberry', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape']
const PEOPLE = [
  { id: 1, name: 'Ada Lovelace' },
  { id: 2, name: 'Alan Turing' },
  { id: 3, name: 'Grace Hopper' },
  { id: 4, name: 'Katherine Johnson' },
]
const GROUPED = [
  // Nuxt UI draws the line between groups; a separator belongs inside one, between two items.
  [{ type: 'label' as const, label: 'Fruit' }, { label: 'Apple' }, { type: 'separator' as const }, { label: 'Avocado', disabled: true }, { label: 'Cherry' }],
  [{ type: 'label' as const, label: 'Vegetables' }, { label: 'Asparagus' }, { label: 'Carrot' }],
]

const plain = ref('Cherry')
const people = ref<number | undefined>(3)
const many = ref<string[]>(['Cherry', 'Fig'])
const manyBare = ref<string[]>(['Date'])
const grouped = ref<{ label: string } | undefined>(undefined)
const entry = ref<string | undefined>(undefined)
const entryNext = ref<string | undefined>(undefined)
const off = ref('Cherry')
const AMOUNTS = ['10', '20', '30']
const amount = ref<number | undefined>(10)
const STATES = ['Alabama', 'Alaska', 'California', 'Colorado', 'Connecticut', 'Delaware']
const state = ref('Colorado')
const ringNative = ref('Cherry')
const ringWrapped = ref('Cherry')

// A form that validates only on change: a typeahead pick has to tell it.
const formState = reactive({ fruit: undefined as string | undefined })
const validate = (s: typeof formState) => (s.fruit === 'Banana' ? [{ name: 'fruit', message: 'Bananas are out of season' }] : [])

// Pass-through: the same props, slots and events on each.
const native = ref<number | undefined>(undefined)
const wrapped = ref<number | undefined>(undefined)
const nativeOpen = ref(false)
const wrappedOpen = ref(false)
const nativeChanges = ref(0)
const wrappedChanges = ref(0)

const personName = (id: number | undefined) => PEOPLE.find((p) => p.id === id)?.name ?? 'no one'
const show = (v: unknown) => (v == null || v === '' ? '—' : String(v))
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

    <section data-specimen="plain" class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">Search</h3>
      <p class="text-sm text-muted">Try: focus the menu and type b (Banana), b again (Blueberry), or bl without opening it; or open it, type "fi" and press Tab.</p>
      <input data-before aria-label="Field before" placeholder="Field before" class="rounded border border-default px-2">
      <UFormField label="Fruit">
        <ZSelectMenu v-model="plain" :items="FRUIT" data-menu class="w-60" />
      </UFormField>
      <input data-after aria-label="Field after" placeholder="Field after" class="rounded border border-default px-2">
      <p class="text-sm text-muted">Value: <output data-value class="text-default">{{ plain }}</output></p>
    </section>

    <section data-specimen="states" class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">Typeahead from the top</h3>
      <p class="text-sm text-muted">Try: focus the menu (Colorado is selected) and type c: California, the first C from the top. Type c again and again: Colorado, Connecticut, then California.</p>
      <input data-before aria-label="Field before" placeholder="Field before" class="rounded border border-default px-2">
      <UFormField label="State">
        <ZSelectMenu v-model="state" :items="STATES" data-menu class="w-60" />
      </UFormField>
      <input data-after aria-label="Field after" placeholder="Field after" class="rounded border border-default px-2">
      <p class="text-sm text-muted">Value: <output data-value class="text-default">{{ state }}</output></p>
    </section>

    <section data-specimen="ring" class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">Focus ring</h3>
      <p class="text-sm text-muted">Try: click each menu and pick a fruit with the mouse. Focus comes back to the trigger: ZSelectMenu shows its ring, Nuxt UI's USelectMenu shows one only after a key. Tab in from "Field before" and both show it.</p>
      <input data-before aria-label="Field before" placeholder="Field before" class="rounded border border-default px-2">
      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Nuxt UI USelectMenu">
          <USelectMenu v-model="ringNative" :items="FRUIT" :search-input="false" data-ring-native class="w-60" />
        </UFormField>
        <UFormField label="ZSelectMenu">
          <ZSelectMenu v-model="ringWrapped" :items="FRUIT" :search-input="false" data-ring-wrapped class="w-60" />
        </UFormField>
      </div>
    </section>

    <section data-specimen="form" class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">In a UForm that validates on change</h3>
      <p class="text-sm text-muted">Try: focus the menu and type b: Banana, and the form flags it at once. Type b again: Blueberry, and the error clears.</p>
      <UForm :state="formState" :validate="validate" :validate-on="['change']" data-form class="flex flex-col gap-2">
        <UFormField label="Fruit" name="fruit">
          <ZSelectMenu v-model="formState.fruit" :items="FRUIT" placeholder="Choose a fruit" data-menu class="w-60" />
        </UFormField>
      </UForm>
      <p class="text-sm text-muted">Value: <output data-value class="text-default">{{ show(formState.fruit) }}</output></p>
    </section>

    <section data-specimen="number" class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">v-model.number</h3>
      <p class="text-sm text-muted">Try: focus the menu and type 2. The items are the strings "10", "20" and "30", and the model gets the number 20, as a pick from the open menu would. "Type:" shows the model's JavaScript type.</p>
      <UFormField label="Amount">
        <ZSelectMenu v-model.number="amount" :items="AMOUNTS" data-menu class="w-60" />
      </UFormField>
      <p class="text-sm text-muted">Value: <output data-value class="text-default">{{ amount }}</output>, Type: <output data-type class="text-default">{{ typeof amount }}</output></p>
    </section>

    <section data-specimen="no-search" class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">No search input, objects with value-key</h3>
      <p class="text-sm text-muted">Try: open it, arrow down (or type k, or hover a name) and press Tab: the person is taken, and the value is their id.</p>
      <input data-before aria-label="Field before" placeholder="Field before" class="rounded border border-default px-2">
      <UFormField label="Person">
        <ZSelectMenu v-model="people" :items="PEOPLE" value-key="id" label-key="name" :search-input="false" data-menu class="w-60" />
      </UFormField>
      <input data-after aria-label="Field after" placeholder="Field after" class="rounded border border-default px-2">
      <p class="text-sm text-muted">Value: <output data-value class="text-default">{{ people }}</output> <span class="text-default">({{ personName(people) }})</span></p>
    </section>

    <section data-specimen="multiple" class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">Multiple</h3>
      <p class="text-sm text-muted">Try: focus it and type g: it opens with "g" in the search. Tab leaves the selection as it was.</p>
      <input data-before aria-label="Field before" placeholder="Field before" class="rounded border border-default px-2">
      <UFormField label="Fruits">
        <ZSelectMenu v-model="many" :items="FRUIT" multiple data-menu class="w-60" />
      </UFormField>
      <input data-after aria-label="Field after" placeholder="Field after" class="rounded border border-default px-2">
      <p class="text-sm text-muted">Value: <output data-value class="text-default">{{ many.join(',') }}</output></p>
    </section>

    <section data-specimen="multiple-no-search" class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">Multiple, no search</h3>
      <p class="text-sm text-muted">Try: focus it and type g: it opens on Grape. Tab leaves the selection as it was.</p>
      <input data-before aria-label="Field before" placeholder="Field before" class="rounded border border-default px-2">
      <UFormField label="Fruits">
        <ZSelectMenu v-model="manyBare" :items="FRUIT" multiple :search-input="false" data-menu class="w-60" />
      </UFormField>
      <input data-after aria-label="Field after" placeholder="Field after" class="rounded border border-default px-2">
      <p class="text-sm text-muted">Value: <output data-value class="text-default">{{ manyBare.join(',') }}</output></p>
    </section>

    <section data-specimen="grouped" class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">Grouped</h3>
      <p class="text-sm text-muted">Try: focus it and type a, then a again: Apple, then Asparagus (the disabled Avocado and the group labels are skipped).</p>
      <input data-before aria-label="Field before" placeholder="Field before" class="rounded border border-default px-2">
      <UFormField label="Produce">
        <ZSelectMenu v-model="grouped" :items="GROUPED" placeholder="Pick produce" data-menu class="w-60" />
      </UFormField>
      <input data-after aria-label="Field after" placeholder="Field after" class="rounded border border-default px-2">
      <p class="text-sm text-muted">Value: <output data-value class="text-default">{{ grouped?.label ?? '' }}</output></p>
    </section>

    <section data-specimen="entry" class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">Open on focus (data entry)</h3>
      <p class="text-sm text-muted">Try: click "Field before" and press Tab: the menu opens. Type "gr", Tab: Grape is taken and the next menu opens. Tab straight through leaves a field empty.</p>
      <input data-before aria-label="Field before" placeholder="Field before" class="rounded border border-default px-2">
      <UFormField label="Fruit">
        <ZSelectMenu v-model="entry" :items="FRUIT" open-on-focus placeholder="Choose a fruit" data-menu class="w-60" />
      </UFormField>
      <UFormField label="Another fruit">
        <ZSelectMenu v-model="entryNext" :items="FRUIT" open-on-focus placeholder="Choose another" data-menu-next class="w-60" />
      </UFormField>
      <input data-after aria-label="Field after" placeholder="Field after" class="rounded border border-default px-2">
      <p class="text-sm text-muted">Value: <output data-value class="text-default">first: {{ show(entry) }}, second: {{ show(entryNext) }}</output></p>
    </section>

    <section data-specimen="off" class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">Behavior switched off, for comparison</h3>
      <p class="text-sm text-muted">Try: type a letter (nothing happens), open it (the first item is highlighted), press Tab (focus stays in the menu): Nuxt UI's own keyboard.</p>
      <input data-before aria-label="Field before" placeholder="Field before" class="rounded border border-default px-2">
      <UFormField label="Fruit">
        <ZSelectMenu v-model="off" :items="FRUIT" :highlight-selected-on-open="false" :typeahead="false" :close-on-tab="false" data-menu class="w-60" />
      </UFormField>
      <input data-after aria-label="Field after" placeholder="Field after" class="rounded border border-default px-2">
      <p class="text-sm text-muted">Value: <output data-value class="text-default">{{ off }}</output></p>
    </section>

    <section data-specimen="passthrough" class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">USelectMenu beside ZSelectMenu</h3>
      <p class="text-sm text-muted">Try: open each, pick a name, clear it. Same props, slots (#leading, #item-label), v-model:open, @change and clear: they should behave and look alike.</p>
      <div class="grid grid-cols-2 gap-4">
        <div data-side="native" class="flex flex-col gap-2">
          <UFormField label="Nuxt UI USelectMenu">
            <USelectMenu
              v-model="native" v-model:open="nativeOpen" :items="PEOPLE" value-key="id" label-key="name" placeholder="Choose someone"
              clear data-menu class="w-60" @change="nativeChanges++"
            >
              <template #item-label="{ item }"><span data-item-label>{{ item.name.toUpperCase() }}</span></template>
              <template #leading><span data-leading>@</span></template>
            </USelectMenu>
          </UFormField>
          <p class="text-sm text-muted"><output data-value class="text-default">value: {{ show(native) }}, open: {{ nativeOpen }}, changes: {{ nativeChanges }}</output></p>
        </div>
        <div data-side="wrapped" class="flex flex-col gap-2">
          <UFormField label="ZSelectMenu">
            <ZSelectMenu
              v-model="wrapped" v-model:open="wrappedOpen" :items="PEOPLE" value-key="id" label-key="name" placeholder="Choose someone"
              clear data-menu class="w-60" @change="wrappedChanges++"
            >
              <template #item-label="{ item }"><span data-item-label>{{ item.name.toUpperCase() }}</span></template>
              <template #leading><span data-leading>@</span></template>
            </ZSelectMenu>
          </UFormField>
          <p class="text-sm text-muted"><output data-value class="text-default">value: {{ show(wrapped) }}, open: {{ wrappedOpen }}, changes: {{ wrappedChanges }}</output></p>
          <UButton label="Open from code" color="neutral" variant="outline" data-open-from-code class="self-start" @click="wrappedOpen = true" />
          <input data-after aria-label="Field after" placeholder="Field after" class="rounded border border-default px-2">
        </div>
      </div>
    </section>
  </main>
</template>
