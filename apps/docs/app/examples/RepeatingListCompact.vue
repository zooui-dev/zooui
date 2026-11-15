<script setup lang="ts">
const parts = ref<{ amount: string }[]>([])
</script>

<template>
  <div class="w-full max-w-sm">
    <ZRepeatingList
      v-model="parts"
      item-label="part"
      compact
      :min="2"
      :max="4"
      :new-row="() => ({ amount: '' })"
    >
      <template #row="{ row, index }">
        <UInput v-model="row.amount" :aria-label="`Part ${index + 1} amount`" inputmode="decimal" placeholder="0.00" />
      </template>
    </ZRepeatingList>
  </div>
</template>
