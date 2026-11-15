<script setup lang="ts">
const fee = ref<number | null>(38500)
const rate = ref<number | null>(7.25)
const hours = ref<number | null>(40)
</script>

<template>
  <div class="grid w-full max-w-xs gap-3">
    <UFormField label="Fee">
      <ZNumberInput v-model="fee" unit="money" :step="500" class="w-full" />
    </UFormField>
    <UFormField label="Rate">
      <ZNumberInput v-model="rate" unit="percent" :step="0.25" :min="0" :max="100" class="w-full" />
    </UFormField>
    <UFormField label="Hours">
      <ZNumberInput v-model="hours" unit="hours" class="w-full" />
    </UFormField>
  </div>
</template>
