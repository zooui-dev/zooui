<script setup lang="ts">
const ends = ref<ReturnType<typeof useToday> | null>(null)
</script>

<template>
  <div class="w-full max-w-xs">
    <UFormField label="Ends" help="Type 5/12, 0512 or 5/12/26, or press t, m, h, y, r, + or -">
      <ZDateField v-model="ends" clearable class="w-full" />
    </UFormField>
  </div>
</template>
