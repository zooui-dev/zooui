<script setup lang="ts">
const { confirm, confirmDelete, confirmDiscard } = useConfirm()
const answer = ref<string>()

async function remove() {
  const yes = await confirmDelete('the Hartwell invoice', { details: ['Invoice 1042 · $1,200.00', '2 payments recorded'] })
  answer.value = yes ? 'Deleted.' : 'Kept.'
}
async function publish() {
  const yes = await confirm({ title: 'Publish the report?', description: 'Everyone in the workspace will see it.', confirmLabel: 'Publish' })
  answer.value = yes ? 'Published.' : 'Not published.'
}
async function leave() {
  answer.value = (await confirmDiscard()) ? 'Discarded.' : 'Still editing.'
}
</script>

<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap gap-2">
      <UButton label="Delete invoice" color="error" variant="outline" icon="i-lucide-trash-2" @click="remove" />
      <UButton label="Publish" @click="publish" />
      <UButton label="Close the form" color="neutral" variant="outline" @click="leave" />
    </div>
    <p v-if="answer" class="text-sm text-muted">{{ answer }}</p>
  </div>
</template>
