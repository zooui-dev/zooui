<script setup lang="ts">
/** A Forest ramp as swatches, painted from the live palette variables so they follow the scheme picker. */
const props = defineProps<{ ramp: 'pine' | 'accent' }>()

const STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
const prefix = computed(() => (props.ramp === 'pine' ? '--pine' : '--teal'))
</script>

<template>
  <div class="not-prose my-4 grid grid-cols-6 sm:grid-cols-11 gap-1.5" :data-ramp="ramp">
    <div v-for="stop in STOPS" :key="stop" class="flex flex-col gap-1">
      <div class="h-10 rounded-sm ring ring-inset ring-black/10 dark:ring-white/10" :style="{ backgroundColor: `var(--color-${ramp}-${stop})` }" />
      <span class="font-mono text-[11px] text-muted text-center">{{ stop }}</span>
    </div>
    <p class="col-span-full font-mono text-xs text-dimmed mt-1">{{ prefix }}-*</p>
  </div>
</template>
