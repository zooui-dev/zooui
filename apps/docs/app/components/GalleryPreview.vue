<script setup lang="ts">
/** One example rendered small in a gallery card: the component only, without its source. */
const props = defineProps<{ name: string }>()
const { component } = await loadExample(props.name, { withSource: false })
</script>

<template>
  <component :is="component" />
</template>
