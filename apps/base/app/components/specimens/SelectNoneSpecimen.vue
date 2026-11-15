<script setup lang="ts">
/**
 * A USelect with an explicit "None" option, as a product's project pickers have: the option holds SELECT_NONE, because
 * reka-ui throws on `value=""`. The model starts on a real value so the test can choose None, and the two lines
 * below it show what an API call would carry (a create sends nothing, an update sends null).
 */
const items = [
  { label: 'None', value: SELECT_NONE },
  { label: 'Kitchen remodel', value: 'p-1' },
  { label: 'Roof repair', value: 'p-2' },
]
const project = ref('p-1')
</script>

<template>
  <section id="select-none" data-specimen="select-none" class="flex flex-col gap-3">
    <UFormField label="Project">
      <USelect v-model="project" :items="items" class="w-56" />
    </UFormField>
    <p class="text-sm text-muted">Create sends <code data-select-none="create">{{ JSON.stringify({ project: selectNoneToUndefined(project) }) }}</code></p>
    <p class="text-sm text-muted">Update sends <code data-select-none="update">{{ JSON.stringify({ project: selectNoneToNull(project) }) }}</code></p>
  </section>
</template>
