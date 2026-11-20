<script setup lang="ts">
/** useConfirm(), <ZConfirmDialog> (mounted in app.vue) and <ZConfirmButton>, with each answer written out for the tests. */
const { confirm, choose, confirmDelete, confirmDiscard, dismissAll } = useConfirm()

const answers = ref<string[]>([])
const record = (label: string, value: unknown) => { answers.value.push(`${label}: ${JSON.stringify(value)}`) }

async function askConfirm() {
  record('confirm', await confirm({ title: 'Publish the report?', description: 'Everyone in the workspace will see it.', confirmLabel: 'Publish' }))
}
async function askChoose() {
  record('choose', await choose({
    title: 'Save before leaving?',
    description: 'The draft has changes.',
    actions: [
      { label: 'Discard', value: 'discard', color: 'neutral', variant: 'outline' },
      { label: 'Save', value: 'save' },
    ],
  }))
}
async function askDelete() {
  record('delete', await confirmDelete('the Hartwell invoice', { details: ['Invoice 1042 · $1,200.00', '2 payments recorded'] }))
}
async function askDiscard() {
  record('discard', await confirmDiscard())
}
/** Two questions at once: the second waits for the first. */
function askTwo() {
  confirm({ title: 'First question?' }).then((v) => record('first', v))
  confirm({ title: 'Second question?', confirmLabel: 'Yes' }).then((v) => record('second', v))
}

/** Two questions, then the app clears the line (as on sign-out) while the first is open. */
function askThenDismissAll() {
  askTwo()
  setTimeout(dismissAll, 600)
}

// On the server no one can answer: the call resolves at once, as a cancel, and the page still renders.
const serverAnswer = useState('confirm-server-answer', () => 'unset')
if (import.meta.server) serverAnswer.value = String(await confirm({ title: 'Asked on the server' }))

const buttonEvents = ref<string[]>([])
</script>

<template>
  <main class="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
    <section class="flex flex-wrap gap-2" data-specimen="confirm">
      <UButton label="Confirm" data-ask="confirm" @click="askConfirm" />
      <UButton label="Choose" data-ask="choose" @click="askChoose" />
      <UButton label="Delete" color="error" data-ask="delete" @click="askDelete" />
      <UButton label="Discard" color="warning" data-ask="discard" @click="askDiscard" />
      <UButton label="Ask two" color="neutral" variant="outline" data-ask="two" @click="askTwo" />
      <UButton label="Ask two, then dismiss all" color="neutral" variant="outline" data-ask="dismiss-all" @click="askThenDismissAll" />
    </section>
    <ol data-answers class="text-sm text-muted">
      <li v-for="(a, i) in answers" :key="i">{{ a }}</li>
    </ol>
    <p data-server-answer class="text-sm text-muted">{{ serverAnswer }}</p>

    <section class="flex items-center gap-2" data-specimen="confirm-button">
      <ZConfirmButton
        label="Remove row"
        icon="i-lucide-trash-2"
        color="error"
        variant="soft"
        size="sm"
        data-button="remove"
        question="Remove this row?"
        description="Its amounts leave the total."
        confirm-label="Remove"
        cancel-label="Keep"
        @confirm="buttonEvents.push('confirm')"
        @cancel="buttonEvents.push('cancel')"
      />
    </section>
    <p data-button-events class="text-sm text-muted">{{ buttonEvents.join(',') }}</p>
  </main>
</template>
