<script setup lang="ts">
const ends = ref<ReturnType<typeof useToday> | null>(null)
</script>

<template>
  <div class="w-full max-w-xs">
    <UFormField label="Ends" help="Tick the box to give it an end date">
      <ZOptionalDate v-model="ends" label="Has an end date" clearable class="w-full" />
    </UFormField>
  </div>
</template>
