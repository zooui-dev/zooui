<script setup lang="ts">
/**
 * ZSelectMenu in each configuration tests/select-menu.spec.ts drives: a plain search menu, one without a search input
 * on objects (value-key, label-key), `multiple` with and without a search, grouped items with labels, separators and a
 * disabled item, open-on-focus, every switch off, and the same props, slots and events on a plain USelectMenu beside
 * a ZSelectMenu, to show they pass through unchanged. A text box before and after each one is where Tab lands.
 */
const FRUIT = ['Apple', 'Banana', 'Blueberry', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape']
const PEOPLE = [
  { id: 1, name: 'Ada Lovelace' },
  { id: 2, name: 'Alan Turing' },
  { id: 3, name: 'Grace Hopper' },
  { id: 4, name: 'Katherine Johnson' },
]
const GROUPED = [
  [{ type: 'label' as const, label: 'Fruit' }, { label: 'Apple' }, { label: 'Avocado', disabled: true }, { label: 'Cherry' }],
  [{ type: 'separator' as const }, { type: 'label' as const, label: 'Vegetables' }, { label: 'Asparagus' }, { label: 'Carrot' }],
]

const plain = ref('Cherry')
const people = ref<number | undefined>(3)
const many = ref<string[]>(['Cherry', 'Fig'])
const manyBare = ref<string[]>(['Date'])
const grouped = ref<{ label: string } | undefined>(undefined)
const entry = ref<string | undefined>(undefined)
const entryNext = ref<string | undefined>(undefined)
const off = ref('Cherry')

// Pass-through: the same props, slots and events on each.
const native = ref<number | undefined>(undefined)
const wrapped = ref<number | undefined>(undefined)
const nativeOpen = ref(false)
const wrappedOpen = ref(false)
const nativeChanges = ref(0)
const wrappedChanges = ref(0)
</script>

<template>
  <main class="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
    <section data-specimen="plain" class="flex flex-col gap-2">
      <label for="plain-before" class="text-sm text-muted">Before</label>
      <input id="plain-before" data-before class="rounded border border-default px-2">
      <ZSelectMenu v-model="plain" :items="FRUIT" aria-label="Fruit" data-menu class="w-60" />
      <input data-after aria-label="After" class="rounded border border-default px-2">
      <output data-value>{{ plain }}</output>
    </section>

    <section data-specimen="no-search" class="flex flex-col gap-2">
      <input data-before aria-label="Before" class="rounded border border-default px-2">
      <ZSelectMenu v-model="people" :items="PEOPLE" value-key="id" label-key="name" :search-input="false" aria-label="Person" data-menu class="w-60" />
      <input data-after aria-label="After" class="rounded border border-default px-2">
      <output data-value>{{ people }}</output>
    </section>

    <section data-specimen="multiple" class="flex flex-col gap-2">
      <input data-before aria-label="Before" class="rounded border border-default px-2">
      <ZSelectMenu v-model="many" :items="FRUIT" multiple aria-label="Fruits" data-menu class="w-60" />
      <input data-after aria-label="After" class="rounded border border-default px-2">
      <output data-value>{{ many.join(',') }}</output>
    </section>

    <section data-specimen="multiple-no-search" class="flex flex-col gap-2">
      <input data-before aria-label="Before" class="rounded border border-default px-2">
      <ZSelectMenu v-model="manyBare" :items="FRUIT" multiple :search-input="false" aria-label="Fruits, no search" data-menu class="w-60" />
      <input data-after aria-label="After" class="rounded border border-default px-2">
      <output data-value>{{ manyBare.join(',') }}</output>
    </section>

    <section data-specimen="grouped" class="flex flex-col gap-2">
      <input data-before aria-label="Before" class="rounded border border-default px-2">
      <ZSelectMenu v-model="grouped" :items="GROUPED" placeholder="Pick produce" aria-label="Produce" data-menu class="w-60" />
      <input data-after aria-label="After" class="rounded border border-default px-2">
      <output data-value>{{ grouped?.label ?? '' }}</output>
    </section>

    <section data-specimen="entry" class="flex flex-col gap-2">
      <input data-before aria-label="Before" class="rounded border border-default px-2">
      <ZSelectMenu v-model="entry" :items="FRUIT" open-on-focus placeholder="Fruit" aria-label="Entry fruit" data-menu class="w-60" />
      <ZSelectMenu v-model="entryNext" :items="FRUIT" open-on-focus placeholder="Another" aria-label="Entry fruit 2" data-menu-next class="w-60" />
      <input data-after aria-label="After" class="rounded border border-default px-2">
      <output data-value>{{ entry ?? '' }}|{{ entryNext ?? '' }}</output>
    </section>

    <section data-specimen="off" class="flex flex-col gap-2">
      <input data-before aria-label="Before" class="rounded border border-default px-2">
      <ZSelectMenu v-model="off" :items="FRUIT" :highlight-selected-on-open="false" :typeahead="false" :close-on-tab="false" aria-label="Fruit, plain keys" data-menu class="w-60" />
      <input data-after aria-label="After" class="rounded border border-default px-2">
      <output data-value>{{ off }}</output>
    </section>

    <section data-specimen="passthrough" class="grid grid-cols-2 gap-4">
      <div data-side="native" class="flex flex-col gap-2">
        <USelectMenu
          v-model="native" v-model:open="nativeOpen" :items="PEOPLE" value-key="id" label-key="name" placeholder="Choose someone"
          clear aria-label="Native person" data-menu class="w-60" @change="nativeChanges++"
        >
          <template #item-label="{ item }"><span data-item-label>{{ item.name.toUpperCase() }}</span></template>
          <template #leading><span data-leading>@</span></template>
        </USelectMenu>
        <output data-value>{{ native }}|{{ nativeOpen }}|{{ nativeChanges }}</output>
      </div>
      <div data-side="wrapped" class="flex flex-col gap-2">
        <ZSelectMenu
          v-model="wrapped" v-model:open="wrappedOpen" :items="PEOPLE" value-key="id" label-key="name" placeholder="Choose someone"
          clear aria-label="Wrapped person" data-menu class="w-60" @change="wrappedChanges++"
        >
          <template #item-label="{ item }"><span data-item-label>{{ item.name.toUpperCase() }}</span></template>
          <template #leading><span data-leading>@</span></template>
        </ZSelectMenu>
        <output data-value>{{ wrapped }}|{{ wrappedOpen }}|{{ wrappedChanges }}</output>
        <UButton label="Open from code" color="neutral" variant="outline" data-open-from-code @click="wrappedOpen = true" />
        <input data-after aria-label="After wrapped" class="rounded border border-default px-2">
      </div>
    </section>
  </main>
</template>
