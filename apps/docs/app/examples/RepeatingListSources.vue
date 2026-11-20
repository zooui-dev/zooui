<script setup lang="ts">
interface Source { id?: string, name: string, company: string }

const sources = ref<Source[]>([
  { id: 'src-1', name: 'Pat Brown', company: 'Brown Architects' },
  { id: 'src-2', name: 'Sam Lee', company: 'Lee Plumbing' },
])
const newSource = (): Source => ({ name: '', company: '' })
const sourceKey = (s: Source) => s.id
</script>

<template>
  <div class="w-full max-w-lg">
    <ZRepeatingList
      v-model="sources"
      item-label="contact"
      :row-key="sourceKey"
      :new-row="newSource"
    >
      <template #row="{ row }">
        <UFormField label="Name">
          <UInput v-model="row.name" />
        </UFormField>
        <UFormField label="Company">
          <UInput v-model="row.company" />
        </UFormField>
      </template>
      <template #summary="{ row }">{{ [row.name, row.company].filter(Boolean).join(' · ') }}</template>
    </ZRepeatingList>
  </div>
</template>
