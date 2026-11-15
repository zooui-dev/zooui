<script setup lang="ts">
const colors = ['primary', 'success', 'warning', 'error'] as const
</script>

<template>
  <div class="w-full grid sm:grid-cols-2 gap-3">
    <ZCard>
      <p class="font-semibold">No color</p>
      <p class="text-sm text-muted">A plain Nuxt UI card.</p>
    </ZCard>
    <ZCard v-for="c in colors" :key="c" :color="c">
      <p class="font-semibold capitalize">{{ c }}</p>
      <p class="text-sm text-muted">A card with the {{ c }} edge.</p>
    </ZCard>
  </div>
</template>
