<script setup lang="ts">
interface Step { id?: string, name: string }

const steps = ref<Step[]>([
  { id: 'step-1', name: 'Gather receipts' },
  { id: 'step-2', name: 'Reconcile accounts' },
  { id: 'step-3', name: 'File the return' },
])
const newStep = (): Step => ({ name: '' })
const stepKey = (s: Step) => s.id
const stepTitle = (s: Step, i: number) => s.name || `Step ${i + 1}`
</script>

<template>
  <div class="w-full max-w-lg">
    <ZRepeatingList
      v-model="steps"
      item-label="step"
      reorderable
      move-to-ends
      :row-key="stepKey"
      :row-title="stepTitle"
      :new-row="newStep"
    >
      <template #row="{ row }">
        <UFormField label="Step">
          <UInput v-model="row.name" />
        </UFormField>
      </template>
      <template #summary="{ row }">{{ row.name }}</template>
    </ZRepeatingList>
  </div>
</template>
