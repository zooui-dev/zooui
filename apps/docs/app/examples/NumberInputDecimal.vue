<script setup lang="ts">
import Decimal from 'decimal.js'

// shallowRef: a Decimal is a value, not state to make deeply reactive
const balance = shallowRef<Decimal | null>(new Decimal('1234.5'))
const tax = shallowRef<Decimal | null>(null)
</script>

<template>
  <div class="grid w-full max-w-xs gap-3">
    <UFormField label="Balance due" :help="`${balance instanceof Decimal ? 'Decimal' : typeof balance} ${balance ?? ''}`">
      <ZNumberInput v-model="balance" unit="money" class="w-full" />
    </UFormField>
    <UFormField label="Tax, starts empty" :help="`${tax instanceof Decimal ? 'Decimal' : 'null'} ${tax ?? ''}`">
      <ZNumberInput v-model="tax" unit="money" model-type="decimal" class="w-full" />
    </UFormField>
  </div>
</template>
