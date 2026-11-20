<script setup lang="ts">
const rows = ref(['Labor', 'Materials', 'Travel'])
</script>

<template>
  <ul class="flex w-full max-w-sm flex-col divide-y divide-default">
    <li v-for="(row, i) in rows" :key="row" class="flex items-center justify-between py-2 text-sm">
      {{ row }}
      <ZConfirmButton
        :aria-label="`Remove ${row}`"
        icon="i-lucide-trash-2"
        color="error"
        variant="ghost"
        size="sm"
        question="Remove this row?"
        description="Its amount leaves the total."
        confirm-label="Remove"
        cancel-label="Keep"
        :content="{ side: 'bottom', align: 'end' }"
        @confirm="rows.splice(i, 1)"
      />
    </li>
    <li v-if="!rows.length" class="py-2 text-sm text-muted">No rows left.</li>
  </ul>
</template>
