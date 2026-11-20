<script setup lang="ts">
const year = ref<number | null>(null)
</script>

<template>
  <div class="w-full max-w-xs">
    <UFormField label="Fiscal year" help="Type 2026 or 26, or press t, y, r, + or -">
      <ZYearField v-model="year" clearable class="w-32" />
    </UFormField>
  </div>
</template>
