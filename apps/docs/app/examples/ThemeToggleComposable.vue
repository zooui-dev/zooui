<script setup lang="ts">
const { theme } = useZooTheme()
const themes = [...ZOO_THEMES]
</script>

<template>
  <div class="flex items-center gap-3">
    <ClientOnly>
      <USelect v-model="theme" :items="themes" class="w-32" aria-label="Theme" />
      <template #fallback><USelect :items="themes" class="w-32" disabled aria-label="Theme" /></template>
    </ClientOnly>
    <span class="text-sm text-muted">The same preference as the toggle in the header.</span>
  </div>
</template>
