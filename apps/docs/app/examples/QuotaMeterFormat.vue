<script setup lang="ts">
const seats = (used: number, quota: number) => `${used} of ${quota} seats`
</script>

<template>
  <div class="w-full max-w-sm">
    <ZQuotaMeter :used="9" :quota="12" unit="seats" :warn-at="0.7" :format="seats" />
  </div>
</template>
