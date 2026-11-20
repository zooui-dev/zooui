<script setup lang="ts">
/**
 * ZOptionalDate (tests/optional-date.spec.ts drives it): a PlainDate in a UFormField with help, the box unbound, in the
 * default mode (unticking keeps the day) and with `clear-when-off`; a CalendarDate starting null and unticked, with
 * limits; a box bound with v-model:enabled that starts off with a day in hand, in both modes, with buttons that set the
 * day and the box from the parent and a count of what the component wrote; `enabled-change` fetching a default date on
 * a tick; the size from a UFieldGroup and a UFormField; a field the product marks with an error; a UForm whose rule
 * asks for the date only while the box is ticked; and a disabled one.
 */
import { CalendarDate } from '@internationalized/date'
import { Temporal } from 'temporal-polyfill/implementation'

type Day = Temporal.PlainDate | CalendarDate | null
const describe = (d: Day | undefined) =>
  d == null ? 'null' : `${d instanceof CalendarDate ? 'CalendarDate' : d instanceof Temporal.PlainDate ? 'PlainDate' : 'other'} ${d.toString()}`

const ends = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2026-05-12'))
const endsEvents = ref<string[]>([])
const endsClear = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2026-05-12'))
const endsClearEvents = ref<string[]>([])

const cal = shallowRef<CalendarDate | null>(null)
const calOn = ref<boolean>()
const MIN = new CalendarDate(2026, 3, 10)

// Off at mount with a day in hand, in each mode; `writes` counts every update the component emitted.
const ext = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2026-10-15'))
const extBooked = ref(false)
const extWrites = ref(0)
const extClear = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2026-10-15'))
const extClearBooked = ref(false)
const extClearWrites = ref(0)

// enabled-change: a tick with no day fetches a default, as an app's form does (here, a fixed day after a moment).
const toggled = ref<Temporal.PlainDate | null>(null)
const toggledOn = ref(false)
const toggleEvents = ref<string[]>([])
async function onEnabledChange(on: boolean) {
  toggleEvents.value.push(String(on))
  if (!on || toggled.value) return
  await new Promise((resolve) => setTimeout(resolve, 50))
  toggled.value = Temporal.PlainDate.from('2026-12-31')
}

const grouped = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2026-05-12'))
const groupedSized = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2026-05-12'))
const sized = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2026-05-12'))

const errored = ref<Temporal.PlainDate | null>(null)
// A form whose rule asks for the date only while the box is ticked.
const form = reactive({ reviewDate: null as Temporal.PlainDate | null, reviewed: true })
const validate = (s: typeof form) => (s.reviewed && !s.reviewDate ? [{ name: 'reviewDate', message: 'Enter the review date' }] : [])

const disabledDay = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2026-05-12'))
</script>

<template>
  <main class="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
    <header class="flex flex-col gap-2">
      <h1 class="text-2xl font-semibold">ZOptionalDate</h1>
      <p class="text-muted">
        A checkbox in front of a ZDateField, for a day a record may or may not have. Unticking greys out the date and,
        by default, leaves the day in the model; <code>clear-when-off</code> makes the model
        null while the box is off instead. Each section shows what the parent holds: "model" is the v-model, "enabled"
        the box's v-model, and the lists are the events the component emitted, oldest first. The text box at the
        bottom is somewhere to Tab or click to.
      </p>
    </header>

    <section data-section="ends" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Unticking keeps the day</h2>
      <p class="text-sm text-muted">Try this: untick the box. The date greys out but stays in the model, and no dateUpdate is announced. Tick it again and focus moves into the date.</p>
      <UFormField label="Ends" help="Leave it off for an open-ended project">
        <ZOptionalDate v-model="ends" label="Has an end date" clearable @date-update="(d) => endsEvents.push(describe(d))" />
      </UFormField>
      <p class="text-sm">model: <span data-testid="ends-model">{{ describe(ends) }}</span></p>
      <p class="text-sm">dateUpdate events:</p>
      <ol data-testid="ends-events" class="text-sm">
        <li v-for="(e, i) in endsEvents" :key="i">{{ e }}</li>
      </ol>
    </section>

    <section data-section="ends-clear" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">clear-when-off</h2>
      <p class="text-sm text-muted">Try this: untick the box. The model becomes null, the field empties and dateUpdate announces null. Tick it again and the day comes back.</p>
      <UFormField label="Ends (clear when off)">
        <ZOptionalDate v-model="endsClear" label="Has an end date (clear when off)" clearable clear-when-off @date-update="(d) => endsClearEvents.push(describe(d))" />
      </UFormField>
      <p class="text-sm">model: <span data-testid="ends-clear-model">{{ describe(endsClear) }}</span></p>
      <p class="text-sm">dateUpdate events:</p>
      <ol data-testid="ends-clear-events" class="text-sm">
        <li v-for="(e, i) in endsClearEvents" :key="i">{{ e }}</li>
      </ol>
    </section>

    <section data-section="cal" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">A CalendarDate, from null, with a minimum</h2>
      <p class="text-sm text-muted">Try this: tick the box, type 5/12 and press Enter, then untick and tick again. The model stays a CalendarDate. A day before March 10, 2026 is refused.</p>
      <ZOptionalDate v-model="cal" v-model:enabled="calOn" model-type="calendar-date" :min-value="MIN" label="Has a start date" aria-label="Starts" />
      <p class="text-sm">model: <span data-testid="cal-model">{{ describe(cal) }}</span></p>
      <p class="text-sm">enabled: <span data-testid="cal-on">{{ calOn }}</span></p>
    </section>

    <section data-section="ext" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Off at mount with a day in hand</h2>
      <p class="text-sm text-muted">Try this: the box starts off with October 15 loaded, and nothing is written ("writes" stays 0). Book and Cancel booking set the box from the parent; Set Oct 20 sets the day, which leaves the box as it is.</p>
      <UFormField label="Follow-up date">
        <ZOptionalDate
          v-model="ext"
          v-model:enabled="extBooked"
          label="Follow-up booked"
          @update:model-value="extWrites++"
          @update:enabled="extWrites++"
        />
      </UFormField>
      <p class="text-sm">model: <span data-testid="ext-model">{{ describe(ext) }}</span></p>
      <p class="text-sm">enabled: <span data-testid="ext-on">{{ extBooked }}</span></p>
      <p class="text-sm">writes: <span data-testid="ext-writes">{{ extWrites }}</span></p>
      <div class="flex gap-2">
        <UButton data-action="set-day" label="Set Oct 20" size="sm" color="neutral" variant="outline" @click="ext = Temporal.PlainDate.from('2026-10-20')" />
        <UButton data-action="file" label="Book" size="sm" color="neutral" variant="outline" @click="extBooked = true" />
        <UButton data-action="withdraw" label="Cancel booking" size="sm" color="neutral" variant="outline" @click="extBooked = false" />
      </div>
    </section>

    <section data-section="ext-clear" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Off at mount with a day in hand, clear-when-off</h2>
      <p class="text-sm text-muted">Try this: as above, nothing is written at mount. Untick after a tick and the model becomes null; Set Oct 20 while it's off ticks the box.</p>
      <UFormField label="Follow-up date (clear when off)">
        <ZOptionalDate
          v-model="extClear"
          v-model:enabled="extClearBooked"
          label="Follow-up booked (clear when off)"
          clear-when-off
          @update:model-value="extClearWrites++"
          @update:enabled="extClearWrites++"
        />
      </UFormField>
      <p class="text-sm">model: <span data-testid="ext-clear-model">{{ describe(extClear) }}</span></p>
      <p class="text-sm">enabled: <span data-testid="ext-clear-on">{{ extClearBooked }}</span></p>
      <p class="text-sm">writes: <span data-testid="ext-clear-writes">{{ extClearWrites }}</span></p>
      <div class="flex gap-2">
        <UButton data-action="set-day" label="Set Oct 20" size="sm" color="neutral" variant="outline" @click="extClear = Temporal.PlainDate.from('2026-10-20')" />
        <UButton data-action="file" label="Book" size="sm" color="neutral" variant="outline" @click="extClearBooked = true" />
        <UButton data-action="withdraw" label="Cancel booking" size="sm" color="neutral" variant="outline" @click="extClearBooked = false" />
      </div>
    </section>

    <section data-section="toggle" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">enabled-change</h2>
      <p class="text-sm text-muted">Try this: tick the box. enabled-change fires with true and the page fetches a default day, December 31. The buttons set the box and the day from the parent, which fires nothing.</p>
      <UFormField label="Follow-up">
        <ZOptionalDate v-model="toggled" v-model:enabled="toggledOn" label="Needs a follow-up" @enabled-change="onEnabledChange" />
      </UFormField>
      <p class="text-sm">model: <span data-testid="toggle-model">{{ describe(toggled) }}</span></p>
      <p class="text-sm">enabled: <span data-testid="toggle-on">{{ toggledOn }}</span></p>
      <p class="text-sm">enabled-change events: <span data-testid="toggle-events">{{ toggleEvents.join(' ') }}</span></p>
      <div class="flex gap-2">
        <UButton data-action="on" label="Turn on" size="sm" color="neutral" variant="outline" @click="toggledOn = true" />
        <UButton data-action="off" label="Turn off" size="sm" color="neutral" variant="outline" @click="toggledOn = false" />
        <UButton data-action="set-day" label="Set Nov 1" size="sm" color="neutral" variant="outline" @click="toggled = Temporal.PlainDate.from('2026-11-01')" />
      </div>
    </section>

    <section data-section="sizes" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Size</h2>
      <p class="text-sm text-muted">Try this: compare the checkboxes. With no size prop, a UFieldGroup's size (xl) is used over the UFormField's (sm); an explicit size prop (xs) wins over the group; and a UFormField alone gives its size (lg).</p>
      <UFormField label="In a group" size="sm" data-size="group">
        <UFieldGroup size="xl">
          <ZOptionalDate v-model="grouped" label="Grouped" />
        </UFieldGroup>
      </UFormField>
      <UFormField label="In a group, with size xs" size="sm" data-size="group-prop">
        <UFieldGroup size="xl">
          <ZOptionalDate v-model="groupedSized" label="Grouped, sized" size="xs" />
        </UFieldGroup>
      </UFormField>
      <UFormField label="In a form field" size="lg" data-size="form-field">
        <ZOptionalDate v-model="sized" label="Sized" />
      </UFormField>
    </section>

    <section data-section="errored" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">A UFormField with an error</h2>
      <p class="text-sm text-muted">Try this: the date input is marked invalid and described by the error; the checkbox is not.</p>
      <UFormField label="Reviewed" error="Enter the review date">
        <ZOptionalDate v-model="errored" :enabled="true" label="Reviewed" />
      </UFormField>
    </section>

    <section data-section="form" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">In a UForm</h2>
      <p class="text-sm text-muted">Try this: press Save with the date empty, then untick. The rule asks for the date only while the box is ticked, so the error goes away.</p>
      <UForm :state="form" :validate="validate" class="flex flex-col gap-2">
        <UFormField label="Review date" name="reviewDate">
          <ZOptionalDate v-model="form.reviewDate" v-model:enabled="form.reviewed" label="Reviewed" />
        </UFormField>
        <UButton type="submit" label="Save" class="self-start" />
      </UForm>
    </section>

    <section data-section="disabled" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Disabled</h2>
      <p class="text-sm text-muted">Try this: neither the box nor the date takes a click.</p>
      <UFormField label="Locked">
        <ZOptionalDate v-model="disabledDay" label="Has a lock date" disabled />
      </UFormField>
    </section>

    <UFormField label="Somewhere else">
      <UInput placeholder="Somewhere else" class="max-w-sm" />
    </UFormField>
  </main>
</template>
