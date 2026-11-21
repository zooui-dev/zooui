<script setup lang="ts">
const website = ref<string | null>(null)
const error = ref<string | null>(null)
</script>

<template>
  <div class="w-full max-w-xs">
    <UFormField label="Website" :error="error ?? undefined" help="Type example.com and leave the field">
      <ZUrlInput v-model="website" v-model:error="error" class="w-full" />
    </UFormField>
  </div>
</template>
