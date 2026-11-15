<script setup lang="ts">
/**
 * A ZDateField that only ever mounts in the browser, as one in a dialog does, on a page with no server-rendered one.
 * Its calendar icon can then come from nowhere but the client bundle: on the index page the server-rendered fields
 * draw the same icon, and the browser reuses what they brought, so a missing registration would not show there.
 */
import type { Temporal } from 'temporal-polyfill/implementation'

const open = ref(false)
const remind = ref<Temporal.PlainDate | null>(null)
</script>

<template>
  <main class="mx-auto flex max-w-4xl items-start gap-4 px-4 py-8">
    <UButton data-open="reminder" label="Add a reminder" color="neutral" variant="outline" @click="open = true" />
    <UFormField v-if="open" data-date-field="remind" label="Remind on">
      <ZDateField v-model="remind" />
    </UFormField>
  </main>
</template>
