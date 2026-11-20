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

/** A warning badge and edge with a primary button: not destructive, so focus starts on the button. */
async function askMixed() {
  record('mixed', await confirm({
    title: 'Publish with warnings?',
    description: 'Two schedules have unreviewed lines.',
    color: 'warning',
    confirmColor: 'primary',
    confirmLabel: 'Publish anyway',
  }))
}
/** A warning badge with a red button: destructive, so focus starts on Cancel. The icon comes from `warning`. */
async function askWarnRed() {
  record('warn-red', await confirm({
    title: 'Overwrite the filed return?',
    description: 'The filed copy is replaced by this draft.',
    color: 'warning',
    confirmColor: 'error',
    confirmLabel: 'Overwrite',
  }))
}
/** `color: 'error'` and no icon given: the error color's own icon. */
async function askErrorIcon() {
  record('error-icon', await confirm({ title: 'Revoke the API token?', color: 'error', confirmLabel: 'Revoke' }))
}
/** `icon: false`: no icon, even in the error color. */
async function askNoIcon() {
  record('no-icon', await confirm({ title: 'Remove the client?', color: 'error', icon: false, confirmLabel: 'Remove' }))
}
/** Two-part details: a `\n` in a string, a `{ title, text }`, and a plain one-line detail beside them. */
async function askDetails() {
  record('details', await confirm({
    title: 'Import with mismatches?',
    color: 'warning',
    confirmLabel: 'Import',
    details: [
      'Report Basis Mismatch\nThis file is on the cash basis; the client reports on accrual.',
      { title: 'Missing accounts', text: '3 accounts in the file aren’t in the chart of accounts.' },
      '12 transactions will be imported',
    ],
  }))
}
/** `dismissible: false`: Escape and a click outside do nothing; Cancel and the close button still cancel. */
async function askSticky() {
  record('sticky', await confirm({
    title: 'Sign the engagement letter?',
    description: 'Escape and a click outside won’t close this one.',
    dismissible: false,
    confirmLabel: 'Sign',
  }))
}
/** `size: 'lg'`: Buoy's widest confirm. */
async function askWide() {
  record('wide', await confirm({ title: 'Apply the mapping to every client?', description: 'Each client’s chart of accounts is remapped.', size: 'lg', confirmLabel: 'Apply' }))
}

// On the server no one can answer: the call resolves at once, as a cancel, and the page still renders.
const serverAnswer = useState('confirm-server-answer', () => 'unset')
if (import.meta.server) serverAnswer.value = String(await confirm({ title: 'Asked on the server' }))

const buttonEvents = ref<string[]>([])
const askFirst = ref(true)
const archiveEvents = ref<string[]>([])
const revokeEvents = ref<string[]>([])
</script>

<template>
  <main class="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-8">
    <header class="flex flex-col gap-1">
      <h2 class="text-xl font-semibold text-highlighted">useConfirm(), ZConfirmDialog and ZConfirmButton</h2>
      <p class="text-sm text-muted">
        Each button in the first sections asks one question through useConfirm(); the dialog is the one ZConfirmDialog
        mounted in app.vue. "Answers" lists what each question resolved to, newest last. The ZConfirmButton sections
        below each have their own "Events" line listing what that button emitted. The Playwright specs in
        tests/confirm.spec.ts drive this page.
      </p>
    </header>

    <section class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">The helpers</h3>
      <p class="text-sm text-muted">
        Try: open each one and leave it by its action, Cancel, Escape, the close button and a click outside. Delete and
        Discard open with focus on the safe button; Confirm and Choose on the confirming one.
      </p>
      <div class="flex flex-wrap gap-2" data-specimen="confirm">
        <UButton label="Confirm" data-ask="confirm" @click="askConfirm" />
        <UButton label="Choose" data-ask="choose" @click="askChoose" />
        <UButton label="Delete" color="error" data-ask="delete" @click="askDelete" />
        <UButton label="Discard" color="warning" data-ask="discard" @click="askDiscard" />
        <UButton label="Ask two" color="neutral" variant="outline" data-ask="two" @click="askTwo" />
        <UButton label="Ask two, then dismiss all" color="neutral" variant="outline" data-ask="dismiss-all" @click="askThenDismissAll" />
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">The button's own color (confirmColor)</h3>
      <p class="text-sm text-muted">
        Try: "Warning, primary button" has a warning badge and edge with a primary Publish anyway, and opens on it.
        "Warning, red button" has a red Overwrite and opens on Cancel, because a red button makes it destructive.
      </p>
      <div class="flex flex-wrap gap-2">
        <UButton label="Warning, primary button" color="warning" variant="outline" data-ask="mixed" @click="askMixed" />
        <UButton label="Warning, red button" color="warning" variant="outline" data-ask="warn-red" @click="askWarnRed" />
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">An icon from the color</h3>
      <p class="text-sm text-muted">
        Try: "Error, no icon given" shows the error color's circle-alert icon without naming one (the warning dialogs
        above show the warning triangle the same way); "Error, icon: false" shows none.
      </p>
      <div class="flex flex-wrap gap-2">
        <UButton label="Error, no icon given" color="error" variant="outline" data-ask="error-icon" @click="askErrorIcon" />
        <UButton label="Error, icon: false" color="error" variant="outline" data-ask="no-icon" @click="askNoIcon" />
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">Two-part details</h3>
      <p class="text-sm text-muted">
        Try: open it. The first detail is one string with a line break, the second a { title, text } object; both show
        a heading over their text. The third is a plain line.
      </p>
      <div class="flex flex-wrap gap-2">
        <UButton label="Import with details" color="neutral" variant="outline" data-ask="details" @click="askDetails" />
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">Not dismissible</h3>
      <p class="text-sm text-muted">
        Try: open it and press Escape or click outside: it stays open. Cancel or the close button (×) cancels it.
      </p>
      <div class="flex flex-wrap gap-2">
        <UButton label="Sign (dismissible: false)" color="neutral" variant="outline" data-ask="sticky" @click="askSticky" />
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">Width (size)</h3>
      <p class="text-sm text-muted">
        Try: open it beside Confirm: size 'lg' is wider than the default 'sm'. In every dialog Cancel sits on the left
        and the answers on the right.
      </p>
      <div class="flex flex-wrap gap-2">
        <UButton label="Wide (size: 'lg')" color="neutral" variant="outline" data-ask="wide" @click="askWide" />
      </div>
    </section>

    <section class="flex flex-col gap-1">
      <h3 class="font-semibold text-highlighted">Answers</h3>
      <p class="text-sm text-muted">What each question resolved to, as "helper: value".</p>
      <ol data-answers class="text-sm text-default">
        <li v-for="(a, i) in answers" :key="i">{{ a }}</li>
      </ol>
      <p class="text-sm text-muted">
        Asked during server rendering, which resolves at once: <span data-server-answer class="text-default">{{ serverAnswer }}</span>
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">ZConfirmButton</h3>
      <p class="text-sm text-muted">
        Try: click Remove row, then Keep, Escape, a click outside, or Remove. Only Remove emits confirm.
      </p>
      <div class="flex items-center gap-2" data-specimen="confirm-button">
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
      </div>
      <p class="text-sm text-muted">Events: <span data-button-events class="text-default">{{ buttonEvents.join(',') }}</span></p>
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">Asking only sometimes (confirm-enabled)</h3>
      <p class="text-sm text-muted">
        Try: untick "Ask before archiving" and click Archive: it emits confirm at once, with no question. Tick it again
        and Archive asks first, with its own question icon (question-icon="i-lucide-triangle-alert").
      </p>
      <div class="flex items-center gap-4">
        <UCheckbox v-model="askFirst" label="Ask before archiving" data-ask-first />
        <ZConfirmButton
          label="Archive"
          color="neutral"
          variant="outline"
          size="sm"
          data-button="archive"
          :confirm-enabled="askFirst"
          question="Archive the engagement?"
          question-icon="i-lucide-triangle-alert"
          confirm-label="Archive"
          @confirm="archiveEvents.push('confirm')"
          @cancel="archiveEvents.push('cancel')"
        />
      </div>
      <p class="text-sm text-muted">Events: <span data-archive-events class="text-default">{{ archiveEvents.join(',') }}</span></p>
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">Each part of the look turned off</h3>
      <p class="text-sm text-muted">
        Remove row above has the defaults: an arrow pointing at the button, the alert icon before the question, and an
        outlined Yes. Try: click Revoke token, which has none of them (:arrow="false", :question-icon="false") and a
        solid Revoke (confirm-variant="solid").
      </p>
      <div class="flex items-center gap-2">
        <ZConfirmButton
          label="Revoke token"
          color="neutral"
          variant="outline"
          size="sm"
          data-button="revoke"
          question="Revoke this token?"
          description="Apps using it stop working."
          confirm-label="Revoke"
          confirm-variant="solid"
          :question-icon="false"
          :arrow="false"
          @confirm="revokeEvents.push('confirm')"
          @cancel="revokeEvents.push('cancel')"
        />
      </div>
      <p class="text-sm text-muted">Events: <span data-revoke-events class="text-default">{{ revokeEvents.join(',') }}</span></p>
    </section>
  </main>
</template>
