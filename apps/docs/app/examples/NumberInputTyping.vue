<script setup lang="ts">
const visitors = ref<number | null>(1234567)
const umsatz = ref<string | null>('1234.5')
</script>

<template>
  <div class="grid w-full max-w-xs gap-3">
    <UFormField label="Visitors">
      <ZNumberInput v-model="visitors" class="w-full" />
    </UFormField>
    <UFormField label="Umsatz (de, EUR)">
      <ZNumberInput v-model="umsatz" unit="money" currency="EUR" locale="de" class="w-full" />
    </UFormField>
  </div>
</template>
