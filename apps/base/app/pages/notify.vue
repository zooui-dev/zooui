<script setup lang="ts">
/** useNotify() and errorMessage(), with every toast on screen written out for the tests. */
const notify = useNotify()
const { toasts } = useToast()

const TONES = ['success', 'info', 'warning', 'error', 'primary'] as const
const SAMPLES: Record<(typeof TONES)[number], [string, string]> = {
  success: ['Project saved', 'The Lakeside project is up to date.'],
  info: ['Sync started', 'Files appear as they arrive.'],
  warning: ['Two tasks have no owner', 'Assign them before the sprint starts.'],
  error: ['Couldn’t save the project', 'The server didn’t answer.'],
  primary: ['Invite sent', 'Sam will get an email.'],
}

const REFERENCE_ICONS = [
  { label: 'success and primary', name: NOTIFY_ICONS.success },
  { label: 'info', name: NOTIFY_ICONS.info },
  { label: 'warning', name: NOTIFY_ICONS.warning },
  { label: 'error (and danger)', name: NOTIFY_ICONS.error },
  { label: 'passed in as an option', name: 'i-lucide-circle-check' },
]

/** What $fetch throws: an Error whose `data` is the response body. */
const fetchError = (data: unknown) => Object.assign(new Error('[POST] "/api/projects": 400 Bad Request'), { data })
const ERRORS: { id: string, label: string, error: unknown }[] = [
  { id: 'problem', label: 'Problem details (detail)', error: fetchError({ type: 'about:blank', title: 'Conflict', status: 409, detail: 'The project was changed by someone else.' }) },
  { id: 'fields', label: 'Field errors (errors record)', error: fetchError({ title: 'One or more validation errors occurred.', errors: { name: ['Name is required'], budget: ['Budget must be positive'] } }) },
  { id: 'list', label: 'An errors array', error: fetchError({ errors: ['The plan is full', 'Seats are locked'] }) },
  { id: 'message', label: 'A message', error: fetchError({ message: 'Upload too large' }) },
  { id: 'plain', label: 'A plain Error', error: new Error('Network down') },
  { id: 'product', label: 'The product’s own shape (app.config extractor)', error: fetchError({ fault: { reason: 'Monthly quota reached' } }) },
  { id: 'empty', label: 'Nothing readable', error: {} },
]

function caught(id: string) {
  notify.error('Couldn’t save the project', ERRORS.find((e) => e.id === id)!.error)
}

/** A real request to a route that isn't there: the server's own 404 body. */
async function realFetch() {
  try { await $fetch('/api/no-such-route') } catch (err) { notify.error('Couldn’t load the report', err) }
}

function withAction() {
  notify.success('Task archived', undefined, {
    actions: [{ label: 'Undo', onClick: () => { notify.info('Task restored') } }],
  })
}
function withOwnIcon() {
  notify.info('Backup running', 'You can keep working.', { icon: 'i-lucide-circle-check', duration: 9000 })
}
function titleOnly() {
  notify.warning('Offline')
}
</script>

<template>
  <main class="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-8">
    <header class="flex flex-col gap-1">
      <h2 class="text-xl font-semibold text-highlighted">useNotify() and errorMessage()</h2>
      <p class="text-sm text-muted">
        Each button raises one toast through useNotify(); the toasts appear in the corner, in UApp's toaster.
        "Live toasts" at the bottom lists every toast on screen as color · icon · duration in ms, so the tests (and you)
        can read what each call set. This app's app.config gives warning toasts 6000 ms and reads a "fault.reason"
        shape of its own. The Playwright specs in tests/notify.spec.ts drive this page.
      </p>
    </header>

    <section class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">The tones</h3>
      <p class="text-sm text-muted">
        Try: click each one. Each has its own color and icon, a title and a description, and a close button.
      </p>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="tone in TONES"
          :key="tone"
          :label="`notify.${tone}()`"
          :color="tone"
          variant="outline"
          :data-notify="tone"
          @click="notify[tone](...SAMPLES[tone])"
        />
        <UButton label="notify.danger() (the alias)" color="error" variant="ghost" data-notify="danger" @click="notify.danger('Couldn’t delete the file', 'It is open elsewhere.')" />
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">Each tone's icon</h3>
      <p class="text-sm text-muted">
        The icon useNotify() gives each tone (NOTIFY_ICONS), drawn here to compare with the toasts. Try: raise a toast and
        match its icon to the one listed under its tone. The last one is the icon "Its own icon and duration" passes in.
      </p>
      <ul class="flex flex-wrap gap-6 text-sm">
        <li v-for="icon in REFERENCE_ICONS" :key="icon.name" class="flex items-center gap-2">
          <UIcon :name="icon.name" :data-icon-ref="icon.name" class="size-5 text-default" />
          <span class="text-muted">{{ icon.label }}</span>
        </li>
      </ul>
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">A caught error as the description</h3>
      <p class="text-sm text-muted">
        Try: each button passes an error object straight to notify.error('Couldn’t save the project', err), and the
        toast shows the readable part of it. "Nothing readable" shows the fallback, "An error occurred".
      </p>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="e in ERRORS"
          :key="e.id"
          :label="e.label"
          color="neutral"
          variant="outline"
          :data-error="e.id"
          @click="caught(e.id)"
        />
        <UButton label="A real $fetch to a missing route" color="neutral" variant="outline" data-error="real" @click="realFetch" />
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">errorMessage() on its own</h3>
      <p class="text-sm text-muted">
        The same errors, each turned into text by errorMessage(err), as a product would show one on the page. Try:
        compare each line with the toast its button in the section above raises.
      </p>
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <template v-for="e in ERRORS" :key="e.id">
          <dt class="text-muted">{{ e.label }}</dt>
          <dd class="text-default" :data-message="e.id">{{ errorMessage(e.error) }}</dd>
        </template>
      </dl>
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="font-semibold text-highlighted">Nuxt UI's options</h3>
      <p class="text-sm text-muted">
        Try: "With an Undo action" has an Undo button that raises an info toast. "Its own icon and duration" overrides the
        info icon and stays 9000 ms. "Title only" has no description.
      </p>
      <div class="flex flex-wrap gap-2">
        <UButton label="With an Undo action" color="neutral" variant="outline" data-option="action" @click="withAction" />
        <UButton label="Its own icon and duration" color="neutral" variant="outline" data-option="icon" @click="withOwnIcon" />
        <UButton label="Title only" color="neutral" variant="outline" data-option="title-only" @click="titleOnly" />
        <UButton label="Clear all" color="neutral" variant="ghost" data-clear @click="notify.clear()" />
      </div>
    </section>

    <section class="flex flex-col gap-1">
      <h3 class="font-semibold text-highlighted">Live toasts</h3>
      <p class="text-sm text-muted">
        Every toast on screen, oldest first, as color · icon · duration. Try: raise a few toasts and watch each row's
        color, icon and duration, and the row leaving when its toast closes.
      </p>
      <ol data-toasts class="text-sm text-default">
        <li v-for="t in toasts" :key="t.id">{{ t.color }} · {{ t.icon }} · {{ t.duration }}</li>
      </ol>
    </section>
  </main>
</template>
