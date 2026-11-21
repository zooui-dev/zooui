<script setup lang="ts">
/**
 * A status: a mark and a label. The five built-ins (healthy, warn, suspended, unreachable, quiet) are drawn by shape.
 * A product's own statuses come from app.config `zooui.status.states` and the `states` prop (key → label, icon,
 * color), merged over the built-ins field by field (useStatusStates); each draws its icon, or a dot, in its color.
 * A key the map lacks falls back to `zooui.status.fallback`, then "Unknown" with a help icon.
 */
import type { StatusKey } from '../composables/useStatusStates'
import type { StatusStateMap } from '../utils/status-states'
import { status, cx } from "./recipes";

const props = withDefaults(defineProps<{
  state?: StatusKey | (string & {});
  /** Statuses for this one, over app.config's and the built-ins. */
  states?: StatusStateMap;
  pill?: boolean;
  /** A soft glow around the healthy dot. Other states stay unlit. */
  glow?: boolean;
}>(), { state: "healthy", pill: false, glow: false });

const { info } = useStatusStates(() => props.states);
const entry = computed(() => info(props.state));
</script>

<template>
  <!-- Shape carries the state; color only reinforces it, so this survives
       grayscale. Always render the glyph child. -->
  <span
    :class="cx(status.base, entry.shape ? status.state[entry.shape] : status.custom, pill ? cx(status.pill, status.size.pill) : status.size.plain)"
    :data-state-known="entry.known ? undefined : 'false'"
  >
    <span v-if="entry.shape" :class="cx(status.glyph, status.shape[entry.shape], glow && entry.shape === 'healthy' && status.glow)" aria-hidden="true" />
    <UIcon v-else-if="entry.icon" :name="entry.icon" :class="cx(status.icon, status.ink[entry.color])" aria-hidden="true" />
    <span v-else :class="cx(status.glyph, status.dot, status.fill[entry.color])" aria-hidden="true" />
    <slot>{{ entry.label }}</slot>
  </span>
</template>
