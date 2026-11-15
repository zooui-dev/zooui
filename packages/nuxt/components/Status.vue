<script setup lang="ts">
import { status, cx } from "./recipes";

const LABELS = {
  healthy: "Healthy", warn: "Near limit", suspended: "Suspended",
  unreachable: "Unreachable", quiet: "Quiet",
} as const;

const props = withDefaults(defineProps<{
  state?: keyof typeof LABELS;
  pill?: boolean;
  /** A soft glow around the healthy dot. Other states stay unlit. */
  glow?: boolean;
}>(), { state: "healthy", pill: false, glow: false });
</script>

<template>
  <!-- Shape carries the state; color only reinforces it, so this survives
       grayscale. Always render the glyph child. -->
  <span :class="cx(status.base, status.state[state], pill ? cx(status.pill, status.size.pill) : status.size.plain)">
    <span :class="cx(status.glyph, status.shape[state], glow && state === 'healthy' && status.glow)" aria-hidden="true" />
    <slot>{{ LABELS[props.state] }}</slot>
  </span>
</template>
