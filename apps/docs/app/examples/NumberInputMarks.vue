<script setup lang="ts">
const rent = ref<number | null>(1200)
const order = ref<number | null>(10432)
const quantity = ref<number | null>(42)
</script>

<template>
  <div class="grid w-full max-w-xs gap-3">
    <UFormField label="Rent, about">
      <ZNumberInput v-model="rent" unit="money" prefix="~" suffix="/mo" class="w-full" />
    </UFormField>
    <UFormField label="Order number">
      <ZNumberInput v-model="order" :spin="false" class="w-full" />
    </UFormField>
    <UFormField label="Quantity">
      <ZNumberInput v-model="quantity" highlight-on-focus class="w-full" />
    </UFormField>
  </div>
</template>
