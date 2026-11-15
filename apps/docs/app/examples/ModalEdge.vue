<script setup lang="ts">
const open = ref(false)
</script>

<template>
  <UButton color="error" variant="outline" @click="open = true">Delete workspace</UButton>

  <ZModal v-model:open="open" color="error" title="Delete workspace?" description="This cannot be undone.">
    <template #body>
      <p class="text-sm text-muted">Every service, token and log in this workspace is removed.</p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton color="neutral" variant="ghost" @click="open = false">Cancel</UButton>
        <UButton color="error" @click="open = false">Delete</UButton>
      </div>
    </template>
  </ZModal>
</template>
