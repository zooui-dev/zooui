<script setup lang="ts">
const linux = [
  { label: 'slot 1 · free', available: true },
  { label: 'slot 2 · build 4812', available: false, title: 'Held since 09:41' },
  { label: 'slot 3 · free', available: true },
]
</script>

<template>
  <ZSlots :slots="linux" label="Linux VMs: 2 of 3 free" />
</template>
