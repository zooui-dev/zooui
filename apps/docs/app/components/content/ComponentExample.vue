<script setup lang="ts">
/**
 * A live example in a page: `::component-example{name="KickerBracket"}` renders app/examples/KickerBracket.vue, then
 * shows that file's source on Zoo UI's own code surface. `data-mounted` turns true once the example component has
 * mounted in the browser (hydrated), which the tests read.
 */
const props = defineProps<{
  /** The example's file in app/examples/, without `.vue`. */
  name: string
  /** Hide the source, for an example whose code a neighboring example already shows. */
  hideCode?: boolean
}>()

const { component, source } = await loadExample(props.name)
const mounted = ref(false)
</script>

<template>
  <div class="not-prose my-6 flex flex-col gap-2" :data-example="name" :data-mounted="mounted">
    <div class="p-6 rounded-md ring ring-default bg-default flex flex-wrap items-center gap-4" data-example-preview>
      <component :is="component" @vue:mounted="mounted = true" />
    </div>
    <ZCodeBlock v-if="!hideCode" variant="block" :code="source" :wrap="false" data-example-source />
  </div>
</template>
