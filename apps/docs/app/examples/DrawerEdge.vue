<script setup lang="ts">
const open = ref(false)
</script>

<template>
  <UButton color="neutral" variant="outline" @click="open = true">Filters</UButton>

  <ZDrawer v-model:open="open" color="info" title="Filters" description="Narrow the runs list.">
    <template #body>
      <p class="text-sm text-muted p-4">Filter controls go here.</p>
    </template>
  </ZDrawer>
</template>
