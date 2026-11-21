<script setup lang="ts">
const period = ref<ReturnType<typeof toPlainYearMonth>>(null)
</script>

<template>
  <div class="w-full max-w-xs">
    <UFormField label="Period" help="Type 5/26, 05/2026, 2026-05 or 2026, or press t, m, h, y, r, + or -">
      <ZMonthField v-model="period" clearable class="w-full" />
    </UFormField>
  </div>
</template>
