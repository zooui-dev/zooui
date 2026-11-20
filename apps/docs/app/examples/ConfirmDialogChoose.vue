<script setup lang="ts">
const { choose } = useConfirm()
const answer = ref<string>()

async function leave() {
  const picked = await choose({
    title: 'Save before leaving?',
    description: 'The draft has changes that haven’t been saved.',
    actions: [
      { label: 'Discard', value: 'discard' as const, color: 'neutral', variant: 'outline' },
      { label: 'Save', value: 'save' as const },
    ],
  })
  answer.value = picked === null ? 'Stayed on the page.' : picked === 'save' ? 'Saved, then left.' : 'Left without saving.'
}
</script>

<template>
  <div class="flex flex-col items-start gap-3">
    <UButton label="Leave the page" color="neutral" variant="outline" @click="leave" />
    <p v-if="answer" class="text-sm text-muted">{{ answer }}</p>
  </div>
</template>
