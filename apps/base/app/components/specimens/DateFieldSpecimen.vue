<script setup lang="ts">
/**
 * ZDateField in a product: labeled fields in a data-loading component, as a product's dashboards and
 * filters are. The awaited setup makes this an async boundary, behind the page's svg icons and each field's own
 * calendar icon, so a client bundle that stripped onServerPrefetch would hand these fields different useId() ids
 * than the server and their labels would lose them (DateRange.vue). A field that mounts in the browser only is on its
 * own page (pages/date-field-later.vue).
 */
import { Temporal } from 'temporal-polyfill/implementation'

const { data } = await useAsyncData('date-field', () => Promise.resolve({ starts: '2026-05-12', ends: null as string | null }))
const starts = ref<Temporal.PlainDate | null>(data.value?.starts ? Temporal.PlainDate.from(data.value.starts) : null)
const ends = ref<Temporal.PlainDate | null>(data.value?.ends ? Temporal.PlainDate.from(data.value.ends) : null)
</script>

<template>
  <section id="date-field" class="flex flex-col gap-4">
    <div class="flex flex-wrap gap-4">
      <UFormField data-date-field="starts" label="Starts">
        <ZDateField v-model="starts" clearable />
      </UFormField>
      <UFormField data-date-field="ends" label="Ends">
        <ZDateField v-model="ends" clearable />
      </UFormField>
    </div>
  </section>
</template>
