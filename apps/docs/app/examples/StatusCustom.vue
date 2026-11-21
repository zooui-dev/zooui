<script setup lang="ts">
// A product's own statuses. In a product they live once in app.config under `zooui.status.states`; here they are
// passed with `states` so the example stands alone.
const states = {
  draft: { label: 'Draft', icon: 'i-lucide-pencil-line', color: 'neutral' },
  review: { label: 'In review', icon: 'i-lucide-eye', color: 'info' },
  scheduled: { label: 'Scheduled', icon: 'i-lucide-calendar-clock', color: 'warning' },
  shipped: { label: 'Shipped', icon: 'i-lucide-rocket', color: 'success' },
  archived: { label: 'Archived', icon: 'i-lucide-archive', color: 'neutral' },
} as const
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-4 flex-wrap">
      <ZStatus v-for="(_, key) in states" :key="key" :state="key" :states="states" />
    </div>
    <div class="flex items-center gap-2 flex-wrap">
      <ZStatus v-for="(_, key) in states" :key="key" :state="key" :states="states" pill />
      <ZStatus state="retired" :states="states" pill />
    </div>
  </div>
</template>
