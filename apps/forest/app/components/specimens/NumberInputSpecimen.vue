<script setup lang="ts">
/**
 * ZNumberInput, in every unit and state, for the tests in tests/number-input.spec.ts. Each field shows what its model
 * holds (`data-model`), type included, so a test can read that a number stayed a number.
 */
const v = reactive<Record<string, string | number | null>>({
  money: 38500, percent: '12.5', count: 3, hours: '7.5',
  plain: 10, euro: 20, empty: null, clamped: 9, wizard: '', disabled: 4, readonly: 4,
  big: 1234567, de: '1234.5', places: '0.125', whole: 1200, rent: 1200, nospin: 5, highlight: 42,
  calc: 1200, calc1040: 1000, cell: '250.00', over: 15, dose: 0.005, deFree: '1,233', relocale: 1234.5, edge: 10.004, grouped: '1,500',
})
const cell = useTemplateRef<{ evaluate: () => unknown }>('cell')
const cap = ref(10)
const relocale = ref('en-US')
const column = [
  { key: 'money', label: 'Revenue', unit: 'money', step: 5000 },
  { key: 'percent', label: 'Margin', unit: 'percent' },
  { key: 'count', label: 'Clients', unit: 'count' },
  { key: 'hours', label: 'Hours a day', unit: 'hours' },
] as const
</script>

<template>
  <KsSection id="number-input" title="Number input" note="ZNumberInput: one input for money, percent, count and hours, formatting as it is typed. Unit marks sit in fixed slots so a column of values lines up; its own chevrons and the arrow keys move by the step from the current value; a commit clamps and rounds; calc works out + − × ÷.">
    <KsRow label="a column">
      <div class="flex flex-col gap-2" data-specimen="ni-column">
        <UFormField v-for="f in column" :key="f.key" :label="f.label" class="w-48">
          <ZNumberInput v-model="v[f.key]" :unit="f.unit" :step="'step' in f ? f.step : undefined" class="w-full" :data-specimen="`ni-${f.key}`" />
          <output :data-model="f.key" class="text-xs text-muted">{{ typeof v[f.key] }} {{ v[f.key] }}</output>
        </UFormField>
      </div>
    </KsRow>

    <KsRow label="defaults">
      <UFormField label="Fee" class="w-40">
        <ZNumberInput v-model="v.plain" unit="money" data-specimen="ni-plain" />
        <output data-model="plain" class="text-xs text-muted">{{ typeof v.plain }} {{ v.plain }}</output>
      </UFormField>
      <UFormField label="Fee in euros" class="w-40">
        <ZNumberInput v-model="v.euro" unit="money" currency="EUR" data-specimen="ni-euro" />
      </UFormField>
      <UFormField label="Seats" class="w-40">
        <ZNumberInput v-model="v.empty" placeholder="0" data-specimen="ni-empty" />
        <output data-model="empty" class="text-xs text-muted">{{ typeof v.empty }} {{ v.empty }}</output>
      </UFormField>
    </KsRow>

    <KsRow label="min / max">
      <UFormField label="Rating (0 to 10)" class="w-40">
        <ZNumberInput v-model="v.clamped" :min="0" :max="10" data-specimen="ni-clamped" />
        <output data-model="clamped" class="text-xs text-muted">{{ typeof v.clamped }} {{ v.clamped }}</output>
        <UButton size="xs" variant="soft" class="mt-1" @click="v.clamped = 5">Reset rating</UButton>
        <UButton size="xs" variant="soft" class="mt-1" @click="v.clamped = 2">Rating 2</UButton>
      </UFormField>
      <UFormField :label="`Score, saved as 15 (0 to ${cap})`" class="w-40">
        <ZNumberInput v-model="v.over" :min="0" :max="cap" data-specimen="ni-over" />
        <UButton size="xs" variant="soft" class="mt-1" @click="cap = 20">Raise the cap</UButton>
      </UFormField>
      <UFormField label="Dose (0.004 to 0.006, 2 places)" class="w-40">
        <ZNumberInput v-model="v.dose" :min="0.004" :max="0.006" :min-fraction-digits="2" :max-fraction-digits="2" data-specimen="ni-dose" />
        <output data-model="dose" class="text-xs text-muted">{{ typeof v.dose }} {{ v.dose }}</output>
      </UFormField>
      <UFormField label="Quota, saved as the string 1,500 (at most 1000)" class="w-40">
        <ZNumberInput v-model="v.grouped" :max="1000" data-specimen="ni-grouped" />
      </UFormField>
      <UFormField label="Load, saved as 10.004 (at most 10, 2 places)" class="w-40">
        <ZNumberInput v-model="v.edge" :max="10" :min-fraction-digits="2" :max-fraction-digits="2" data-specimen="ni-edge" />
      </UFormField>
    </KsRow>

    <KsRow label="live formatting">
      <UFormField label="Visitors" class="w-48">
        <ZNumberInput v-model="v.big" data-specimen="ni-big" />
        <output data-model="big" class="text-xs text-muted">{{ typeof v.big }} {{ v.big }}</output>
      </UFormField>
      <UFormField label="Amount, locale switched while typing" class="w-48">
        <ZNumberInput v-model="v.relocale" unit="money" :locale="relocale" data-specimen="ni-relocale" />
        <output data-model="relocale" class="text-xs text-muted">{{ typeof v.relocale }} {{ v.relocale }}</output>
        <UButton size="xs" variant="soft" class="mt-1" @click="relocale = 'de'">Switch to de</UButton>
      </UFormField>
      <UFormField label="Umsatz (de, EUR)" class="w-48">
        <ZNumberInput v-model="v.de" unit="money" currency="EUR" locale="de" data-specimen="ni-de" />
        <output data-model="de" class="text-xs text-muted">{{ typeof v.de }} {{ v.de }}</output>
      </UFormField>
    </KsRow>

    <KsRow label="decimal places">
      <UFormField label="Rate (2 to 3 places)" class="w-40">
        <ZNumberInput v-model="v.places" unit="percent" :min-fraction-digits="2" :max-fraction-digits="3" data-specimen="ni-places" />
        <output data-model="places" class="text-xs text-muted">{{ typeof v.places }} {{ v.places }}</output>
      </UFormField>
      <UFormField label="Whole dollars" class="w-40">
        <ZNumberInput v-model="v.whole" unit="money" :max-fraction-digits="0" data-specimen="ni-whole" />
        <output data-model="whole" class="text-xs text-muted">{{ typeof v.whole }} {{ v.whole }}</output>
      </UFormField>
    </KsRow>

    <KsRow label="prefix / suffix">
      <UFormField label="Rent, about" class="w-48">
        <ZNumberInput v-model="v.rent" unit="money" prefix="~" suffix="/mo" data-specimen="ni-rent" />
      </UFormField>
    </KsRow>

    <KsRow label="spin off / highlight on focus">
      <UFormField label="Invoice number" class="w-40">
        <ZNumberInput v-model="v.nospin" :spin="false" data-specimen="ni-nospin" />
      </UFormField>
      <UFormField label="Quantity" class="w-40">
        <ZNumberInput v-model="v.highlight" highlight-on-focus data-specimen="ni-highlight" />
      </UFormField>
    </KsRow>

    <KsRow label="calc">
      <UFormField label="Expenses" class="w-48">
        <ZNumberInput v-model="v.calc" unit="money" calc data-specimen="ni-calc" />
        <output data-model="calc" class="text-xs text-muted">{{ typeof v.calc }} {{ v.calc }}</output>
      </UFormField>
      <UFormField label="Line 1 (whole dollars)" class="w-48">
        <ZNumberInput v-model="v.calc1040" unit="money" calc :max-fraction-digits="0" :min="0" data-specimen="ni-calc1040" />
        <output data-model="calc1040" class="text-xs text-muted">{{ typeof v.calc1040 }} {{ v.calc1040 }}</output>
      </UFormField>
      <UFormField label="Grid cell" class="w-48">
        <ZNumberInput ref="cell" v-model="v.cell" unit="money" calc :spin="false" :commit-on-blur="false" data-specimen="ni-cell" />
        <output data-model="cell" class="text-xs text-muted">{{ typeof v.cell }} {{ v.cell }}</output>
        <UButton size="xs" variant="soft" class="mt-1" @click="cell?.evaluate()">Evaluate</UButton>
      </UFormField>
    </KsRow>

    <KsRow label="freeform">
      <UFormField label="Hours a week" class="w-40">
        <ZNumberInput v-model="v.wizard" unit="hours" freeform :min="0" data-specimen="ni-wizard" />
      </UFormField>
      <UFormField label="Menge (de, freeform)" class="w-40">
        <ZNumberInput v-model="v.deFree" freeform locale="de" :step="0.001" data-specimen="ni-defree" />
        <output data-model="deFree" class="text-xs text-muted">{{ typeof v.deFree }} {{ v.deFree }}</output>
      </UFormField>
    </KsRow>

    <KsRow label="disabled / read-only">
      <UFormField label="Locked" class="w-40">
        <ZNumberInput v-model="v.disabled" disabled data-specimen="ni-disabled" />
      </UFormField>
      <UFormField label="Shown" class="w-40">
        <ZNumberInput v-model="v.readonly" readonly data-specimen="ni-readonly" />
      </UFormField>
    </KsRow>
  </KsSection>
</template>
