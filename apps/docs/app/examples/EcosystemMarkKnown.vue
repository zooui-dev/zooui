<script setup lang="ts">
const ecosystems = ['npm', 'nuget', 'winget', 'chocolatey', 'scoop', 'homebrew'] as const
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-3">
      <ZEcosystemMark v-for="e in ecosystems" :key="e" :ecosystem="e" size="md" />
    </div>
    <div class="flex items-center gap-4 flex-wrap">
      <ZEcosystemMark ecosystem="winget" with-label />
      <ZEcosystemMark ecosystem="scoop" with-label disabled />
    </div>
  </div>
</template>
