<script setup lang="ts">
// The files a form holds, one row each: a file-type icon, the name, the size in the locale's words, and Remove. A row
// is a `File` just picked or dropped, or a file already on the server (`{ id, name, size, type }`), in the order given,
// so an edit form lists what was sent before and what is being added in one list. Nuxt UI's UFileUpload lists only the
// `File`s it holds itself; this lists whatever the form has. Written on Nuxt UI's tokens.
//
//   <ZFileList :items="[...saved, ...added]" :remove="(item) => (item instanceof File ? drop(item) : api.delete(item.id))" />
//
// `remove` may return a promise (a server delete): the row shows a spinner and its button is disabled until it
// settles. A rejected one leaves the row as it was and is handed to @remove-error, for the product's toast.
import { useLocale } from '@nuxt/ui/composables'
import { formatFileSize, type FileListItem } from '../utils/file-drop'

const props = withDefaults(
  defineProps<{
    /** The rows, in order: `File`s and files already stored (`{ id, name, size, type? }`). */
    items: readonly FileListItem[]
    /** Removes one row; may return a promise, shown as the row's spinner. Without it, no Remove buttons. */
    remove?: (item: FileListItem, index: number) => unknown
    /** The sizes' locale (BCP 47). Unset: Nuxt UI's locale. */
    locale?: string
    /** The Remove button's word; its accessible name is this and the file's name: "Remove invoice.pdf". */
    removeLabel?: string
  }>(),
  { remove: undefined, locale: undefined, removeLabel: 'Remove' },
)
const emit = defineEmits<{
  /** A `remove` promise rejected: the row stays. */
  removeError: [error: unknown, item: FileListItem]
}>()

const { locale: uiLocale } = useLocale()
const lang = computed(() => props.locale ?? uiLocale.value.code)

// `File` isn't one of the globals a template can see, so the test is made here.
const isStored = (item: FileListItem) => !(item instanceof File)

// A stored file is keyed by its id; a File, which has none, by identity.
const fileKeys = new WeakMap<File, string>()
let counter = 0
function keyOf(item: FileListItem) {
  if (!(item instanceof File)) return `id:${item.id}`
  let k = fileKeys.get(item)
  if (!k) fileKeys.set(item, (k = `file:${++counter}`))
  return k
}

/** The icon for a type, by its MIME type or, without one, its extension. */
function iconOf(item: FileListItem) {
  const type = (item.type ?? '').toLowerCase()
  const ext = item.name.toLowerCase().split('.').pop() ?? ''
  if (type.startsWith('image/') || /^(png|jpe?g|gif|webp|heic|svg|bmp|tiff?)$/.test(ext)) return 'i-lucide-file-image'
  if (type.startsWith('video/') || /^(mp4|mov|webm|avi|mkv)$/.test(ext)) return 'i-lucide-file-video'
  if (type.startsWith('audio/') || /^(mp3|wav|m4a|flac|ogg)$/.test(ext)) return 'i-lucide-file-audio'
  if (/spreadsheet|excel|csv/.test(type) || /^(xlsx?|csv|ods|numbers)$/.test(ext)) return 'i-lucide-file-spreadsheet'
  if (/zip|compressed|tar|gzip|7z|rar/.test(type) || /^(zip|tar|gz|tgz|7z|rar)$/.test(ext)) return 'i-lucide-file-archive'
  if (type === 'application/pdf' || type.startsWith('text/') || /word|document|rtf/.test(type) || /^(pdf|txt|md|docx?|rtf|odt|pages)$/.test(ext)) return 'i-lucide-file-text'
  return 'i-lucide-file'
}

const removing = ref(new Set<string>())
async function onRemove(item: FileListItem, index: number) {
  if (!props.remove) return
  const key = keyOf(item)
  if (removing.value.has(key)) return
  removing.value = new Set(removing.value).add(key)
  try {
    await props.remove(item, index)
  } catch (error) {
    emit('removeError', error, item)
  } finally {
    const next = new Set(removing.value)
    next.delete(key)
    removing.value = next
  }
}
</script>

<template>
  <ul v-if="items.length" class="flex flex-col gap-1" data-file-list>
    <li
      v-for="(item, index) in items"
      :key="keyOf(item)"
      :aria-busy="removing.has(keyOf(item)) || undefined"
      class="flex items-center gap-2 rounded-md bg-elevated px-3 py-2"
      :data-file-row="item.name"
      :data-stored="isStored(item) ? '' : undefined"
    >
      <UIcon :name="iconOf(item)" class="size-4 shrink-0 text-dimmed" aria-hidden="true" />
      <span class="min-w-0 flex-1 truncate text-sm text-default">{{ item.name }}</span>
      <span class="shrink-0 text-xs text-muted tabular-nums">{{ formatFileSize(item.size, lang) }}</span>
      <UButton
        v-if="remove"
        type="button"
        size="xs"
        variant="ghost"
        color="neutral"
        icon="i-lucide-x"
        :loading="removing.has(keyOf(item))"
        :aria-label="`${removeLabel} ${item.name}`"
        @click="onRemove(item, index)"
      />
    </li>
  </ul>
</template>
