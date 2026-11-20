<script setup lang="ts">
interface Status { id: string; name: string }

const statuses = ref<Status[]>([
  { id: 'open', name: 'Open' },
  { id: 'in-progress', name: 'In progress' },
  { id: 'review', name: 'Review' },
  { id: 'done', name: 'Done' },
])
const selectedId = ref<string | number | null>('in-progress')
const selected = computed(() => statuses.value.find((s) => s.id === selectedId.value))
let added = 0

function add() {
  const status = { id: `new-${++added}`, name: 'New status' }
  statuses.value.push(status)
  selectedId.value = status.id
}
</script>

<template>
  <div class="grid w-full gap-5 sm:grid-cols-2">
    <ZOrderList
      v-model="statuses"
      v-model:selection="selectedId"
      :row-key="(s) => s.id"
      :row-title="(s) => s.name"
      title="Statuses"
      item-label="status"
      allow-remove
      remove-question="Delete this status?"
      @add="add"
      @remove="(s) => (statuses = statuses.filter((x) => x !== s))"
    >
      <template #item="{ item }">{{ item.name }}</template>
    </ZOrderList>
    <div v-if="selected" class="flex flex-col gap-4 rounded-md border border-default p-4">
      <UFormField label="Name">
        <UInput v-model="selected.name" class="w-full" />
      </UFormField>
    </div>
    <p v-else class="text-sm text-muted">Choose a status to edit it.</p>
  </div>
</template>
