<script setup lang="ts">
/**
 * A data-loading component, as a product's dashboards are: its awaited setup makes it an async boundary, and Vue prefixes
 * the useId() ids inside a boundary with how many boundaries came before it. Every svg UIcon ahead of it is one
 * (it registers onServerPrefetch) — so if the client bundle strips onServerPrefetch, the client counts fewer, the
 * ids in here change at hydration, and the labels lose their inputs.
 */
const { data } = await useAsyncData('range', () => Promise.resolve({ from: '2026-01-01', to: '2026-03-31' }))
const from = ref(data.value?.from ?? '')
const to = ref(data.value?.to ?? '')
</script>

<template>
  <div class="flex flex-wrap gap-4">
    <UFormField data-field="from" label="From">
      <UInput v-model="from" type="date" />
    </UFormField>
    <UFormField data-field="to" label="To">
      <UInput v-model="to" type="date" />
    </UFormField>
  </div>
</template>
