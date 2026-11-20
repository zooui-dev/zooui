<script setup lang="ts">
const projects = ['Website redesign', 'Fees (monthly)', 'Design system review', '<b>Bold</b> launch plan']
const query = ref('de')
</script>

<template>
  <div class="flex flex-col items-start gap-3">
    <UInput v-model="query" placeholder="Search projects" aria-label="Search projects" />
    <ul class="flex flex-col gap-1 text-sm">
      <li v-for="project in projects" :key="project"><ZHighlight :text="project" :query="query" /></li>
    </ul>
  </div>
</template>
