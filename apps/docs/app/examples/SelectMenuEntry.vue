<script setup lang="ts">
const states = [
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'NY', name: 'New York' },
  { code: 'TX', name: 'Texas' },
]
const kinds = ['Delivery', 'Pickup', 'Shipping']
const form = reactive({ customer: '', state: undefined as string | undefined, kind: undefined as string | undefined })
</script>

<template>
  <div class="flex w-full flex-wrap items-end gap-3">
    <UFormField label="Customer"><UInput v-model="form.customer" /></UFormField>
    <UFormField label="State">
      <ZSelectMenu v-model="form.state" :items="states" value-key="code" label-key="name" open-on-focus class="w-44" />
    </UFormField>
    <UFormField label="Kind">
      <ZSelectMenu v-model="form.kind" :items="kinds" :search-input="false" open-on-focus class="w-36" />
    </UFormField>
  </div>
</template>
