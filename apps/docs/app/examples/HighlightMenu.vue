<script setup lang="ts">
const everyone = [
  { id: 1, name: 'Ana Lopez', email: 'ana.lopez@example.com' },
  { id: 2, name: 'Sam Lee', email: 'sam@example.com' },
  { id: 3, name: 'Jordan Banks', email: 'j.banks@example.com' },
]
const person = ref<(typeof everyone)[number]>()
const searchTerm = ref('')
const people = computed(() => everyone.filter((p) => filterSelectMatches(p.name, searchTerm.value) || filterSelectMatches(p.email, searchTerm.value)))
</script>

<template>
  <UInputMenu
    v-model="person"
    v-model:search-term="searchTerm"
    :items="people"
    label-key="name"
    description-key="email"
    ignore-filter
    placeholder="Search by name or email"
    class="w-72"
  >
    <template #item-label="{ item }"><ZHighlight :text="item.name" :query="searchTerm" /></template>
    <template #item-description="{ item }"><ZHighlight :text="item.email" :query="searchTerm" /></template>
  </UInputMenu>
</template>
