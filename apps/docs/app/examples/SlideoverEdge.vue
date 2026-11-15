<script setup lang="ts">
const open = ref(false)
</script>

<template>
  <UButton color="neutral" variant="outline" @click="open = true">Run details</UButton>

  <ZSlideover v-model:open="open" color="primary" title="Run 4812" description="Started 09:41 on linux-2.">
    <template #body>
      <p class="text-sm text-muted">Logs, artifacts and timings for the run go here.</p>
    </template>
  </ZSlideover>
</template>
