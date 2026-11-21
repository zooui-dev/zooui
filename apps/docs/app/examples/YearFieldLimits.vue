<script setup lang="ts">
const year = ref<number | null>(2025)
const error = ref<string>()
</script>

<template>
  <div class="w-full max-w-xs">
    <UFormField label="Budget year" :error="error" help="2020 to 2030: try typing 2031">
      <ZYearField v-model="year" :min-value="2020" :max-value="2030" class="w-32" @invalid="(problem) => (error = problem?.message)" />
    </UFormField>
  </div>
</template>
