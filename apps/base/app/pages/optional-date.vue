<script setup lang="ts">
/**
 * ZOptionalDate (tests/optional-date.spec.ts drives it): a PlainDate in a UFormField with help, the box unbound; a
 * CalendarDate starting null and unticked, with limits; a box bound with v-model:enabled that starts off with a day
 * in hand, and buttons that set the day and the box from the parent; a field the product marks with an error; a UForm
 * whose rule asks for the date only while the box is ticked; and a disabled one. Each shows its model, its box and
 * what `dateUpdate` announced.
 */
import { CalendarDate } from '@internationalized/date'
import { Temporal } from 'temporal-polyfill/implementation'

type Day = Temporal.PlainDate | CalendarDate | null
const describe = (d: Day | undefined) =>
  d == null ? 'null' : `${d instanceof CalendarDate ? 'CalendarDate' : d instanceof Temporal.PlainDate ? 'PlainDate' : 'other'} ${d.toString()}`

const ends = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2026-05-12'))
const endsEvents = ref<string[]>([])

const cal = shallowRef<CalendarDate | null>(null)
const calOn = ref<boolean>()
const MIN = new CalendarDate(2026, 3, 10)

const ext = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2026-10-15'))
const extFiled = ref(false)

const errored = ref<Temporal.PlainDate | null>(null)
// A form whose rule asks for the date only while the box is ticked.
const form = reactive({ reviewDate: null as Temporal.PlainDate | null, reviewed: true })
const validate = (s: typeof form) => (s.reviewed && !s.reviewDate ? [{ name: 'reviewDate', message: 'Enter the review date' }] : [])

const disabledDay = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2026-05-12'))
</script>

<template>
  <main class="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
    <section data-section="ends" class="flex flex-col gap-2">
      <UFormField label="Ends" help="Leave it off for an open-ended engagement">
        <ZOptionalDate v-model="ends" label="Has an end date" clearable @date-update="(d) => endsEvents.push(describe(d))" />
      </UFormField>
      <p class="text-sm">model: <span data-testid="ends-model">{{ describe(ends) }}</span></p>
      <ol data-testid="ends-events" class="text-sm">
        <li v-for="(e, i) in endsEvents" :key="i">{{ e }}</li>
      </ol>
    </section>

    <section data-section="cal" class="flex flex-col gap-2">
      <ZOptionalDate v-model="cal" v-model:enabled="calOn" model-type="calendar-date" :min-value="MIN" label="Has a start date" aria-label="Starts" />
      <p class="text-sm">model: <span data-testid="cal-model">{{ describe(cal) }}</span></p>
      <p class="text-sm">enabled: <span data-testid="cal-on">{{ calOn }}</span></p>
    </section>

    <section data-section="ext" class="flex flex-col gap-2">
      <UFormField label="Extended due date">
        <ZOptionalDate v-model="ext" v-model:enabled="extFiled" label="Extension filed" />
      </UFormField>
      <p class="text-sm">model: <span data-testid="ext-model">{{ describe(ext) }}</span></p>
      <p class="text-sm">enabled: <span data-testid="ext-on">{{ extFiled }}</span></p>
      <div class="flex gap-2">
        <UButton data-action="set-day" label="Set Oct 20" size="sm" color="neutral" variant="outline" @click="ext = Temporal.PlainDate.from('2026-10-20')" />
        <UButton data-action="file" label="File" size="sm" color="neutral" variant="outline" @click="extFiled = true" />
        <UButton data-action="withdraw" label="Withdraw" size="sm" color="neutral" variant="outline" @click="extFiled = false" />
      </div>
    </section>

    <section data-section="errored">
      <UFormField label="Reviewed" error="Enter the review date">
        <ZOptionalDate v-model="errored" :enabled="true" label="Reviewed" />
      </UFormField>
    </section>

    <section data-section="form">
      <UForm :state="form" :validate="validate" class="flex flex-col gap-2">
        <UFormField label="Review date" name="reviewDate">
          <ZOptionalDate v-model="form.reviewDate" v-model:enabled="form.reviewed" label="Reviewed" />
        </UFormField>
        <UButton type="submit" label="Save" class="self-start" />
      </UForm>
    </section>

    <section data-section="disabled">
      <UFormField label="Locked">
        <ZOptionalDate v-model="disabledDay" label="Has a lock date" disabled />
      </UFormField>
    </section>

    <UInput placeholder="Somewhere else" class="max-w-sm" />
  </main>
</template>
