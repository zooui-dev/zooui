<script setup lang="ts">
const PROJECTS = ['Website redesign', 'Mobile app', 'Spring campaign', 'Warehouse move', 'Design system']
const query = ref('')
const shown = computed(() => PROJECTS.filter((p) => p.toLowerCase().includes(query.value.toLowerCase())))
</script>

<template>
  <div class="flex w-full max-w-xs flex-col gap-2">
    <ZSearchInput v-model="query" placeholder="Filter projects…" aria-label="Filter projects" />
    <ul class="text-sm">
      <li v-for="p in shown" :key="p">{{ p }}</li>
    </ul>
  </div>
</template>
