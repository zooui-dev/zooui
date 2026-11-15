<script setup lang="ts">
const due = ref<ReturnType<typeof useToday> | null>(null)
</script>

<template>
  <div class="grid w-full max-w-xs gap-3">
    <UFormField label="German (DD.MM.YYYY)">
      <ZDateField v-model="due" locale="de" class="w-full" />
    </UFormField>
    <UFormField label="ISO (YYYY-MM-DD)">
      <ZDateField v-model="due" format="YYYY-MM-DD" class="w-full" />
    </UFormField>
  </div>
</template>
