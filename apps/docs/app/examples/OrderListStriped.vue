<script setup lang="ts">
const steps = ref(Array.from({ length: 12 }, (_, i) => ({ id: i + 1, text: `Step ${i + 1}` })))
const stepId = ref<string | number | null>(1)
</script>

<template>
  <div class="w-full max-w-xs">
    <ZOrderList v-model="steps" v-model:selection="stepId" :row-key="(s) => s.id" label="Steps" max-height="10rem" striped :allow-add="false">
      <template #item="{ item }">{{ item.text }}</template>
    </ZOrderList>
  </div>
</template>
