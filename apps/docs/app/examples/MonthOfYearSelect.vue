<script setup lang="ts">
const months = monthOfYearItems('en', { numbered: true })
const month = ref(12)
const year = ref<number | null>(2025)
</script>

<template>
  <div class="grid w-full max-w-xs grid-cols-2 gap-3">
    <UFormField label="Month">
      <USelect v-model="month" :items="months" class="w-full" />
    </UFormField>
    <UFormField label="Year">
      <ZYearField v-model="year" class="w-full" />
    </UFormField>
  </div>
</template>
