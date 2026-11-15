<script setup lang="ts">
const items = [
  { label: 'No project', value: SELECT_NONE },
  { label: 'Kitchen remodel', value: 'p-1' },
  { label: 'Roof repair', value: 'p-2' },
]
const project = ref(SELECT_NONE)
</script>

<template>
  <div class="flex w-full max-w-xs flex-col gap-3">
    <UFormField label="Project">
      <USelect v-model="project" :items="items" class="w-full" />
    </UFormField>
    <p class="m-0 text-sm text-muted">
      Update sends <code>{{ JSON.stringify({ project: selectNoneToNull(project) }) }}</code>
    </p>
  </div>
</template>
