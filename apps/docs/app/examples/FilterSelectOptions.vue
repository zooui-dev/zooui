<script setup lang="ts">
const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent: same day' },
]
const statuses = [
  { value: 'open', label: 'Open', icon: 'i-lucide-circle' },
  { value: 'waiting', label: 'Waiting', icon: 'i-lucide-circle-pause', iconClass: 'text-warning' },
  { value: 'done', label: 'Done', icon: 'i-lucide-circle-check-big', iconClass: 'text-success' },
]
const chosen = ref<string[]>(['low', 'high'])
const counted = ref<string[]>(['open'])
const plain = ref<string[]>([])
</script>

<template>
  <div class="flex flex-wrap items-start gap-2">
    <ZFilterSelect v-model="chosen" label="Priority" :options="priorities" value-key="value" :max-shown="3" />
    <ZFilterSelect v-model="counted" label="Status" :options="statuses" value-key="value" :max-shown="0" />
    <ZFilterSelect v-model="plain" label="Stage" :options="statuses" value-key="value" :show-select-all="false" :ui="{ trigger: 'rounded-full' }" />
  </div>
</template>
