<script setup lang="ts">
const expenses = ref<number | null>(1200)
const cell = ref<number | null>(250)
const editor = useTemplateRef<{ evaluate: () => unknown }>('editor')
</script>

<template>
  <div class="grid w-full max-w-xs gap-3">
    <UFormField label="Expenses" help="Type +50*2 and press Enter.">
      <ZNumberInput v-model="expenses" unit="money" calc class="w-full" />
    </UFormField>
    <UFormField label="Grid cell" :help="`Holds ${cell ?? 'nothing'} until evaluated.`">
      <div class="flex gap-2">
        <ZNumberInput ref="editor" v-model="cell" unit="money" calc :spin="false" :commit-on-blur="false" class="w-full" />
        <UButton variant="soft" @click="editor?.evaluate()">Evaluate</UButton>
      </div>
    </UFormField>
  </div>
</template>
