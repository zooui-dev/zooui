<script setup lang="ts">
const config = `export default defineNuxtConfig({
  extends: ['@zooui/theme-forest'],
  css: ['~/assets/css/main.css'],
})`
</script>

<template>
  <div class="flex flex-col gap-3 w-full">
    <p class="text-sm text-muted">Install with <ZCodeBlock variant="inline" code="pnpm add @zooui/theme-forest" /></p>
    <ZCodeBlock variant="line" code="pnpm add @zooui/theme-forest" />
    <ZCodeBlock variant="block" lang="ts" :code="config" />
  </div>
</template>
