<script setup lang="ts">
/**
 * ZDateField, in the shapes a product uses it (its e2e specs drive these): a labeled form field, the other formats, a
 * field whose parent owns the v-model and lists every `dateUpdate` (a dev harness), a range whose ends put a
 * default back when blanked (its report filters), and a field in a modal (its recurring-task form's "Ends").
 */
import { Temporal } from 'temporal-polyfill/implementation'

const due = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2026-05-12'))
const dueDe = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2026-05-12'))
const dueIso = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2026-05-12'))

// The harness: the PARENT owns the v-model, as a table cell's inline editor does, and every settle is listed.
const date = ref<Temporal.PlainDate | null>(null)
const events = ref<string[]>([])
const record = (d: Temporal.PlainDate | null) => events.value.push(d ? d.toString() : 'null')

// A range a report can't do without: a settle that carries null puts the default back. "To" defaults to today, as a
// NEW object each time — handing back the one the field held would leave the model unchanged and the box blank.
const FROM = '2026-01-01'
const from = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from(FROM))
const to = ref<Temporal.PlainDate | null>(null)
onMounted(() => { to.value = useToday() })
const fromSettled = (d: Temporal.PlainDate | null) => { if (!d) from.value = Temporal.PlainDate.from(FROM) }
const toSettled = (d: Temporal.PlainDate | null) => { if (!d) to.value = useToday() }

// Icon options: a leading icon whose click is the product's, and the product's own calendar icon.
const starts = ref<Temporal.PlainDate | null>(null)
const iconClicks = ref<string[]>([])
const iconClicked = (e: MouseEvent) => iconClicks.value.push(e instanceof MouseEvent ? e.type : 'not a MouseEvent')

const taskOpen = ref(false)
const ends = ref<Temporal.PlainDate | null>(null)
</script>

<template>
  <KsSection id="date-field" title="ZDateField" note="A Temporal.PlainDate field: type a date (5, 0512, 5/12/26), press a shortcut (t, m/h, y/r, + and −), or pick from the calendar. The format follows the locale unless set.">
    <div data-date-specimen="form" class="grid gap-4 sm:grid-cols-3">
      <UFormField label="Due">
        <ZDateField v-model="due" clearable class="w-full" />
      </UFormField>
      <UFormField label="Due (de)">
        <ZDateField v-model="dueDe" locale="de" clearable class="w-full" />
      </UFormField>
      <UFormField label="Due (ISO)">
        <ZDateField v-model="dueIso" format="YYYY-MM-DD" clearable class="w-full" />
      </UFormField>
    </div>

    <div data-date-specimen="harness" class="flex max-w-sm flex-col gap-3">
      <ZDateField v-model="date" clearable class="w-full" aria-label="Harness date" @date-update="record" />
      <UInput placeholder="Somewhere else" class="w-full" />
      <!-- Above the list: pressing it blurs the field, which logs an event, and a list above would push the button
           out from under the pointer before the click lands. -->
      <div class="flex gap-2">
        <UButton data-testid="reset" label="Reset events" color="neutral" variant="outline" @click="events = []" />
        <!-- A stored day the field can show but not read back if typed (a year before 1000), as an old import left it. -->
        <UButton data-testid="load-0026" label="Load 0026-05-12" color="neutral" variant="outline" @click="date = Temporal.PlainDate.from('0026-05-12')" />
      </div>
      <p class="text-sm">model: <span data-testid="model">{{ date ? date.toString() : 'null' }}</span></p>
      <ol data-testid="events" class="text-sm">
        <li v-for="(e, i) in events" :key="i">{{ e }}</li>
      </ol>
    </div>

    <div data-date-specimen="range" class="flex flex-wrap gap-4">
      <UFormField label="From">
        <ZDateField v-model="from" @date-update="fromSettled" />
      </UFormField>
      <UFormField label="To">
        <ZDateField v-model="to" @date-update="toSettled" />
      </UFormField>
    </div>

    <div data-date-specimen="icons" class="flex flex-wrap items-end gap-4">
      <UFormField label="Starts">
        <ZDateField v-model="starts" icon="i-lucide-history" calendar-icon="i-lucide-calendar-days" @icon-click="iconClicked" />
      </UFormField>
      <p class="text-sm">icon clicks: <span data-testid="icon-clicks">{{ iconClicks.join(' ') }}</span></p>
    </div>

    <div>
      <UModal v-model:open="taskOpen" title="Add a recurring task" description="A date field in a dialog.">
        <UButton data-open="task" label="Add a recurring task" color="neutral" variant="outline" />
        <template #body>
          <div class="flex flex-col gap-4">
            <UFormField label="Title or description">
              <UInput placeholder="Weekly team check-in" class="w-full" />
            </UFormField>
            <UFormField label="Ends">
              <ZDateField v-model="ends" clearable class="w-full" />
            </UFormField>
          </div>
        </template>
      </UModal>
    </div>
  </KsSection>
</template>
