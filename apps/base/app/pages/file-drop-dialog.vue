<script setup lang="ts">
/**
 * A transfer dialog's Files field, as a product's send-a-transfer dialog has it (tests/file-drop-dialog.spec.ts): the
 * whole ZModal takes dropped files, with ZFileDropOverlay contained in it, over a page that has its own window-level
 * overlay. The field lists the files already sent (an edit) and the ones being added in one ZFileList, the stored ones
 * removed through a server call the page answers by hand (so the test sees the spinner), and a UFileUpload under it
 * to browse. Dropped and browsed files go through one rule, sortDroppedFiles with ACCEPT, and what it refuses is a toast.
 */
const ACCEPT = 'application/pdf,.csv,image/*'
const toast = useToast()

const pageDropped = ref<string[]>([])
const open = ref(false)
const dialog = useTemplateRef<HTMLElement>('dialog')

const stored = ref<FileListItem[]>([
  { id: 'f-1', name: 'engagement-letter.pdf', size: 245_000, type: 'application/pdf' },
  { id: 'f-2', name: '2025-return.pdf', size: 1_830_000, type: 'application/pdf' },
])
const added = ref<File[]>([])
const files = computed<FileListItem[]>(() => [...stored.value, ...added.value])

function report(rejected: RejectedFile[]) {
  toast.add({ title: 'Not attached', description: `${rejected.map((r) => r.file.name).join(', ')}: only PDFs, CSVs and images.`, color: 'error' })
}
/** Every file in, dropped or browsed, through the one rule. */
function add(incoming: File[]) {
  const { accepted, rejected } = sortDroppedFiles(incoming, { accept: ACCEPT, multiple: true })
  added.value = [...added.value, ...accepted]
  if (rejected.length) report(rejected)
}

// The server's answer to a delete, given by hand: the row's spinner stays until a button here answers.
const pending = shallowRef<{ name: string; ok: () => void; fail: () => void } | null>(null)
function deleteStored(item: FileListItem) {
  return new Promise<void>((resolve, reject) => {
    pending.value = {
      name: item.name,
      ok: () => { stored.value = stored.value.filter((s) => s !== item); pending.value = null; resolve() },
      fail: () => { pending.value = null; reject(new Error('The server refused')) },
    }
  })
}
function remove(item: FileListItem) {
  if (item instanceof File) added.value = added.value.filter((f) => f !== item)
  else return deleteStored(item)
}
</script>

<template>
  <main class="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
    <header class="flex flex-col gap-2">
      <h1 class="text-xl font-semibold text-highlighted">ZFileDropOverlay in a dialog, with ZFileList</h1>
      <p class="text-sm text-muted">
        A transfer dialog's Files field. The whole dialog takes dropped files, with its own overlay drawn inside it, and
        the page behind has a window-level overlay of its own. While the dialog is open the page takes no drops at all, not even
        on the backdrop; once it closes, the page's overlay works again. The field lists the
        files the transfer already holds (from the server) and the ones being added, with the drop zone under it to
        browse. Dropped and browsed files go through the same rule (PDFs, CSVs and images); a refused one is a toast.
        <strong>Dropped on the page</strong> shows what the page's own overlay took.
      </p>
    </header>

    <section class="flex flex-col gap-3">
      <h2 class="text-base font-semibold text-highlighted">The page</h2>
      <p data-zone="page" class="text-sm text-muted">Try this: drag a file over the page with the dialog closed; the page's overlay takes it. Open the dialog and drag over the backdrop: nothing shows, and the file doesn't open in the tab.</p>
      <p class="text-sm">Dropped on the page: <span data-testid="page-dropped">{{ pageDropped.join(', ') || 'none' }}</span></p>
      <ZFileDropOverlay label="Drop on the page" @drop="(f) => (pageDropped = f.map((x) => x.name))" />
    </section>

    <section class="flex flex-col items-start gap-3">
      <h2 class="text-base font-semibold text-highlighted">The dialog</h2>
      <p class="text-sm text-muted">Try this: open the dialog and drop files anywhere on it; they join the list, and a Word file is refused. Close it and drag over the page again: the page's overlay is back.</p>
    <ZModal v-model:open="open" title="Edit transfer" description="Send files to a client">
      <UButton label="Open the dialog: Edit transfer" data-open-dialog />
      <template #content="{ close }">
        <div ref="dialog" data-zone="dialog" class="flex flex-col gap-4 rounded-[inherit] p-6">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold text-highlighted">Edit transfer</h3>
            <UButton icon="i-lucide-x" variant="ghost" color="neutral" aria-label="Close" data-close-dialog @click="close" />
          </div>
          <UFormField label="Files">
            <div class="flex flex-col gap-2" data-zone="field">
              <ZFileList :items="files" :remove="remove" @remove-error="(_, item) => toast.add({ title: `Couldn't remove ${item.name}`, color: 'error' })" />
              <!-- Its own drop zone stays on: a drop it takes reaches add() once, and the dialog's overlay leaves it be. -->
              <div data-zone="upload">
                <UFileUpload
                  :model-value="null"
                  multiple
                  :accept="ACCEPT"
                  :preview="false"
                  label="Drop files or browse"
                  description="PDFs, CSVs and images"
                  class="min-h-28 w-full"
                  @update:model-value="(f) => f && add(f)"
                />
              </div>
            </div>
          </UFormField>
          <!-- The demo's stand-in for the server: removing a stored file waits for an answer here. -->
          <div v-if="pending" class="flex items-center gap-2 text-sm" data-server>
            <span>Server, deleting {{ pending.name }}: answer</span>
            <UButton size="xs" label="Deleted" data-server-ok @click="pending.ok()" />
            <UButton size="xs" color="error" variant="outline" label="Refuse" data-server-fail @click="pending.fail()" />
          </div>
          <ZFileDropOverlay
            :target="dialog"
            :accept="ACCEPT"
            multiple
            label="Drop files to attach them"
            description="PDFs, CSVs and images"
            @drop="add"
            @rejected="report"
          />
        </div>
      </template>
    </ZModal>
    </section>
  </main>
</template>
