<script setup lang="ts">
/**
 * ZMonthField and ZYearField (tests/month-year-field.spec.ts drives it): a month in each model type, a month and a
 * year limited and refusing what is typed outside the limits, a month in YYYY-MM, the month-of-year USelect recipe
 * beside a year (a project's reporting period), disabled fields, and a leading icon. The `data-*` attributes are the
 * spec's selectors.
 */
import { CalendarDate } from '@internationalized/date'
import { Temporal } from 'temporal-polyfill/implementation'

type Month = Temporal.PlainYearMonth | CalendarDate | null
/** A month as the page sees it: its type, then the value. */
const describe = (v: Month | undefined) =>
  v == null ? 'null' : `${v instanceof CalendarDate ? 'CalendarDate' : v instanceof Temporal.PlainYearMonth ? 'PlainYearMonth' : 'other'} ${v.toString()}`
const describeYear = (y: number | null | undefined) => (y == null ? 'null' : `${typeof y} ${y}`)

const period = ref<Temporal.PlainYearMonth | null>(Temporal.PlainYearMonth.from('2026-05'))
const periodEvents = ref<string[]>([])
const calMonth = shallowRef<CalendarDate | null>(null)

const MONTH_MIN = Temporal.PlainYearMonth.from('2026-03')
const MONTH_MAX = new CalendarDate(2026, 8, 20)
const limitedMonth = ref<Temporal.PlainYearMonth | null>(Temporal.PlainYearMonth.from('2026-05'))
const monthError = ref<string>()
const monthProblem = ref('none')

const iso = ref<Temporal.PlainYearMonth | null>(Temporal.PlainYearMonth.from('2026-05'))

const year = ref<number | null>(2025)
const yearEvents = ref<string[]>([])
const limitedYear = ref<number | null>(2025)
const yearError = ref<string>()
const yearProblem = ref('none')

// The month-of-year recipe: a USelect of Intl's month names, valued 1 to 12, beside a year.
const MONTHS = monthOfYearItems('en', { numbered: true })
const reportMonth = ref(12)
const reportYear = ref<number | null>(2025)

const iconClicks = ref(0)
</script>

<template>
  <main class="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-8">
    <header class="flex flex-col gap-2">
      <h1 class="text-2xl font-semibold text-highlighted">ZMonthField and ZYearField</h1>
      <p class="text-muted">
        A month of a year and a year, typed, stepped with a key or picked from a calendar of months or years. They read the
        keyboard as ZDateField does: Enter, Tab or leaving commits, text that isn't a month or year clears the field. "Model"
        under each field is the parent's v-model, with its type; "Events" lists each <code>@date-update</code>. The text box
        at the bottom is somewhere to Tab or click to. "Today" is the browser's.
      </p>
    </header>

    <section data-month="period" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold text-highlighted">A month, as a PlainYearMonth</h2>
      <p class="text-sm text-muted">
        Try this: type 7/26, 2026-09, 052026 or 2026 (December) and press Enter. Press t for this month, m or - for the month
        before, h or + for the month after, y and r for a year either way. Open the calendar with its button or Alt+↓.
      </p>
      <UFormField label="Period">
        <ZMonthField v-model="period" clearable @date-update="(m) => periodEvents.push(describe(m))" />
      </UFormField>
      <p class="text-sm text-muted">Model: <output data-testid="period-model" class="text-default">{{ describe(period) }}</output></p>
      <p class="text-sm text-muted">Events:</p>
      <ol data-testid="period-events" class="text-sm text-default">
        <li v-for="(e, i) in periodEvents" :key="i">{{ e }}</li>
      </ol>
    </section>

    <section data-month="cal" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold text-highlighted">A month, as a CalendarDate</h2>
      <p class="text-sm text-muted">Try this: type 5/26 and press Enter. The model starts out null and <code>model-type="calendar-date"</code> makes it a CalendarDate, the first of the month.</p>
      <UFormField label="Billing month">
        <ZMonthField v-model="calMonth" model-type="calendar-date" />
      </UFormField>
      <p class="text-sm text-muted">Model: <output data-testid="cal-model" class="text-default">{{ describe(calMonth) }}</output></p>
    </section>

    <section data-month="limited" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold text-highlighted">A month between March and August 2026</h2>
      <p class="text-sm text-muted">
        Try this: type 9/26 and press Enter. The field keeps 05/2026, is marked invalid and the message shows under it; type
        again and the mark goes. Press r: it stops at 08/2026. In the calendar, the months outside are disabled.
      </p>
      <UFormField label="Sprint month" :error="monthError">
        <ZMonthField
          v-model="limitedMonth"
          :min-value="MONTH_MIN"
          :max-value="MONTH_MAX"
          @invalid="(p) => { monthError = p?.message; monthProblem = p ? `${p.reason} ${describe(p.date)} ${describe(p.limit)}` : 'none' }"
        />
      </UFormField>
      <p class="text-sm text-muted">Model: <output data-testid="limited-month-model" class="text-default">{{ describe(limitedMonth) }}</output></p>
      <p class="text-sm text-muted">Problem: <output data-testid="limited-month-problem" class="text-default">{{ monthProblem }}</output></p>
    </section>

    <section data-month="iso" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold text-highlighted">A month in YYYY-MM</h2>
      <p class="text-sm text-muted">Try this: type 26-7 and press Enter: July 2026. Here - types the dash, so _ is the month before.</p>
      <UFormField label="Release month">
        <ZMonthField v-model="iso" format="YYYY-MM" />
      </UFormField>
      <p class="text-sm text-muted">Model: <output data-testid="iso-model" class="text-default">{{ describe(iso) }}</output></p>
    </section>

    <section data-year="plain" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold text-highlighted">A year</h2>
      <p class="text-sm text-muted">
        Try this: type 26 and press Enter (2026); type abc and Tab away (the field clears). Press t for this year, y or -
        for the year before, r or + for the year after.
      </p>
      <UFormField label="Fiscal year">
        <ZYearField v-model="year" clearable class="w-32" @date-update="(y) => yearEvents.push(describeYear(y))" />
      </UFormField>
      <p class="text-sm text-muted">Model: <output data-testid="year-model" class="text-default">{{ describeYear(year) }}</output></p>
      <p class="text-sm text-muted">Events:</p>
      <ol data-testid="year-events" class="text-sm text-default">
        <li v-for="(e, i) in yearEvents" :key="i">{{ e }}</li>
      </ol>
    </section>

    <section data-year="limited" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold text-highlighted">A year from 2020 to 2030</h2>
      <p class="text-sm text-muted">Try this: type 2031 and press Enter. The field keeps 2025 and says why. Press y six times: it stops at 2020.</p>
      <UFormField label="Budget year" :error="yearError">
        <ZYearField
          v-model="limitedYear"
          :min-value="2020"
          :max-value="2030"
          class="w-32"
          @invalid="(p) => { yearError = p?.message; yearProblem = p ? `${p.reason} ${p.date} ${p.limit}` : 'none' }"
        />
      </UFormField>
      <p class="text-sm text-muted">Model: <output data-testid="limited-year-model" class="text-default">{{ describeYear(limitedYear) }}</output></p>
      <p class="text-sm text-muted">Problem: <output data-testid="limited-year-problem" class="text-default">{{ yearProblem }}</output></p>
    </section>

    <section data-recipe="month-of-year" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold text-highlighted">A month of the year, and a year</h2>
      <p class="text-sm text-muted">
        Try this: focus Month and type o for October, or open it and pick one. A month with no year is a USelect of
        <code>monthOfYearItems()</code>, Intl's month names valued 1 to 12, not a ZMonthField: there is no year to step or
        calendar to page.
      </p>
      <div class="grid max-w-md grid-cols-2 gap-4">
        <UFormField label="Month">
          <USelect v-model="reportMonth" :items="MONTHS" data-month-of-year class="w-full" />
        </UFormField>
        <UFormField label="Year">
          <ZYearField v-model="reportYear" class="w-full" />
        </UFormField>
      </div>
      <p class="text-sm text-muted">Model: <output data-testid="report-model" class="text-default">month {{ reportMonth }}, year {{ describeYear(reportYear) }}</output></p>
    </section>

    <section data-fields="other" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold text-highlighted">Disabled, and a leading icon</h2>
      <p class="text-sm text-muted">Try this: the disabled pair can't be typed in or opened. Click the calendar icon at the start of "Milestone month": the count goes up.</p>
      <div class="flex flex-wrap items-end gap-4">
        <UFormField label="Locked month">
          <ZMonthField :model-value="Temporal.PlainYearMonth.from('2026-05')" disabled />
        </UFormField>
        <UFormField label="Locked year">
          <ZYearField :model-value="2026" disabled class="w-32" />
        </UFormField>
        <UFormField label="Milestone month">
          <ZMonthField v-model="period" icon="i-lucide-calendar" @icon-click="iconClicks++" />
        </UFormField>
      </div>
      <p class="text-sm text-muted">Icon clicks: <output data-testid="icon-clicks" class="text-default">{{ iconClicks }}</output></p>
    </section>

    <UFormField label="Somewhere else">
      <UInput placeholder="Somewhere else" class="max-w-sm" />
    </UFormField>
  </main>
</template>
