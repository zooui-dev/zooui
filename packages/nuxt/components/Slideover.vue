<script setup lang="ts">
/**
 * USlideover with Zoo UI's colored edge: side drawer — a top edge, as for every overlay. Only `color` is added
 * — every other prop, `v-model`, event and slot passes straight through to Nuxt UI's USlideover, so its
 * behavior and polish are untouched. No `color`, no edge: a plain USlideover.
 */
import { edge, useSectionAccent, withEdge, withSectionAccent, type EdgeColor } from './edge'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ color?: EdgeColor; ui?: Record<string, any> }>()
const ui = computed(() => withEdge(props.ui, 'content', edge('top', props.color)))
// `accent`: the overlay portals to <body>, so it takes the name of the section it was opened from
const section = useSectionAccent()
</script>

<template>
  <USlideover v-bind="$attrs" :ui="ui" :content="withSectionAccent($attrs.content, color, section)">
    <template v-for="(_, name) in $slots" #[name]="scope">
      <slot :name="name" v-bind="scope ?? {}" />
    </template>
  </USlideover>
</template>
