<script setup lang="ts">
/**
 * UCard with Zoo UI's colored edge: card — a left edge, like Zoo UI's callout. Only `color` is added — every
 * other prop, `v-model`, event and slot passes straight through to Nuxt UI's UCard, so its behavior and
 * polish are untouched. No `color`, no edge: a plain UCard.
 */
import { edge, withEdge, type EdgeColor } from './edge'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ color?: EdgeColor; ui?: Record<string, any> }>()
const ui = computed(() => withEdge(props.ui, 'root', edge('left', props.color)))
</script>

<template>
  <UCard v-bind="$attrs" :ui="ui">
    <template v-for="(_, name) in $slots" #[name]="scope">
      <slot :name="name" v-bind="scope ?? {}" />
    </template>
  </UCard>
</template>
