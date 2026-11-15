<script setup lang="ts">
/** Forest's six schemes as a menu of swatches, each painted with that scheme's own accent-500. */

const { id, scheme, schemes, setScheme } = useDocsScheme()

const items = computed(() => [schemes.map((s) => ({
  label: s.name,
  type: 'checkbox' as const,
  checked: s.id === id.value,
  onSelect: () => setScheme(s.id),
  slot: 'scheme' as const,
  swatch: s.swatch,
}))])
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'end' }" :ui="{ content: 'w-52' }">
    <UButton color="neutral" variant="outline" size="xs" trailing-icon="i-lucide-chevron-down" aria-label="Color scheme" data-scheme-picker>
      <span class="size-3 rounded-full ring-1 ring-black/10" :style="{ backgroundColor: scheme.swatch }" />
      <span class="hidden md:inline">{{ scheme.name }}</span>
    </UButton>
    <template #scheme-leading="{ item }">
      <span class="size-3.5 rounded-full ring-1 ring-black/10 shrink-0" :style="{ backgroundColor: item.swatch }" />
    </template>
  </UDropdownMenu>
</template>
