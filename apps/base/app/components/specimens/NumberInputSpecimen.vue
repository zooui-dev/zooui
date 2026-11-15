<script setup lang="ts">
/**
 * ZNumberInput as a product uses it: dollars moving by the product's own $5,000 (app.config.ts, `zooui.numberInput`), a rate
 * by 0.1%, a count, the setup wizard's free-text hours. tests/number-input.spec.ts reads its colors and steps.
 *
 * Then a database row: Postgres `numeric` columns arrive as decimal.js `Decimal`s, so the v-model is one and must come
 * back one, of the row's own class. `Money` stands in for a second copy of decimal.js: a class the layer has never
 * seen, which every value handed back must still be an instance of.
 */
import Decimal from 'decimal.js'

const v = reactive<Record<string, string | number>>({ sale: 125000, rate: '25', jobs: 12, week: '40' })

class Money extends Decimal {}
// shallowRef: a Decimal is a value, not state to make deeply reactive
const balance = shallowRef<Decimal | null>(new Money('1234.5'))
const tax = shallowRef<Decimal | null>(null)
const adjustment = shallowRef<Decimal | null>(new Money('0'))
const kind = (d: unknown) => (d instanceof Money ? 'Money' : d instanceof Decimal ? 'Decimal' : d === null ? 'null' : typeof d)
</script>

<template>
  <section id="number-input" class="flex flex-col gap-3">
    <h2 class="section-label">Your numbers</h2>
    <UFormField label="Average sale" class="w-48">
      <ZNumberInput v-model="v.sale" unit="money" data-specimen="ni-sale" />
    </UFormField>
    <UFormField label="Closing rate" class="w-48">
      <ZNumberInput v-model="v.rate" unit="percent" :step="0.1" data-specimen="ni-rate" />
    </UFormField>
    <UFormField label="Jobs a month" class="w-48">
      <ZNumberInput v-model="v.jobs" unit="count" data-specimen="ni-jobs" />
    </UFormField>
    <UFormField label="Hours a week" class="w-48">
      <ZNumberInput v-model="v.week" unit="hours" freeform :min="0" data-specimen="ni-week" />
    </UFormField>

    <h2 class="section-label">A database row</h2>
    <UFormField label="Balance due" class="w-48">
      <ZNumberInput v-model="balance" unit="money" :min="0" data-specimen="ni-balance" />
      <output data-model="balance" class="text-xs text-muted">{{ kind(balance) }} {{ balance }}</output>
    </UFormField>
    <UFormField label="Tax" class="w-48">
      <ZNumberInput v-model="tax" unit="money" model-type="decimal" data-specimen="ni-tax" />
      <output data-model="tax" class="text-xs text-muted">{{ kind(tax) }} {{ tax }}</output>
    </UFormField>
    <UFormField label="Adjustment" class="w-48">
      <ZNumberInput v-model="adjustment" unit="money" calc data-specimen="ni-adjustment" />
      <output data-model="adjustment" class="text-xs text-muted">{{ kind(adjustment) }} {{ adjustment }}</output>
    </UFormField>
  </section>
</template>
