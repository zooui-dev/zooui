<script setup lang="ts">
/**
 * ZDateField with either type of day in its model, and with Nuxt UI's limits (tests/date-field.spec.ts drives it): a
 * CalendarDate in and out, a null model told to hand back CalendarDates (`model-type`), a PlainDate as before, and a
 * CalendarDate field limited to March 10 through August 20, 2026 (the limits one of each type) with weekends
 * unavailable, once in a UFormField that shows the refusal message from `invalid`, and once bare. A CalendarDate goes in
 * a shallowRef, as Nuxt UI's own docs keep one: ref() would unwrap its class into a type that isn't a CalendarDate.
 */
import { CalendarDate, getDayOfWeek } from '@internationalized/date'
import { Temporal } from 'temporal-polyfill/implementation'

type Day = Temporal.PlainDate | CalendarDate | null
/** A day as the page sees it: its type, then the day. */
const describe = (d: Day | undefined) =>
  d == null ? 'null' : `${d instanceof CalendarDate ? 'CalendarDate' : d instanceof Temporal.PlainDate ? 'PlainDate' : 'other'} ${d.toString()}`

const cal = shallowRef<CalendarDate | null>(new CalendarDate(2026, 5, 12))
const calEvents = ref<string[]>([])
const fromNull = shallowRef<CalendarDate | null>(null)
const plain = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2026-05-12'))
const plainEvents = ref<string[]>([])

const MIN = new CalendarDate(2026, 3, 10)
const MAX = Temporal.PlainDate.from('2026-08-20')
// Called while the calendar renders, so it writes to the page only when handed the wrong type.
const wrongType = ref('')
function weekend(d: CalendarDate) {
  if (!(d instanceof CalendarDate)) wrongType.value = describe(d)
  const day = getDayOfWeek(d, 'en-US') // Sunday 0
  return day === 0 || day === 6
}
const limited = shallowRef<CalendarDate | null>(new CalendarDate(2026, 5, 12))
const limitedError = ref<string>()
const limitedProblem = ref('none')
const bare = shallowRef<CalendarDate | null>(new CalendarDate(2026, 5, 12))
</script>

<template>
  <main class="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
    <section data-types="cal" class="flex flex-col gap-2">
      <UFormField label="CalendarDate">
        <ZDateField v-model="cal" clearable @date-update="(d) => calEvents.push(describe(d))" />
      </UFormField>
      <p class="text-sm">model: <span data-testid="cal-model">{{ describe(cal) }}</span></p>
      <ol data-testid="cal-events" class="text-sm">
        <li v-for="(e, i) in calEvents" :key="i">{{ e }}</li>
      </ol>
    </section>

    <section data-types="from-null" class="flex flex-col gap-2">
      <UFormField label="From null">
        <ZDateField v-model="fromNull" model-type="calendar-date" />
      </UFormField>
      <p class="text-sm">model: <span data-testid="from-null-model">{{ describe(fromNull) }}</span></p>
    </section>

    <section data-types="plain" class="flex flex-col gap-2">
      <UFormField label="PlainDate">
        <ZDateField v-model="plain" clearable @date-update="(d) => plainEvents.push(describe(d))" />
      </UFormField>
      <p class="text-sm">model: <span data-testid="plain-model">{{ describe(plain) }}</span></p>
      <ol data-testid="plain-events" class="text-sm">
        <li v-for="(e, i) in plainEvents" :key="i">{{ e }}</li>
      </ol>
    </section>

    <section data-types="limited" class="flex flex-col gap-2">
      <UFormField label="Limited" :error="limitedError">
        <ZDateField
          v-model="limited"
          :min-value="MIN"
          :max-value="MAX"
          :is-date-unavailable="weekend"
          @invalid="(p) => { limitedError = p?.message; limitedProblem = p ? `${p.reason} ${describe(p.date)} ${describe(p.limit)}` : 'none' }"
        />
      </UFormField>
      <p class="text-sm">model: <span data-testid="limited-model">{{ describe(limited) }}</span></p>
      <p class="text-sm">problem: <span data-testid="limited-problem">{{ limitedProblem }}</span></p>
      <p class="text-sm">wrong type: <span data-testid="wrong-type">{{ wrongType }}</span></p>
      <ZDateField v-model="bare" :min-value="MIN" :max-value="MAX" :is-date-unavailable="weekend" aria-label="Bare limited" />
    </section>

    <UInput placeholder="Somewhere else" class="max-w-sm" />
  </main>
</template>
