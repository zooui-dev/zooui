<script setup lang="ts">
const options = [
  { value: 'open', label: 'Open', count: 12, icon: 'i-lucide-circle' },
  { value: 'progress', label: 'In progress', count: 5, icon: 'i-lucide-circle-dot' },
  { value: 'waiting', label: 'Waiting (on supplier)', count: 3, icon: 'i-lucide-circle-pause' },
  { value: 'done', label: 'Done', count: 1240, icon: 'i-lucide-circle-check-big' },
  { value: 'archived', label: 'Archived', count: 0, icon: 'i-lucide-archive', disabled: true },
]
const statuses = ref<string[]>(['open'])
</script>

<template>
  <div class="flex flex-col items-start gap-2">
    <ZFilterSelect v-model="statuses" label="Status" :options="options" value-key="value" />
    <p class="text-xs text-muted">v-model: <code>{{ JSON.stringify(statuses) }}</code></p>
  </div>
</template>
