<script setup lang="ts">
/**
 * ZDateField's keyboard entry (tests/date-field.spec.ts drives it): a `#leading` slot in place of
 * the `icon`, shortcut keys that step from the committed date rather than from text typed since, and eight digits
 * typed as month, day and year.
 */
import { Temporal } from 'temporal-polyfill/implementation'

const describe = (d: Temporal.PlainDate | null) => (d ? d.toString() : 'null')

const led = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2026-05-12'))
const saved = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2026-03-15'))
const empty = ref<Temporal.PlainDate | null>(null)
const eight = ref<Temporal.PlainDate | null>(null)
</script>

<template>
  <main class="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
    <header class="flex flex-col gap-2">
      <h1 class="text-2xl font-semibold">ZDateField: typing and shortcuts</h1>
      <p class="text-muted">
        How ZDateField reads the keyboard. "model" under each field is the parent's
        v-model, as an ISO day. The text box at the bottom is somewhere to Tab or click to.
      </p>
    </header>

    <section data-entry="leading" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">The #leading slot</h2>
      <p class="text-sm text-muted">Try this: the field has an <code>icon</code> too, but the slot's "Due" badge is drawn in its place.</p>
      <UFormField label="With a leading slot">
        <ZDateField v-model="led" icon="i-lucide-calendar">
          <template #leading="{ ui }">
            <span data-testid="leading-badge" :class="ui.leadingIcon({ class: 'w-auto text-xs font-medium' })">Due</span>
          </template>
        </ZDateField>
      </UFormField>
    </section>

    <section data-entry="shortcuts" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Shortcuts step from the committed date</h2>
      <p class="text-sm text-muted">Try this: the field holds 03/15/2026. Type 04/0 without pressing Enter, then +: it goes to 03/16/2026, a day after the saved date, and the typed text is dropped.</p>
      <UFormField label="Saved">
        <ZDateField v-model="saved" />
      </UFormField>
      <p class="text-sm">model: <span data-testid="saved-model">{{ describe(saved) }}</span></p>
      <p class="text-sm text-muted">Try this: in the empty field, type 5 then +: it goes to tomorrow, a day after today, not after the 5th.</p>
      <UFormField label="Empty">
        <ZDateField v-model="empty" />
      </UFormField>
      <p class="text-sm">model: <span data-testid="empty-model">{{ describe(empty) }}</span></p>
    </section>

    <section data-entry="eight" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Eight digits</h2>
      <p class="text-sm text-muted">Try this: type 05122026 and press Enter: May 12, 2026.</p>
      <UFormField label="Eight digits">
        <ZDateField v-model="eight" />
      </UFormField>
      <p class="text-sm">model: <span data-testid="eight-model">{{ describe(eight) }}</span></p>
    </section>

    <UFormField label="Somewhere else">
      <UInput placeholder="Somewhere else" class="max-w-sm" />
    </UFormField>
  </main>
</template>
