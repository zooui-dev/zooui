<script setup lang="ts">
const states = ['healthy', 'warn', 'suspended', 'unreachable', 'quiet'] as const
</script>

<template>
  <div class="flex items-center gap-4 flex-wrap">
    <ZStatus v-for="state in states" :key="state" :state="state" />
  </div>
</template>
