<script setup lang="ts">
interface Person { id: number; name: string; open: number }
const people: Person[] = [
  { id: 1, name: 'Pat Brown', open: 4 },
  { id: 2, name: 'Sam Lee', open: 9 },
  { id: 3, name: 'Dana Cruz', open: 0 },
]
const kinds = [{ label: 'Invoice' }, { label: 'Estimate' }, { label: 'Credit note' }]
const owners = ref<number[]>([1, 2])
const chosen = ref<typeof kinds>([])
</script>

<template>
  <div class="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Filters">
    <ZFilterSelect v-model="owners" label="Owner" :options="people" value-key="id" label-key="name" count-key="open" icon="" />
    <ZFilterSelect v-model="chosen" label="Kind" :options="kinds" :searchable="false" />
  </div>
</template>
