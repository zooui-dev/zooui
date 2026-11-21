<script setup lang="ts">
const release = ref<ReturnType<typeof toPlainYearMonth>>(null)
</script>

<template>
  <div class="grid w-full max-w-xs gap-3">
    <UFormField label="German (MM.YYYY)">
      <ZMonthField v-model="release" locale="de" class="w-full" />
    </UFormField>
    <UFormField label="ISO (YYYY-MM)">
      <ZMonthField v-model="release" format="YYYY-MM" class="w-full" />
    </UFormField>
  </div>
</template>
