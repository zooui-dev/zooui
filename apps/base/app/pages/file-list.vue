<script setup lang="ts">
/**
 * ZFileList's options (tests/file-list.spec.ts): thumbnails (`preview`), binary or decimal sizes (`binary`), and the
 * #leading and #trailing row slots, here a checkbox and a badge. The rows are a stored file with a thumbnail URL, a
 * stored PDF, and Files made on the client: a photo and a PDF, with a button to add another photo. Removing a stored
 * row waits for the server's answer, given by hand, so the slots' `removing` can be seen.
 */
// A 2x2 PNG, as a stored file's thumbnail URL and as the bytes of the photos added here.
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGPgW/oSiBggFAApsgZx/T7YngAAAABJRU5ErkJggg=='
const THUMB = `data:image/png;base64,${PNG}`
const pngBytes = () => Uint8Array.from(atob(PNG), (c) => c.charCodeAt(0))

const mounted = ref(true)
const preview = ref(false)
const binary = ref(true)
const items = ref<FileListItem[]>([
  { id: 's-1', name: 'site-photo.png', size: 245_000, type: 'image/png', thumbnail: THUMB },
  { id: 's-2', name: '2025-plan.pdf', size: 1_830_000, type: 'application/pdf' },
])
let photos = 0
function addPhoto() {
  photos += 1
  items.value = [...items.value, new File([pngBytes()], `photo-${photos}.png`, { type: 'image/png' })]
}
// The Files are made on the client: a File can't cross from the server's render.
onMounted(() => {
  addPhoto()
  items.value = [...items.value, new File(['%PDF'], 'agenda.pdf', { type: 'application/pdf' })]
})

/** `File` isn't one of the globals a template can see. */
const isNew = (item: FileListItem) => item instanceof File

const included = ref(new Set<string>(['site-photo.png']))
function include(name: string, on: boolean | 'indeterminate') {
  const next = new Set(included.value)
  if (on === true) next.add(name)
  else next.delete(name)
  included.value = next
}

// The server's answer to a stored file's delete, given by hand.
const pending = shallowRef<{ name: string; ok: () => void; fail: () => void } | null>(null)
function remove(item: FileListItem) {
  if (item instanceof File) {
    items.value = items.value.filter((i) => i !== item)
    return
  }
  return new Promise<void>((resolve, reject) => {
    pending.value = {
      name: item.name,
      ok: () => { items.value = items.value.filter((i) => i !== item); pending.value = null; resolve() },
      fail: () => { pending.value = null; reject(new Error('The server refused')) },
    }
  })
}
</script>

<template>
  <main class="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
    <header class="flex flex-col gap-2">
      <h1 class="text-xl font-semibold text-highlighted">ZFileList: thumbnails, sizes and row slots</h1>
      <p class="text-sm text-muted">
        The list holds two stored files (from the server: a photo with a thumbnail URL and a PDF) and two files added in
        the browser (a photo and a PDF). The switches turn on <code>preview</code> (thumbnails in place of the icons) and
        <code>binary</code> (sizes in 1024s, as <code>239.3 KB</code>; off, decimal, as <code>245 kB</code>). Each row
        has a checkbox in its <code>#leading</code> slot and a Stored or New badge in its <code>#trailing</code> slot.
        <strong>Included</strong> lists the checked rows.
      </p>
    </header>

    <section class="flex flex-col gap-3">
      <h2 class="text-base font-semibold text-highlighted">Options</h2>
      <p class="text-sm text-muted">Try this: turn Thumbnails on; the photos show their pictures and the PDFs keep their icons. Turn Binary sizes off; the sizes change units.</p>
      <div class="flex flex-wrap gap-4 text-sm">
        <USwitch v-model="preview" label="Thumbnails (preview)" data-toggle="preview" />
        <USwitch v-model="binary" label="Binary sizes (binary)" data-toggle="binary" />
        <USwitch v-model="mounted" label="Mounted" data-toggle="mounted" />
        <UButton size="xs" variant="outline" label="Add a photo" data-add-photo @click="addPhoto" />
      </div>
    </section>

    <section class="flex max-w-lg flex-col gap-3">
      <h2 class="text-base font-semibold text-highlighted">The list</h2>
      <p class="text-sm text-muted">Try this: remove a stored file; its checkbox is disabled until you answer for the server below the list. Remove a photo you added; its thumbnail's object URL is released.</p>
      <ZFileList v-if="mounted" :items="items" :remove="remove" :preview="preview" :binary="binary">
        <template #leading="{ item, removing }">
          <UCheckbox
            :model-value="included.has(item.name)"
            :disabled="removing"
            :aria-label="`Include ${item.name}`"
            data-include
            @update:model-value="(on) => include(item.name, on)"
          />
        </template>
        <template #trailing="{ item, index }">
          <UBadge size="sm" variant="subtle" :color="isNew(item) ? 'primary' : 'neutral'" :label="isNew(item) ? 'New' : 'Stored'" :data-badge="index" />
        </template>
      </ZFileList>
      <div v-if="pending" class="flex items-center gap-2 text-sm" data-server>
        <span>Server, deleting {{ pending.name }}: answer</span>
        <UButton size="xs" label="Deleted" data-server-ok @click="pending.ok()" />
        <UButton size="xs" color="error" variant="outline" label="Refuse" data-server-fail @click="pending.fail()" />
      </div>
      <p class="text-sm">Included: <span data-testid="included">{{ [...included].join(', ') || 'none' }}</span></p>
    </section>
  </main>
</template>
