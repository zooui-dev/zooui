<script setup lang="ts">
const rate = ref<string | null>('0.125')
const price = ref<number | null>(1200)
const rating = ref<number | null>(9)
</script>

<template>
  <div class="grid w-full max-w-xs gap-3">
    <UFormField label="Rate, 2 to 3 places">
      <ZNumberInput v-model="rate" unit="percent" :min-fraction-digits="2" :max-fraction-digits="3" class="w-full" />
    </UFormField>
    <UFormField label="Price, whole dollars">
      <ZNumberInput v-model="price" unit="money" :max-fraction-digits="0" class="w-full" />
    </UFormField>
    <UFormField label="Rating, 0 to 10" help="Type 12 and press Enter.">
      <ZNumberInput v-model="rating" :min="0" :max="10" class="w-full" />
    </UFormField>
  </div>
</template>
