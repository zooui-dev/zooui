<script setup lang="ts">
const phone = ref<string | null>(null)
const taxId = ref<string | null>(null)
</script>

<template>
  <div class="flex w-full max-w-xs flex-col gap-4">
    <UFormField label="Support phone" help="Formatted when you leave the field">
      <ZMaskedInput v-model="phone" preset="phone" class="w-full" />
    </UFormField>
    <UFormField label="Vendor tax ID" help="A dash after two digits switches to an EIN">
      <ZMaskedInput v-model="taxId" preset="tax-id" class="w-full" />
    </UFormField>
  </div>
</template>
