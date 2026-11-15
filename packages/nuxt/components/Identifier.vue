<script setup lang="ts">
import { ident, cx } from "./recipes";
withDefaults(defineProps<{ kind?: keyof typeof ident.kind }>(), { kind: "package" });
</script>

<template>
  <span :class="cx(ident.base, ident.kind[kind])"><slot /></span>
</template>
