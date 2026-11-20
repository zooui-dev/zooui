<script setup lang="ts">
/**
 * ZFilterSelect in the shapes a product's list toolbars use: statuses with counts and icons (and labels holding regular-
 * expression characters, for the search), owners picked by id with their own label and count fields, and a short
 * list with no search. Each shows what its model holds (`data-model`). Typed: the @vue-expect-error below fails the
 * typecheck if ZFilterSelect's model stopped following `value-key`.
 */
interface Status { value: string; label: string; count: number; icon: string; disabled?: boolean }
interface Person { id: number; name: string; open: number }
interface Kind { label: string }

const statusOptions: Status[] = [
  { value: 'open', label: 'Open', count: 12, icon: 'i-lucide-circle' },
  { value: 'progress', label: 'In progress', count: 5, icon: 'i-lucide-circle-dot' },
  { value: 'waiting', label: 'Waiting (on client)', count: 3, icon: 'i-lucide-circle-pause' },
  { value: 'review', label: 'Q&A [review]', count: 1, icon: 'i-lucide-circle-help' },
  { value: 'done', label: 'Done', count: 1240, icon: 'i-lucide-circle-check-big' },
  { value: 'archived', label: 'Archived', count: 0, icon: 'i-lucide-archive', disabled: true },
]
const people: Person[] = [
  { id: 1, name: 'Pat Brown', open: 4 },
  { id: 2, name: 'Sam Lee', open: 9 },
  { id: 3, name: 'Dana Cruz', open: 0 },
]
const kinds: Kind[] = [{ label: 'Invoice' }, { label: 'Estimate' }, { label: 'Credit note' }]

const statuses = ref<string[]>([])
const owners = ref<number[]>([2])
const chosenKinds = ref<Kind[]>([])

const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const
const STATES = [
  { name: 'empty', label: 'Owner', icon: undefined, model: [] },
  { name: 'empty-no-icon', label: 'Owner', icon: '', model: [] },
  { name: 'count', label: 'Status', icon: undefined, model: ['open', 'done'] },
  { name: 'value', label: 'Status', icon: undefined, model: ['progress'] },
  { name: 'value-no-icon', label: 'Kind', icon: '', model: ['review'] },
] as const
const sized = reactive<Record<string, string[]>>(Object.fromEntries(SIZES.flatMap((size) => STATES.map((s) => [`${size}-${s.name}`, [...s.model]]))))
</script>

<template>
  <section id="filter-select" class="flex flex-col gap-4">
    <h3 class="text-sm font-semibold text-highlighted">Filters</h3>
    <div class="flex flex-wrap items-start gap-2" role="toolbar" aria-label="Filters">
      <ZFilterSelect v-model="statuses" label="Status" :options="statusOptions" value-key="value" data-specimen="filter-status" />
      <ZFilterSelect v-model="owners" label="Owner" :options="people" value-key="id" label-key="name" count-key="open" icon="" data-specimen="filter-owner" />
      <ZFilterSelect v-model="chosenKinds" label="Kind" :options="kinds" :searchable="false" data-specimen="filter-kind" />
      <!-- The generic holds: with value-key="value" the model is the statuses' string values, so ids don't fit. -->
      <template v-if="false">
        <!-- @vue-expect-error owners holds numbers, not Status['value'] -->
        <ZFilterSelect v-model="owners" label="Status" :options="statusOptions" value-key="value" />
      </template>
    </div>
    <!-- Every size, every state of the button: it is Nuxt UI's button height for its size whatever it holds, so a
         toolbar lines up. The plain UButton is that height. -->
    <div class="flex flex-col gap-2" data-specimen="filter-sizes">
      <!-- A theme's own badge face (Forest's is mono), which the buttons' badges must not take. -->
      <UBadge label="A UBadge" color="neutral" variant="soft" class="self-start" data-badge-probe />
      <div v-for="size in SIZES" :key="size" class="flex flex-wrap items-start gap-2" :data-size="size">
        <UButton :size="size" variant="outline" color="neutral" icon="i-lucide-list-filter" label="Reference" data-reference />
        <ZFilterSelect v-for="state in STATES" :key="state.name" v-model="sized[`${size}-${state.name}`]!" :size="size" :label="state.label" :options="statusOptions" value-key="value" :icon="state.icon" :data-state="state.name" />
      </div>
    </div>
    <p class="text-xs text-muted">
      Status <output data-model="status">{{ JSON.stringify(statuses) }}</output>
      · Owner <output data-model="owner">{{ JSON.stringify(owners) }}</output>
      · Kind <output data-model="kind">{{ JSON.stringify(chosenKinds.map((k) => k.label)) }}</output>
    </p>
    <UButton data-reset-status label="Reset statuses to Done" color="neutral" variant="ghost" size="xs" class="self-start" @click="statuses = ['done']" />
  </section>
</template>
