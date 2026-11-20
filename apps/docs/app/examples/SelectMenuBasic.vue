<script setup lang="ts">
const fruits = ['Apple', 'Banana', 'Blueberry', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape']
const fruit = ref('Cherry')
</script>

<template>
  <div class="w-full max-w-xs">
    <UFormField label="Fruit" help="Focus it and type b, b again, or bl (the search starts from the top); or open it, arrow down and press Tab">
      <ZSelectMenu v-model="fruit" :items="fruits" class="w-full" />
    </UFormField>
  </div>
</template>
