<script setup lang="ts">
import { kicker, cx } from "./recipes";
withDefaults(defineProps<{ variant?: keyof typeof kicker.variant }>(), { variant: "bracket" });
</script>

<template>
  <div :class="cx(kicker.base, kicker.variant[variant])"><slot /></div>
</template>
