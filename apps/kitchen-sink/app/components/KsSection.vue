<script setup lang="ts">
/** One group of specimens. The id is the header nav's anchor. */
defineProps<{ id: string; title: string; note?: string }>()
</script>

<template>
  <section :id="id" class="scroll-mt-20 flex flex-col gap-4">
    <div class="flex flex-col gap-1 border-b border-default pb-2">
      <h2 class="text-xl font-semibold">{{ title }}</h2>
      <p v-if="note" class="text-sm text-muted">{{ note }}</p>
    </div>
    <div class="flex flex-col gap-5"><slot /></div>
  </section>
</template>
