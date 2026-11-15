<script setup lang="ts">
const npmrc = '@acme:registry=https://registry.npmjs.org/\n//registry.npmjs.org/:_authToken=${NPM_TOKEN}'
const copies = ref(0)
</script>

<template>
  <div class="flex flex-col gap-2 w-full">
    <ZCodeBlock variant="block" lang="npmrc" token="${NPM_TOKEN}" :code="npmrc" @copy="copies++" />
    <p class="text-xs text-muted">Copied {{ copies }} {{ copies === 1 ? 'time' : 'times' }}</p>
  </div>
</template>
