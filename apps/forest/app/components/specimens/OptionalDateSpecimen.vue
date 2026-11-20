<script setup lang="ts">
/**
 * ZOptionalDate on Forest (tests/optional-date.spec.ts): a ticked one with a day and an unticked one, each in a
 * UFormField, as a task form's "Ends" and "Follow-up date".
 */
import { Temporal } from 'temporal-polyfill/implementation'

const ends = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2026-05-12'))
const ext = ref<Temporal.PlainDate | null>(null)
</script>

<template>
  <section id="optional-date" class="flex flex-col gap-4">
    <ZKicker>Optional date</ZKicker>
    <div class="flex flex-wrap gap-4">
      <UFormField data-optional-date-specimen="ends" label="Ends">
        <ZOptionalDate v-model="ends" label="Has an end date" clearable />
      </UFormField>
      <UFormField data-optional-date-specimen="ext" label="Follow-up date">
        <ZOptionalDate v-model="ext" label="Follow-up booked" />
      </UFormField>
    </div>
  </section>
</template>
