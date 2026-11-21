<script setup lang="ts">
const zip = ref<string | null>(null)
const digits = ref<string | null>(null)
</script>

<template>
  <div class="flex w-full max-w-xs flex-col gap-2">
    <UFormField label="ZIP code">
      <ZMaskedInput v-model="zip" v-model:raw="digits" :mask="['#####', '#####-####']" class="w-full" />
    </UFormField>
    <p class="text-sm text-muted">raw: {{ digits ?? 'null' }}</p>
  </div>
</template>
